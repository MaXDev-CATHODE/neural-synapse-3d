import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LineSegments } from 'three';
import { NeuralNetwork } from '../simulation/NeuralNetwork';

const Scene = ({ networkRef }) => {
    const meshRef = useRef();
    const connectionsRef = useRef();
    const nodeCount = 200;

    // Use useMemo to initialize the network once
    const network = useMemo(() => {
        const net = new NeuralNetwork(nodeCount, 3.5);
        if (networkRef) networkRef.current = net;
        return net;
    }, [nodeCount, networkRef]);
    
    // Shader material for connections (Glowing Pulse)
    const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({
        color: 0x5ccfe6,
        transparent: true,
        opacity: 0.1,
        vertexColors: true
    }), []);

    // Initial Positions for InstancedMesh
    useEffect(() => {
        if (!meshRef.current || !network) return;
        
        const dummy = new THREE.Object3D();
        network.neurons.forEach((neuron, i) => {
            dummy.position.set(neuron.position.x, neuron.position.y, neuron.position.z);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [network]);

    // Animation Loop
    useFrame((state, delta) => {
        if (!meshRef.current || !connectionsRef.current || !network) return;

        // Mouse Interaction
        const { raycaster, mouse, camera } = state;
        raycaster.setFromCamera(mouse, camera);
        
        // Handle Hover Stimulation
        const intersects = raycaster.intersectObject(meshRef.current);
        if (intersects.length > 0) {
            const instanceId = intersects[0].instanceId;
            const neuron = network.neurons[instanceId];
            if (neuron) {
                network.stimulateNear(neuron.position.x, neuron.position.y, neuron.position.z, 2.5);
            }
        }

        const firingIds = network.step(Math.min(delta, 0.1)); // Update logic
        const time = state.clock.getElapsedTime();

        // Update Neuron Visuals (Color flash on firing)
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();

        for (let i = 0; i < network.neuronCount; i++) {
            const neuron = network.neurons[i];
            
            // Re-calculate position with float (visual only)
            dummy.position.set(
                neuron.position.x + Math.sin(time * 0.2 + i) * 0.1,
                neuron.position.y + Math.cos(time * 0.3 + i) * 0.1,
                neuron.position.z + Math.sin(time * 0.1 + i) * 0.1
            );
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);

            // Color logic: Base (dim) + Potential (glow)
            if (neuron.type === 'INHIBITORY') {
                 // Reddish for inhibitory
                 color.setHSL(0.95, 0.7, 0.2 + neuron.potential * 0.6); 
            } else {
                 // Cyan/Blue for excitatory
                 color.setHSL(0.55, 0.8, 0.2 + neuron.potential * 0.7); 
            }
            meshRef.current.setColorAt(i, color);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        meshRef.current.instanceColor.needsUpdate = true;

        // Update Connections
        if (connectionsRef.current) {
             const colors = connectionsRef.current.geometry.attributes.color;
             if (colors) {
                let colorIdx = 0;
                network.connections.forEach(conn => {
                     const intensity = 0.15 + conn.active * 0.8;
                     const targetColor = new THREE.Color(0x5ccfe6);
                     const c = new THREE.Color(0x101520).lerp(targetColor, intensity);
                     colors.setXYZ(colorIdx++, c.r, c.g, c.b);
                     colors.setXYZ(colorIdx++, c.r, c.g, c.b);
                });
                colors.needsUpdate = true;
             }
        }
    });

    const handleClick = (e) => {
        if (!network || !meshRef.current) return;
        if (e.intersections.length > 0) {
            const p = e.intersections[0].point;
            network.collapseAt(p.x, p.y, p.z, 8, 4.0);
        }
    };

    // Build Line Geometry
    const lineGeometry = useMemo(() => {
        const points = [];
        const colors = [];
        network.connections.forEach(conn => {
            const n1 = network.neurons[conn.from];
            const n2 = network.neurons[conn.to];
            points.push(n1.position.x, n1.position.y, n1.position.z);
            points.push(n2.position.x, n2.position.y, n2.position.z);
            // Default dark blue for connections
            colors.push(0.05, 0.1, 0.15);
            colors.push(0.05, 0.1, 0.15);
        });
        
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        return geo;
    }, [network]);

    return (
        <group rotation={[0, 0, 0]}>
            <instancedMesh 
                ref={meshRef} 
                args={[null, null, nodeCount]}
                onClick={handleClick}
            >
                <sphereGeometry args={[0.22, 16, 16]} />
                <meshStandardMaterial 
                    toneMapped={false}
                    emissiveIntensity={2}
                    roughness={0.1}
                    metalness={0.5}
                />
            </instancedMesh>

            <lineSegments ref={connectionsRef} geometry={lineGeometry} material={lineMaterial} />
        </group>
    );
};

export default Scene;
