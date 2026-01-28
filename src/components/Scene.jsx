import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Sphere, Line } from '@react-three/drei';
import { NeuralNetwork } from '../simulation/NeuralNetwork';

const Scene = ({ networkRef }) => {
    const meshRef = useRef();
    const connectionsRef = useRef();
    const nodeCount = 200;
    
    // Shader material for connections (Glowing Pulse)
    const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({
        color: 0x5ccfe6,
        transparent: true,
        opacity: 0.1,
        vertexColors: true
    }), []);

    // Create stable network instance if not provided
    useEffect(() => {
        if (!networkRef.current) {
            networkRef.current = new NeuralNetwork(nodeCount, 3.5);
        }
    }, []);

    // Initial Positions for InstancedMesh
    useEffect(() => {
        if (!meshRef.current || !networkRef.current) return;
        
        const dummy = new THREE.Object3D();
        networkRef.current.neurons.forEach((neuron, i) => {
            dummy.position.set(neuron.position.x, neuron.position.y, neuron.position.z);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, []);

    // Animation Loop
    useFrame((state, delta) => {
        if (!meshRef.current || !connectionsRef.current || !networkRef.current) return;

        const network = networkRef.current;
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

            // Color logic: Base + Potential
            if (neuron.type === 'INHIBITORY') {
                 color.setHSL(0.9, 0.8, 0.1 + neuron.potential * 0.8); // Red flip
            } else {
                 color.setHSL(0.5, 0.8, 0.1 + neuron.potential * 0.8); // Blue pulse
            }
            meshRef.current.setColorAt(i, color);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        meshRef.current.instanceColor.needsUpdate = true;

        // Update Connections (Geometry update is expensive, maybe optimize later if lagging)
        // Here we just update opacity/colors based on active pulses in a simpler way if possible
        // For strictly correct visualization we'd need to update line colors.
        // Optimization: Updates line colors only
        if (connectionsRef.current) {
             const colors = connectionsRef.current.geometry.attributes.color;
             if (colors) {
                let colorIdx = 0;
                network.connections.forEach(conn => {
                     // Start Color
                     const c1 = new THREE.Color().setHex(0x1f2430).lerp(new THREE.Color(0x5ccfe6), conn.active);
                     // End Color
                     const c2 = new THREE.Color().setHex(0x1f2430).lerp(new THREE.Color(0x5ccfe6), conn.active);
                     
                     colors.setXYZ(colorIdx++, c1.r, c1.g, c1.b);
                     colors.setXYZ(colorIdx++, c2.r, c2.g, c2.b);
                });
                colors.needsUpdate = true;
             }
        }
    });

    // Build Line Geometry once
    const lineGeometry = useMemo(() => {
        if (!networkRef.current) return null;
        const points = [];
        const colors = [];
        networkRef.current.connections.forEach(conn => {
            const n1 = networkRef.current.neurons[conn.from];
            const n2 = networkRef.current.neurons[conn.to];
            points.push(n1.position.x, n1.position.y, n1.position.z);
            points.push(n2.position.x, n2.position.y, n2.position.z);
            colors.push(0.1, 0.1, 0.2); // r,g,b
            colors.push(0.1, 0.1, 0.2);
        });
        
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        return geo;
    }, []);

    if (!lineGeometry) return null;

    return (
        <group rotation={[0, 0, 0]}>
            <instancedMesh ref={meshRef} args={[null, null, nodeCount]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshStandardMaterial 
                    toneMapped={false}
                    roughness={0.4}
                    metalness={0.8}
                />
            </instancedMesh>

            <lineSegments ref={connectionsRef} geometry={lineGeometry} material={lineMaterial} />
        </group>
    );
};

export default Scene;
