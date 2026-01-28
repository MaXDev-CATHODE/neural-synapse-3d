export class NeuralNetwork {
    constructor(neuronCount = 200, connectionDistance = 3.5) {
        this.neuronCount = neuronCount;
        this.neurons = [];
        this.connections = [];
        this.connectionDistance = connectionDistance;
        
        this.init();
    }

    init() {
        // Initialize Neurons
        for (let i = 0; i < this.neuronCount; i++) {
            this.neurons.push({
                id: i,
                position: {
                    x: (Math.random() - 0.5) * 20,
                    y: (Math.random() - 0.5) * 20,
                    z: (Math.random() - 0.5) * 20
                },
                potential: 0, // Current charge (0 to 1)
                threshold: 1.0, // Firing threshold
                decay: 0.95, // Decay factor per frame
                refractoryPeriod: 0, // Cooldown after firing
                type: Math.random() > 0.8 ? 'INHIBITORY' : 'EXCITATORY'
            });
        }

        // Initialize Connections
        // Using simple distance-based connecting
        for (let i = 0; i < this.neuronCount; i++) {
            const n1 = this.neurons[i];
            for (let j = i + 1; j < this.neuronCount; j++) {
                const n2 = this.neurons[j];
                const dist = Math.sqrt(
                    Math.pow(n1.position.x - n2.position.x, 2) +
                    Math.pow(n1.position.y - n2.position.y, 2) +
                    Math.pow(n1.position.z - n2.position.z, 2)
                );

                if (dist < this.connectionDistance) {
                    this.connections.push({
                        from: i,
                        to: j,
                        weight: Math.random() * 0.5 + 0.5,
                        active: 0 // For visualization (0 to 1)
                    });
                }
            }
        }
    }

    // Update simulation step
    // Returns list of firing neuron IDs
    step(deltaTime) {
        const firingNeurons = [];

        // 1. Decay and Refractory processing
        this.neurons.forEach(n => {
            if (n.refractoryPeriod > 0) {
                n.refractoryPeriod -= deltaTime;
                n.potential = 0;
            } else {
                n.potential *= this.decay;
            }

            // Spontaneous activity (Noise)
            if (Math.random() < 0.005) { // Increased noise
                n.potential += 0.4;
            }

            // Check threshold
            if (n.potential >= n.threshold) {
                n.potential = 0;
                n.refractoryPeriod = 0.05; // Shorter cooldown
                firingNeurons.push(n.id);
            }
        });

        // 2. Propagate spikes
        firingNeurons.forEach(id => {
            this.connections.forEach(conn => {
                let targetId = -1;
                if (conn.from === id) targetId = conn.to;
                if (conn.to === id) targetId = conn.from;

                if (targetId !== -1) {
                    const source = this.neurons[id];
                    const target = this.neurons[targetId];
                    
                    if (source.type === 'EXCITATORY') {
                        target.potential += conn.weight * 0.3; // Increased weight
                    } else {
                        target.potential -= conn.weight * 0.4; // Inhibition
                    }

                    // Visualize pulse
                    conn.active = 1.0; 
                }
            });
        });

        // 3. Update connection visuals (decay activity)
        this.connections.forEach(conn => {
            if (conn.active > 0) conn.active *= 0.85; // Faster fade
        });

        return firingNeurons;
    }

    injectStimulus(count = 5, strength = 1.0) {
        for(let i=0; i<count; i++) {
            const idx = Math.floor(Math.random() * this.neuronCount);
            this.neurons[idx].potential += strength;
        }
    }

    collapseAt(x, y, z, range = 5, intensity = 2.0) {
        this.neurons.forEach(n => {
            const dist = Math.sqrt(
                Math.pow(n.position.x - x, 2) +
                Math.pow(n.position.y - y, 2) +
                Math.pow(n.position.z - z, 2)
            );

            if (dist < range) {
                n.potential += intensity * (1 - dist/range);
                n.refractoryPeriod = 0; // Force immediate firing
            }
        });
    }

    stimulateNear(x, y, z, range = 2) {
        this.neurons.forEach(n => {
            const dist = Math.sqrt(
                Math.pow(n.position.x - x, 2) +
                Math.pow(n.position.y - y, 2) +
                Math.pow(n.position.z - z, 2)
            );
            if (dist < range) {
                n.potential += 0.05; // Subtle stim by hover
            }
        });
    }
}
