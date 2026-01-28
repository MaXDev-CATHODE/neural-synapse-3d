import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NeuralNetwork } from '../simulation/NeuralNetwork';

const Scene = ({ networkRef }) => {
    const meshRef = useRef();
    const connectionsRef = useRef();
    const nodeCount = 200;

    const network = useMemo(() => {
        const net = new NeuralNetwork(nodeCount, 3.5);
        if (networkRef) networkRef.current = net;
        return net;
    }, [nodeCount, networkRef]);
    
    const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({
        color: 0x5ccfe6,
        transparent: true,
        opacity: 0.4,
        vertexColors: true
    }), []);

    useEffect(() => {
        if (!meshRef.current || !network) return;
        
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        network.neurons.forEach((neuron, i) => {
            dummy.position.set(neuron.position.x, neuron.position.y, neuron.position.z);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
            
            // Initial solid color
            color.setHex(neuron.type === 'INHIBITORY' ? 0xff0055 : 0x00f3ff);
            meshRef.current.setColorAt(i, color);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
        meshRef.current.instanceColor.needsUpdate = true;
    }, [network]);

    useFrame((state, delta) => {
        if (!meshRef.current || !connectionsRef.current || !network) return;

        const { raycaster, mouse, camera, clock } = state;
        raycaster.setFromCamera(mouse, camera);
        
        const intersects = raycaster.intersectObject(meshRef.current);
        if (intersects.length > 0) {
            const instanceId = intersects[0].instanceId;
            const neuron = network.neurons[instanceId];
            if (neuron) {
                network.stimulateNear(neuron.position.x, neuron.position.y, neuron.position.z, 4.0);
            }
        }

        network.step(Math.min(delta, 0.1));
        const time = clock.getElapsedTime();

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();

        for (let i = 0; i < network.neuronCount; i++) {
            const neuron = network.neurons[i];
            
            dummy.position.set(
                neuron.position.x + Math.sin(time * 0.5 + i) * 0.05,
                neuron.position.y + Math.cos(time * 0.7 + i) * 0.05,
                neuron.position.z + Math.sin(time * 0.3 + i) * 0.05
            );
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);

            // COLOR LOGIC: Solid & Bright
            if (neuron.potential > 0.8) {
                color.setHex(0xffffff); // White flash
            } else if (neuron.type === 'INHIBITORY') {
                // Bright Magenta/Red
                const l = 0.3 + neuron.potential * 0.7;
                color.setHSL(0.95, 1.0, l);
            } else {
                // Bright Cyan
                const l = 0.4 + neuron.potential * 0.6;
                color.setHSL(0.5, 1.0, l);
            }
            meshRef.current.setColorAt(i, color);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        meshRef.current.instanceColor.needsUpdate = true;

        if (connectionsRef.current) {
             const colors = connectionsRef.current.geometry.attributes.color;
             if (colors) {
                let colorIdx = 0;
                network.connections.forEach(conn => {
                     const intensity = 0.2 + conn.active * 0.8;
                     const targetColor = new THREE.Color(0x00f3ff);
                     const c = new THREE.Color(0x101a25).lerp(targetColor, intensity);
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
            network.collapseAt(p.x, p.y, p.z, 12, 5.0);
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
            colors.push(0.2, 0.4, 0.5);
            colors.push(0.2, 0.4, 0.5);
        });
        
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        return geo;
    }, [network]);

    return (
        <group>
            <instancedMesh 
                ref={meshRef} 
                args={[null, null, nodeCount]}
                onClick={handleClick}
            >
                <sphereGeometry args={[0.4, 12, 12]} />
                <meshStandardMaterial 
                    toneMapped={false}
                    emissiveIntensity={1.5}
                    metalness={0.8}
                    roughness={0.2}
                />
            </instancedMesh>

            <lineSegments ref={connectionsRef} geometry={lineGeometry} material={lineMaterial} />
        </group>
    );
};

export default Scene;
