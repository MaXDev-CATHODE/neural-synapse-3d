import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { CognitiveNetwork } from '../simulation/CognitiveNetwork';

const Scene = ({ networkRef, nodeCount = 1200, timeScale = 1.0, fireMode = 'SEQUENCE' }) => {
    const { camera } = useThree(); // Access camera for direct manipulation inside handlers

    const groupRef = useRef();
    const signalsRef = useRef();
    const connectionsRef = useRef();
    const neuronsRef = useRef();
    
    // MOUSE & KEYBOARD STATE
    const isDrawing = useRef(false);
    const isRotating = useRef(false);
    const keys = useRef({});
    const mousePos = useRef({ x: 0, y: 0 });
    // INITIAL PERSPECTIVE (Adjusted v3: Extreme Left, Side Profile)
    const rotationRef = useRef({ x: -0.1, y: -1.2 }); 
    // ZOOM: Direct control, no inertia ref needed

    const network = useMemo(() => {
        return new CognitiveNetwork();
    }, []);

    const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);
    const signalGeo = useMemo(() => new THREE.SphereGeometry(0.25, 8, 8), []);
    
    // MATERIALS
    const matSensory = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffaa00 }), []);
    const matAssociation = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x0088ff }), []);
    const matConcept = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xff00ff }), []);
    const matSequence = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x00ffff }), []); 
    const matInhibitory = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xff0000 }), []); 
    const matSignal = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffffff }), []);

    const connectionGeo = useMemo(() => {
        const points = [];
        network.connections.forEach(conn => {
            const n1 = network.neurons[conn.from];
            const n2 = network.neurons[conn.to];
            if (n1 && n2) {
                points.push(n1.position.x, n1.position.y, n1.position.z);
                points.push(n2.position.x, n2.position.y, n2.position.z);
            }
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        const colors = new Float32Array(network.connections.length * 2 * 3);
        // Init with base color
        for(let i=0; i<colors.length; i+=3) {
            colors[i] = 0.0; colors[i+1] = 0.2; colors[i+2] = 0.5;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        return geo;
    }, [network]);

    // INTERACTION LOGIC
    // Increased threshold to ensure hits on the grid
    const getClosestRetinaNeuron = (point, threshold = 30.0) => {
        let closest = null;
        let minDist = Infinity;
        // Retina neurons are 0-199
        for(let id=0; id<200; id++) {
            const n = network.neurons[id];
            if (!n) continue;
            const dx = n.position.x - point.x;
            const dy = n.position.y - point.y;
            const dz = n.position.z - point.z;
            const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (d < minDist) { minDist = d; closest = n; }
        }
        return minDist < threshold ? closest : null;
    };

    const handlePointerDown = (e) => {
        if (e.button === 0) { // LPM
            isDrawing.current = true;
            e.stopPropagation();
            const neuron = getClosestRetinaNeuron(e.point, 30.0);
            if (neuron) network.addToInputTrace(neuron.id, fireMode === 'RAPID');
        }
    };

    const handlePointerMove = (e) => {
        if (isDrawing.current) {
            const neuron = getClosestRetinaNeuron(e.point, 30.0);
            if (neuron) network.addToInputTrace(neuron.id, fireMode === 'RAPID');
        }
    };

    useEffect(() => {
        const handleGlobalDown = (e) => {
            if (e.button === 2) { // PPM
                isRotating.current = true;
                mousePos.current = { x: e.clientX, y: e.clientY };
                e.preventDefault();
            }
        };

        const handleGlobalUp = (e) => {
            if (e.button === 0) isDrawing.current = false;
            if (e.button === 2) isRotating.current = false;
            if (e.button === 0 && fireMode !== 'RAPID') network.fireInputTrace();
        };

        const handleKeyDown = (e) => { keys.current[e.code] = true; };
        const handleKeyUp = (e) => { keys.current[e.code] = false; };

        const handleMouseMove = (e) => {
            if (isRotating.current) {
                const dx = e.clientX - mousePos.current.x;
                const dy = e.clientY - mousePos.current.y;
                mousePos.current = { x: e.clientX, y: e.clientY };
                
                // Rotacja w miejscu (First Person Look)
                rotationRef.current.y -= dx * 0.003;
                rotationRef.current.x -= dy * 0.003;
                rotationRef.current.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, rotationRef.current.x));
            }
        };

        // ZOOM (Wheel - Dolly)
        // ZOOM (Wheel - Direct Control, No Inertia)
        const handleWheel = (e) => {
            e.preventDefault();
            const zoomSpeed = 0.5; // Direct movement per notch
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            
            // Scroll UP (Neg) -> Move Forward (Zoom In)
            // Scroll DOWN (Pos) -> Move Backward (Zoom Out)
            const direction = -Math.sign(e.deltaY); 
            
            if (direction !== 0) {
                 camera.position.addScaledVector(forward, direction * zoomSpeed * 20.0);
            }
        };

        window.addEventListener('mousedown', handleGlobalDown);
        window.addEventListener('mouseup', handleGlobalUp);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('contextmenu', e => e.preventDefault());

        return () => {
            window.removeEventListener('mousedown', handleGlobalDown);
            window.removeEventListener('mouseup', handleGlobalUp);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('wheel', handleWheel);
        };
    }, [network, fireMode, camera]);
        
    useFrame((state, delta) => {
        const time = state.clock.getElapsedTime();
        // APPLY TIME SCALING TO PHYSICS (for Network)
        const dt = Math.min(delta, 0.1) * timeScale;
        network.step(dt, time);

        // --- FPP CAMERA CONTROLS ---
        const camera = state.camera;

        // Apply Mouse Look
        camera.rotation.order = 'YXZ'; // Important for FPS look
        camera.rotation.x = rotationRef.current.x;
        camera.rotation.y = rotationRef.current.y;

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0);

        const moveDir = new THREE.Vector3(0, 0, 0);
        
        // MOVEMENT SPEED (Realtime, not simulation time)
        // Shift = Sprint (3x speed)
        const realDt = Math.min(delta, 0.1); 
        const baseSpeed = 40.0;
        const speedMultiplier = keys.current['ShiftLeft'] ? 3.0 : 1.0;
        const moveSpeed = baseSpeed * speedMultiplier * realDt;

        if (keys.current['KeyW']) moveDir.add(forward);
        if (keys.current['KeyS']) moveDir.sub(forward);
        if (keys.current['KeyA']) moveDir.sub(right);
        if (keys.current['KeyD']) moveDir.add(right);
        if (keys.current['Space']) moveDir.add(up);
        if (keys.current['KeyQ'] || keys.current['ControlLeft']) moveDir.sub(up);

        // WHEEL ZOOM (Direct Control in handleWheel)
        // No inertia logic here anymore

        if (moveDir.lengthSq() > 0) {
            camera.position.addScaledVector(moveDir.normalize(), moveSpeed * (moveDir.length() > 1 ? moveDir.length() : 1));
        }
    });

    // 1. NEURONS RENDER
    useFrame(() => { 
        if (neuronsRef.current) {
            neuronsRef.current.children.forEach((child, i) => {
                const n = network.neurons[i];
                if (!n) { child.scale.setScalar(0); return; }

                child.position.set(n.position.x, n.position.y, n.position.z);
                
                // VISUAL SIZING
                const baseSize = 0.15;
                const growth = Math.min(0.2, (n.cumulativeInput || 0) * 0.05);
                child.scale.setScalar(baseSize + growth);

                let baseColor;
                if (n.inSequence) baseColor = matSequence.color;
                else if (n.type === 'INHIBITORY') baseColor = matInhibitory.color;
                else if (n.type === 'SENSORY') baseColor = matSensory.color;
                else if (n.type === 'MOTOR') baseColor = new THREE.Color(0x00ff00);
                else if (n.type === 'CONCEPT') baseColor = matConcept.color;
                else if (n.type === 'FEATURE_EDGE') baseColor = new THREE.Color(0x00ffff);
                else if (n.type === 'FEATURE_ANGLE') baseColor = new THREE.Color(0xff00ff);
                else if (n.type === 'MEMORY') baseColor = new THREE.Color(0x4488ff);
                else baseColor = matAssociation.color;

                const c = new THREE.Color(baseColor);
                const stressFactor = Math.min(1.0, (n.stress || 0) * 2.0);
                if (stressFactor > 0.3) c.lerp(new THREE.Color(0xff0000), stressFactor);
                c.lerp(new THREE.Color(0xffd700), n.memoryTrace || 0);

                if (n.potential > 0.3) child.material.color.setHex(0xffffff);
                else child.material.color.copy(c);
            });
        }

        // 2. SIGNALS RENDER
        if (signalsRef.current) {
            let idx = 0;
            const dummy = new THREE.Object3D();
            network.activeSignals.forEach(sig => {
                const n1 = network.neurons[sig.from];
                const n2 = network.neurons[sig.to];
                if (n1 && n2 && idx < 1000) {
                    dummy.position.lerpVectors(n1.position, n2.position, sig.progress);
                    dummy.scale.setScalar(1.0);
                    dummy.updateMatrix();
                    signalsRef.current.setMatrixAt(idx++, dummy.matrix);
                }
            });
            signalsRef.current.count = idx;
            signalsRef.current.instanceMatrix.needsUpdate = true;
        }

        // 3. CONNECTIONS RENDER (Neon Pathways)
        if (connectionsRef.current && connectionsRef.current.geometry.attributes.color) {
            const colors = connectionsRef.current.geometry.attributes.color;
            let idx = 0;
            network.connections.forEach(conn => {
                 // FILTERING
                 // Show structure faintly, highlight activity strongly
                 const isActive = conn.active > 0.05;
                 const isSignificant = Math.abs(conn.weight) > 0.3 || isActive || conn.stability > 0.2;

                if (idx < 5000) { // Increased limit for full visibility
                    let r = 0.0, g = 0.1, b = 0.2; // Dark Blue Background
                    let alpha = 0.02; // Ghostly structure

                    if (isSignificant) {
                        if (isActive) {
                            // NEON PATHWAY: Hot signal
                            const heat = Math.min(1.0, conn.active * 1.5);
                            r = THREE.MathUtils.lerp(0.0, 1.0, heat); // White/Hot
                            g = THREE.MathUtils.lerp(0.5, 1.0, heat); // Cyan tint
                            b = THREE.MathUtils.lerp(1.0, 1.0, heat); // Blue/White
                            alpha = Math.max(0.1, heat); // Visible trace
                        } else if (conn.stability > 0.3) {
                            // LEARNED PATH: Stable connection
                            r = 0.0; g = 0.4; b = 0.8;
                            alpha = 0.1;
                        } else if (conn.weight < 0) {
                             // Inhibitory
                             r = 0.2; g = 0.0; b = 0.0;
                             alpha = 0.02;
                        }
                    } else {
                        // Noise / Weak connections - barely visible
                        r = 0.05; g = 0.05; b = 0.1;
                    }

                    colors.setXYZ(idx * 2, r, g, b);
                    colors.setXYZ(idx * 2 + 1, r, g, b);
                    // We can't easily control per-vertex opacity with basic material vertexColors
                    // So we rely on color brightness to simulate it, OR if using transparent material,
                    // we accept uniform opacity and modulate color to black for 'invisible'.
                    // Since material is additive-like (transparent), black = invisible.
                    
                    // Modulate by alpha manually since vertex alpha is not supported in BasicMaterial usually
                    colors.setXYZ(idx * 2, r * alpha * 10.0, g * alpha * 10.0, b * alpha * 10.0);
                    colors.setXYZ(idx * 2 + 1, r * alpha * 10.0, g * alpha * 10.0, b * alpha * 10.0);
                    
                    idx++;
                }
            });
            colors.needsUpdate = true;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Position shifted EXTREME LEFT and ZOOMED OUT (Distance increased) */}
            <PerspectiveCamera makeDefault position={[-250, 70, 100]} far={5000} />

            {/* VISUAL GRID (Background) */}
            <group position={[-90, 0, 0]} rotation={[0, 0, Math.PI/2]}>
                <gridHelper args={[120, 20, 0x00ff00, 0x111111]} />
            </group>

            {/* INTERACTION LAYER (Foreground - Hit Target) */}
            {/* Flip Rotation to -PI/2 so normal points OUTWARD (-X). 
                With FrontSide, this BLOCKS interaction from the INSIDE (+X view). */}
            <mesh position={[-88, 0, 0]} rotation={[0, -Math.PI/2, 0]} 
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}>
                <planeGeometry args={[120, 120]} />
                <meshBasicMaterial transparent={true} opacity={0.05} color="#001100" side={THREE.FrontSide} />
            </mesh>

            <group ref={neuronsRef}>
                {Array.from({ length: nodeCount }).map((_, i) => (
                    <mesh key={i} geometry={sphereGeo}>
                        <meshBasicMaterial color="white" />
                    </mesh>
                ))}
            </group>

            <instancedMesh ref={signalsRef} args={[signalGeo, matSignal, 1000]} />
            
            <lineSegments ref={connectionsRef} geometry={connectionGeo} frustumCulled={false}>
                 <lineBasicMaterial vertexColors={true} opacity={0.3} transparent={true} />
            </lineSegments>
        </group>
    );
};

export default Scene;
