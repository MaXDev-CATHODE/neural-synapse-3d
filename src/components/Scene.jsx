import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NeuralNetwork } from '../simulation/NeuralNetwork';

const Scene = ({ networkRef }) => {
    const meshRef = useRef();
    const connectionsRef = useRef();
    const nodeCount = 200;

    // Use useMemo to initialize the network once safely
    const network = useMemo(() => {
        const net = new NeuralNetwork(nodeCount, 3.5);
        if (networkRef) networkRef.current = net;
        return net;
    }, [nodeCount, networkRef]);
    
    // Shader material for connections (Glowing Pulse)
    const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({
        color: 0xffffff, // White base to multiply with vertex colors
        transparent: true,
        opacity: 0.6,
        vertexColors: true,
        blending: THREE.AdditiveBlending
    }), []);

    // Initial Setup: Matrix and Colors
    useEffect(() => {
        if (!meshRef.current || !network) return;
        
        const dummy = new THREE.Object3D();
        const colorArray = new Float32Array(nodeCount * 3);
        const color = new THREE.Color();

        network.neurons.forEach((neuron, i) => {
            // Position
            dummy.position.set(neuron.position.x, neuron.position.y, neuron.position.z);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
            
            // Initial Colors (Bright Neon)
            color.setHex(neuron.type === 'INHIBITORY' ? 0xff00cc : 0x00ffff);
            color.toArray(colorArray, i * 3);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        
        // CRITICAL: Initialize instanceColor attribute for InstancedMesh
        const colorAttr = new THREE.InstancedBufferAttribute(colorArray, 3);
        meshRef.current.instanceColor = colorAttr;
        
        console.log("NEURAL_CORE: Instances initialized with colors.");
    }, [network, nodeCount]);

    // Animation Loop
    useFrame((state, delta) => {
        if (!meshRef.current || !connectionsRef.current || !network) return;

        const { raycaster, mouse, camera, clock } = state;
        raycaster.setFromCamera(mouse, camera);
        
        const intersects = raycaster.intersectObject(meshRef.current);
        if (intersects.length > 0) {
            const instanceId = intersects[0].instanceId;
            const neuron = network.neurons[instanceId];
            if (neuron) {
                network.stimulateNear(neuron.position.x, neuron.position.y, neuron.position.z, 3.0);
            }
        }

        network.step(Math.min(delta, 0.1));
        const time = clock.getElapsedTime();

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();

        for (let i = 0; i < network.neuronCount; i++) {
            const neuron = network.neurons[i];
            
            // Motion
            dummy.position.set(
                neuron.position.x + Math.sin(time * 0.4 + i) * 0.05,
                neuron.position.y + Math.cos(time * 0.5 + i) * 0.05,
                neuron.position.z + Math.sin(time * 0.3 + i) * 0.05
            );
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);

            // COLOR LOGIC: High Luminosity
            if (neuron.potential > 0.6) {
                color.setRGB(1.5, 1.5, 1.5); // Glow white
            } else if (neuron.type === 'INHIBITORY') {
                color.setHSL(0.9, 1.0, 0.5 + neuron.potential * 0.5); 
            } else {
                color.setHSL(0.5, 1.0, 0.5 + neuron.potential * 0.5); 
            }
            meshRef.current.setColorAt(i, color);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true;
        }

        // Update Connections
        if (connectionsRef.current) {
             const colorsAttr = connectionsRef.current.geometry.attributes.color;
             if (colorsAttr) {
                let colorIdx = 0;
                network.connections.forEach(conn => {
                     const intensity = 0.3 + conn.active * 0.7;
                     const targetColor = new THREE.Color(0x00ffff);
                     const c = new THREE.Color(0x112233).lerp(targetColor, intensity);
                     colorsAttr.setXYZ(colorIdx++, c.r, c.g, c.b);
                     colorsAttr.setXYZ(colorIdx++, c.r, c.g, c.b);
                });
                colorsAttr.needsUpdate = true;
             }
        }
    });

    const handleClick = (e) => {
        if (!network || !meshRef.current) return;
        if (e.intersections.length > 0) {
            const p = e.intersections[0].point;
            network.collapseAt(p.x, p.y, p.z, 10, 4.0);
        }
    };

    const lineGeometry = useMemo(() => {
        const points = [];
        const colors = [];
        network.connections.forEach(conn => {
            const n1 = network.neurons[conn.from];
            const n2 = network.neurons[conn.to];
            points.push(n1.position.x, n1.position.y, n1.position.z);
            points.push(n2.position.x, n2.position.y, n2.position.z);
            colors.push(0.1, 0.4, 0.6);
            colors.push(0.1, 0.4, 0.6);
        });
        
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        return geo;
    }, [network]);

    return (
        <group>
            {/* NEURONS: Guaranteed Visibility */}
            <instancedMesh 
                ref={meshRef} 
                args={[null, null, nodeCount]}
                onClick={handleClick}
            >
                <sphereGeometry args={[0.45, 16, 16]} />
                <meshBasicMaterial 
                    toneMapped={false}
                    vertexColors={true}
                    transparent={false} 
                    side={THREE.DoubleSide}
                />
            </instancedMesh>

            <lineSegments 
                ref={connectionsRef} 
                geometry={lineGeometry} 
                material={lineMaterial} 
            />
        </group>
    );
};

export default Scene;
