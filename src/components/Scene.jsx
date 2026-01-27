import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Sphere, Line } from '@react-three/drei';

const Scene = () => {
    const meshRef = useRef();
    const count = 200; // Number of neurons
    const connectionDistance = 3.5;

    // Generate random positions for neurons
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 20;
            const y = (Math.random() - 0.5) * 20;
            const z = (Math.random() - 0.5) * 20;
            temp.push(new THREE.Vector3(x, y, z));
        }
        return temp;
    }, [count]);

    // Calculate connections
    const connections = useMemo(() => {
        const lines = [];
        particles.forEach((p1, i) => {
            particles.forEach((p2, j) => {
                if (i !== j) {
                    const dist = p1.distanceTo(p2);
                    if (dist < connectionDistance) {
                        lines.push([p1, p2]);
                    }
                }
            });
        });
        return lines;
    }, [particles]);

    // Update neuron positions (subtle float)
    useFrame((state) => {
        if (!meshRef.current) return;
        
        let i = 0;
        const time = state.clock.getElapsedTime();
        const dummy = new THREE.Object3D();

        particles.forEach((particle, index) => {
            const { x, y, z } = particle;
            // Float logic
            dummy.position.set(
                x + Math.sin(time * 0.2 + index) * 0.2,
                y + Math.cos(time * 0.3 + index) * 0.2,
                z + Math.sin(time * 0.1 + index) * 0.2
            );
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(index, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <group rotation={[0, 0, 0]}>
            {/* Neurons as InstancedMesh for performance */}
            <instancedMesh ref={meshRef} args={[null, null, count]}>
                <sphereGeometry args={[0.15, 32, 32]} />
                <meshStandardMaterial 
                    color="#5ccfe6" 
                    emissive="#5ccfe6" 
                    emissiveIntensity={2} 
                    toneMapped={false}
                />
            </instancedMesh>

            {/* Connections */}
            <group>
                {connections.map((line, i) => (
                    <Line
                        key={i}
                        points={line}
                        color="#1f2430"
                        transparent
                        opacity={0.1}
                        lineWidth={1}
                    />
                ))}
            </group>
        </group>
    );
};

export default Scene;
