export class NeuralNetwork {
    constructor(neuronCount = 100, connectionDistance = 4.0) {
        this.neuronCount = neuronCount;
        this.neurons = [];
        this.connections = [];
        this.signals = [];
        this.connectionDistance = connectionDistance;
        this.init();
    }

    init() {
        // Create a focused cluster + outliers
        for (let i = 0; i < this.neuronCount; i++) {
            this.neurons.push({
                id: i,
                position: {
                    x: (Math.random() - 0.5) * 15, // Tighter cluster
                    y: (Math.random() - 0.5) * 15,
                    z: (Math.random() - 0.5) * 15
                },
                potential: 0,
                type: Math.random() > 0.5 ? 'EXCITATORY' : 'INHIBITORY'
            });
        }

        // Force connections
        for (let i = 0; i < this.neuronCount; i++) {
            const n1 = this.neurons[i];
            // Connect to at least 3 nearest neighbors guaranteed
            let candidates = [];
            for (let j = 0; j < this.neuronCount; j++) {
                if (i === j) continue;
                const n2 = this.neurons[j];
                const dx = n1.position.x - n2.position.x;
                const dy = n1.position.y - n2.position.y;
                const dz = n1.position.z - n2.position.z;
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                candidates.push({ id: j, dist });
            }
            // Sort by distance
            candidates.sort((a, b) => a.dist - b.dist);
            
            // Connect to top 5 closest
            for(let k=0; k<5; k++) {
                if(candidates[k]) {
                    this.connections.push({
                        from: i,
                        to: candidates[k].id,
                        weight: 1.0,
                        active: 1.0 // Start full visible
                    });
                }
            }
        }
    }

    step(deltaTime, time) {
        // 1. Auto-Fire Logic (Spam signals for visibility)
        if (Math.random() > 0.8) { // 20% chance per frame to fire a random neuron
            const idx = Math.floor(Math.random() * this.neuronCount);
            const neuron = this.neurons[idx];
            neuron.potential = 1.0;
            
            // Trigger 3 random signals from this neuron
            this.connections.filter(c => c.from === idx).forEach(conn => {
                this.signals.push({
                    from: conn.from,
                    to: conn.to,
                    progress: 0,
                    speed: 10.0 // Slow enough to see, fast enough to flow
                });
                conn.active = 1.0;
            });
        }

        // 2. Update Signals
        for (let i = this.signals.length - 1; i >= 0; i--) {
            const s = this.signals[i];
            s.progress += deltaTime * 0.5 * s.speed / 5.0; // Normalized speed
            
            if (s.progress >= 1.0) {
                // Hit target
                const target = this.neurons[s.to];
                target.potential = 1.0; // Light up target
                this.signals.splice(i, 1);
            }
        }

        // 3. Decay Potentials
        this.neurons.forEach(n => {
            n.potential *= 0.95;
        });

        // 4. Decay Connections transparency
        this.connections.forEach(c => {
            c.active *= 0.98;
            if(c.active < 0.2) c.active = 0.2; // Min visibility
        });
    }
}
