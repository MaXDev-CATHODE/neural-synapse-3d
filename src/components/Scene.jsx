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

        // Update Connections
        if (connectionsRef.current) {
             const colors = connectionsRef.current.geometry.attributes.color;
             if (colors) {
                let colorIdx = 0;
                network.connections.forEach(conn => {
                     const c = new THREE.Color().setHex(0x1f2430).lerp(new THREE.Color(0x5ccfe6), conn.active);
                     colors.setXYZ(colorIdx++, c.r, c.g, c.b);
                     colors.setXYZ(colorIdx++, c.r, c.g, c.b);
                });
                colors.needsUpdate = true;
             }
        }
    });

    // Build Line Geometry
    const lineGeometry = useMemo(() => {
        const points = [];
        const colors = [];
        network.connections.forEach(conn => {
            const n1 = network.neurons[conn.from];
            const n2 = network.neurons[conn.to];
            points.push(n1.position.x, n1.position.y, n1.position.z);
            points.push(n2.position.x, n2.position.y, n2.position.z);
            colors.push(0.1, 0.1, 0.2);
            colors.push(0.1, 0.1, 0.2);
        });
        
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        return geo;
    }, [network]);

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
