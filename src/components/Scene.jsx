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
        console.log("%c[NEURAL_SIM] Logic engine initialized. Node count: 200", "color: #5ccfe6; font-weight: bold;");
        return net;
    }, [nodeCount, networkRef]);
    
    const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({
        color: 0x5ccfe6,
        transparent: true,
        opacity: 0.8, // Much higher opacity
        vertexColors: true,
        blending: THREE.AdditiveBlending
    }), []);

    // Ensure instanceColor is allocated
    useEffect(() => {
        if (!meshRef.current || !network) return;
        
        const dummy = new THREE.Object3D();
        const colors = new Float32Array(nodeCount * 3);
        const color = new THREE.Color();

        network.neurons.forEach((neuron, i) => {
            // Position
            dummy.position.set(neuron.position.x, neuron.position.y, neuron.position.z);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
            
            // Color initialization
            color.setHex(neuron.type === 'INHIBITORY' ? 0xff0055 : 0x00f3ff);
            color.toArray(colors, i * 3);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        // In newer Three.js / R3F, we might need to set the attribute explicitly if it's not there
        meshRef.current.geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3));
        
        console.log("%c[NEURAL_SCENE] Instances allocated and colored.", "color: #a6e22e;");
    }, [network, nodeCount]);

    useFrame((state, delta) => {
        if (!meshRef.current || !connectionsRef.current || !network) return;

        const { raycaster, mouse, camera, clock } = state;
        raycaster.setFromCamera(mouse, camera);
        
        const intersects = raycaster.intersectObject(meshRef.current);
        if (intersects.length > 0) {
            const instanceId = intersects[0].instanceId;
            const neuron = network.neurons[instanceId];
            if (neuron) {
                network.stimulateNear(neuron.position.x, neuron.position.y, neuron.position.z, 5.0);
                if (Math.random() > 0.98) network.collapseAt(neuron.position.x, neuron.position.y, neuron.position.z, 6, 2.0);
            }
        }

        network.step(Math.min(delta, 0.1));
        const time = clock.getElapsedTime();

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();

        for (let i = 0; i < network.neuronCount; i++) {
            const neuron = network.neurons[i];
            
            dummy.position.set(
                neuron.position.x + Math.sin(time * 0.4 + i) * 0.08,
                neuron.position.y + Math.cos(time * 0.5 + i) * 0.08,
                neuron.position.z + Math.sin(time * 0.6 + i) * 0.08
            );
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);

            // "NUCLEAR" VISIBILITY LOGIC
            // Use very high lightness
            if (neuron.potential > 0.7) {
                color.setRGB(2, 2, 2); // Overbright White
            } else if (neuron.type === 'INHIBITORY') {
                color.setHSL(0.95, 1.0, 0.5 + neuron.potential * 0.5); 
            } else {
                color.setHSL(0.5, 1.0, 0.6 + neuron.potential * 0.4); 
            }
            meshRef.current.setColorAt(i, color);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

        if (connectionsRef.current) {
             const colorsAttr = connectionsRef.current.geometry.attributes.color;
             if (colorsAttr) {
                let colorIdx = 0;
                network.connections.forEach(conn => {
                     const intensity = 0.5 + conn.active * 0.5; // Very bright base
                     const targetColor = new THREE.Color(0x00f3ff);
                     const c = new THREE.Color(0x1a2a35).lerp(targetColor, intensity);
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
            network.collapseAt(p.x, p.y, p.z, 15, 8.0);
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
            colors.push(0.5, 0.8, 1.0); // Bright base
            colors.push(0.5, 0.8, 1.0);
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
                {/* BIGGER, OVERBRIGHT SPHERES */}
                <sphereGeometry args={[0.5, 8, 8]} />
                <meshBasicMaterial 
                    toneMapped={false} 
                    vertexColors={true}
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
