import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NeuralNetwork } from '../simulation/NeuralNetwork';

const Scene = ({ networkRef, nodeCount = 100 }) => {
    const groupRef = useRef();
    const connectionsRef = useRef();

    const network = useMemo(() => {
        const net = new NeuralNetwork(nodeCount, 3.5);
        if (networkRef) networkRef.current = net;
        return net;
    }, [nodeCount, networkRef]);

    // Debug logging
    console.log("Render Scene. Neurons:", network.neurons.length);

    useFrame((state, delta) => {
        if (!network || !groupRef.current) return;
        
        const time = state.clock.getElapsedTime();
        network.step(Math.min(delta, 0.1), time);

        // Update Neurons
        groupRef.current.children.forEach((child, i) => {
            const neuron = network.neurons[i];
            if (neuron) {
                // Pulse scale with safety check
                let s = 0.5 + (neuron.potential || 0) * 0.4;
                if (isNaN(s) || s < 0.1) s = 0.5;
                child.scale.setScalar(s);
                
                // Update uniforms if it's our custom shader
                if (child.material.uniforms) {
                    child.material.uniforms.time.value = time;
                    child.material.uniforms.potential.value = neuron.potential || 0;
                }
            }
        });

        // Update Connections
        if (connectionsRef.current) {
             const cAttr = connectionsRef.current.geometry.attributes.color;
             if (cAttr) {
                let colorIdx = 0;
                network.connections.forEach(conn => {
                     const intensity = 0.2 + conn.active * 0.8;
                     const c = new THREE.Color(neuronColors.inactive).lerp(new THREE.Color(neuronColors.active), conn.active);
                     cAttr.setXYZ(colorIdx++, c.r * intensity, c.g * intensity, c.b * intensity);
                     cAttr.setXYZ(colorIdx++, c.r * intensity, c.g * intensity, c.b * intensity);
                });
                cAttr.needsUpdate = true;
             }
        }
    });

    const neuronColors = {
        excitatory: '#00ffff',
        inhibitory: '#ff00ff',
        active: '#ffffff',
        inactive: '#004466'
    };

    const connectionGeo = useMemo(() => {
        const points = [];
        const colors = [];
        network.connections.forEach(conn => {
            const n1 = network.neurons[conn.from];
            const n2 = network.neurons[conn.to];
            points.push(n1.position.x, n1.position.y, n1.position.z);
            points.push(n2.position.x, n2.position.y, n2.position.z);
            colors.push(0, 0.2, 0.3);
            colors.push(0, 0.2, 0.3);
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        return geo;
    }, [network]);

    return (
        <group>
            {/* Neurons */}
            <group ref={groupRef}>
                {network.neurons.map((neuron, i) => (
                    <mesh key={`n-${i}`} position={[neuron.position.x, neuron.position.y, neuron.position.z]} scale={[1,1,1]}>
                        <sphereGeometry args={[1, 12, 12]} />
                        <shaderMaterial 
                            transparent
                            uniforms={{
                                time: { value: 0 },
                                baseColor: { value: new THREE.Color(neuron.type === 'INHIBITORY' ? neuronColors.inhibitory : neuronColors.excitatory) },
                                potential: { value: 0 }
                            }}
                            vertexShader={`
                                varying vec3 vNormal;
                                varying vec3 vViewPosition;
                                void main() {
                                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                                    vNormal = normalize(normalMatrix * normal);
                                    vViewPosition = -mvPosition.xyz;
                                    gl_Position = projectionMatrix * mvPosition;
                                }
                            `}
                            fragmentShader={`
                                varying vec3 vNormal;
                                varying vec3 vViewPosition;
                                uniform vec3 baseColor;
                                uniform float potential;
                                uniform float time;
                                void main() {
                                    vec3 normal = normalize(vNormal);
                                    vec3 viewDir = normalize(vViewPosition);
                                    float fresnel = pow(1.2 - dot(normal, viewDir), 2.0);
                                    float pulse = 0.5 + 0.5 * sin(time * 10.0 + potential * 5.0);
                                    vec3 color = baseColor * (1.5 + fresnel * 4.0);
                                    color += vec3(1.0) * potential * (1.0 + pulse);
                                    gl_FragColor = vec4(color, 1.0);
                                }
                            `}
                        />
                    </mesh>
                ))}
            </group>

            {/* Signals would go here as regular meshes for max reliability if needed */}
            
            {/* Connections */}
            <lineSegments geometry={connectionGeo} ref={connectionsRef}>
                <lineBasicMaterial vertexColors transparent opacity={0.4} blending={THREE.AdditiveBlending} />
            </lineSegments>
        </group>
    );
};

export default Scene;
