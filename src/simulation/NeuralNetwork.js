export class NeuralNetwork {
    constructor(neuronCount = 200, connectionDistance = 3.5) {
        this.neuronCount = neuronCount;
        this.neurons = [];
        this.connections = [];
        this.signals = []; // Active signals traveling through synapses
        this.connectionDistance = connectionDistance;
        
        this.init();
    }

    init() {
        for (let i = 0; i < this.neuronCount; i++) {
            this.neurons.push({
                id: i,
                position: {
                    x: (Math.random() - 0.5) * 20,
                    y: (Math.random() - 0.5) * 20,
                    z: (Math.random() - 0.5) * 20
                },
                potential: 0,
                threshold: 1.0,
                decay: 0.96,
                refractoryPeriod: 0,
                lastSpike: -100, // For STDP
                type: Math.random() > 0.85 ? 'INHIBITORY' : 'EXCITATORY'
            });
        }

        for (let i = 0; i < this.neuronCount; i++) {
            const n1 = this.neurons[i];
            for (let j = i + 1; j < this.neuronCount; j++) {
                const n2 = this.neurons[j];
                const dx = n1.position.x - n2.position.x;
                const dy = n1.position.y - n2.position.y;
                const dz = n1.position.z - n2.position.z;
                const distSq = dx*dx + dy*dy + dz*dz;

                if (distSq < this.connectionDistance * this.connectionDistance) {
                    const dist = Math.sqrt(distSq);
                    this.connections.push({
                        from: i,
                        to: j,
                        weight: Math.random() * 0.5 + 0.5,
                        length: dist,
                        active: 0 // Visualization intensity
                    });
                }
            }
        }
    }

    step(deltaTime, time) {
        const firingNeurons = [];

        // 1. Process Neurons
        this.neurons.forEach(n => {
            if (n.refractoryPeriod > 0) {
                n.refractoryPeriod -= deltaTime;
                n.potential = 0;
            } else {
                n.potential *= this.decay;
                
                // Spontaneous activity
                if (Math.random() < 0.002) n.potential += 0.3;

                if (n.potential >= n.threshold) {
                    n.potential = 0;
                    n.refractoryPeriod = 0.1; 
                    n.lastSpike = time;
                    firingNeurons.push(n.id);
                }
            }
        });

        // 2. Handle New Firing
        firingNeurons.forEach(id => {
            this.connections.forEach(conn => {
                let sourceId = -1;
                let targetId = -1;

                if (conn.from === id) { sourceId = conn.from; targetId = conn.to; }
                else if (conn.to === id) { sourceId = conn.to; targetId = conn.from; }

                if (targetId !== -1) {
                    // Create a traveling signal
                    this.signals.push({
                        from: sourceId,
                        to: targetId,
                        weight: conn.weight,
                        progress: 0,
                        speed: 15.0, // Units per second
                        targetLength: conn.length,
                        type: this.neurons[sourceId].type,
                        conn: conn // Reference for visual update
                    });
                    conn.active = 1.0;
                }
            });
        });

        // 3. Update Signals (Latency)
        for (let i = this.signals.length - 1; i >= 0; i--) {
            const s = this.signals[i];
            s.progress += (s.speed * deltaTime) / s.targetLength;
            
            if (s.progress >= 1.0) {
                // Signal reached target
                const target = this.neurons[s.to];
                const impact = s.weight * (s.type === 'EXCITATORY' ? 0.4 : -0.5);
                target.potential += impact;

                // STDP: If target just fired, strengthen connection. If target fired long ago, weaken.
                // Simple version:
                if (Math.abs(time - target.lastSpike) < 0.05) {
                    s.conn.weight = Math.min(2.0, s.conn.weight + 0.05);
                }

                this.signals.splice(i, 1);
            }
        }

        // 4. Update Visuals
        this.connections.forEach(conn => {
            if (conn.active > 0) conn.active *= 0.92;
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
            const dx = n.position.x - x;
            const dy = n.position.y - y;
            const dz = n.position.z - z;
            const distSq = dx*dx + dy*dy + dz*dz;

            if (distSq < range * range) {
                const dist = Math.sqrt(distSq);
                n.potential += intensity * (1 - dist/range);
                n.refractoryPeriod = 0;
            }
        });
    }

    stimulateNear(x, y, z, range = 3) {
        this.neurons.forEach(n => {
            const dx = n.position.x - x;
            const dy = n.position.y - y;
            const dz = n.position.z - z;
            const distSq = dx*dx + dy*dy + dz*dz;
            if (distSq < range * range) {
                n.potential += 0.08; 
            }
        });
    }
}

