import React, { useRef, useMemo, useEffect, useLayoutEffect } from 'react';
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
        opacity: 0.8,
        vertexColors: true,
        blending: THREE.AdditiveBlending
    }), []);

    // CUSTOM SHADER for neurons to bypass any attribute/material issues
    const neuronMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            attribute vec3 instanceColor;
            varying vec3 vColor;
            void main() {
                vColor = instanceColor;
                // Instancing support
                vec4 localPosition = instanceMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * modelViewMatrix * localPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                // Guaranteed visible color
                gl_FragColor = vec4(vColor, 1.0);
            }
        `,
        transparent: false,
    }), []);

    useLayoutEffect(() => {
        if (!meshRef.current || !network) return;
        
        const dummy = new THREE.Object3D();
        const colors = new Float32Array(nodeCount * 3);
        const color = new THREE.Color();

        network.neurons.forEach((neuron, i) => {
            dummy.position.set(neuron.position.x, neuron.position.y, neuron.position.z);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
            
            // Bright neon colors
            color.setHex(neuron.type === 'INHIBITORY' ? 0xff0088 : 0x00ffff);
            color.toArray(colors, i * 3);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        
        // Manual attribute creation to be 100% sure
        const colorAttr = new THREE.InstancedBufferAttribute(colors, 3);
        meshRef.current.geometry.setAttribute('instanceColor', colorAttr);
        
        console.log("%c[NEURAL_SCENE] Nuclear Shader initialized. Neurons: 200", "color: #ff00ff; font-weight: bold;");
    }, [network, nodeCount]);

    useFrame((state, delta) => {
        if (!meshRef.current || !connectionsRef.current || !network) return;

        const { clock } = state;
        network.step(Math.min(delta, 0.1));
        const time = clock.getElapsedTime();

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        const colorsAttr = meshRef.current.geometry.attributes.instanceColor;

        for (let i = 0; i < network.neuronCount; i++) {
            const neuron = network.neurons[i];
            
            // Motion
            dummy.position.set(
                neuron.position.x + Math.sin(time * 0.5 + i) * 0.05,
                neuron.position.y + Math.cos(time * 0.6 + i) * 0.05,
                neuron.position.z + Math.sin(time * 0.7 + i) * 0.05
            );
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);

            // COLOR LOGIC: Super Bright
            if (neuron.potential > 0.5) {
                color.setRGB(1.0, 1.0, 1.0); // White flash
            } else if (neuron.type === 'INHIBITORY') {
                color.setHSL(0.9, 1.0, 0.5 + neuron.potential * 0.5); 
            } else {
                color.setHSL(0.5, 1.0, 0.5 + neuron.potential * 0.5); 
            }
            
            if (colorsAttr) {
                color.toArray(colorsAttr.array, i * 3);
            }
        }
        
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (colorsAttr) colorsAttr.needsUpdate = true;

        // Update Connections
        if (connectionsRef.current) {
             const cAttr = connectionsRef.current.geometry.attributes.color;
             if (cAttr) {
                let colorIdx = 0;
                network.connections.forEach(conn => {
                     const intensity = 0.5 + conn.active * 0.5;
                     const c = new THREE.Color(0x00ffff).multiplyScalar(intensity);
                     cAttr.setXYZ(colorIdx++, c.r, c.g, c.b);
                     cAttr.setXYZ(colorIdx++, c.r, c.g, c.b);
                });
                cAttr.needsUpdate = true;
             }
        }
    });

    const handleClick = (e) => {
        if (!network || !meshRef.current) return;
        if (e.intersections.length > 0) {
            const p = e.intersections[0].point;
            network.collapseAt(p.x, p.y, p.z, 15, 6.0);
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
            colors.push(0.5, 1.0, 1.0);
            colors.push(0.5, 1.0, 1.0);
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
                material={neuronMaterial}
            >
                <sphereGeometry args={[0.5, 12, 12]} />
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
