export class CognitiveNetwork {
    constructor(maxNodes = 800) {
        this.maxNodes = maxNodes;
        this.neurons = [];
        this.connections = [];
        this.adjacency = new Map(); 
        this.edgeSet = new Set();   
        this.activeSignals = []; 
        
        this.globalStress = 0.0;
        this.timeSinceLastSpawn = 0;
        
        // PAMIĘĆ SENTENCJI (Sentence Memory)
        // Zamiast prostych "Patterns", przechowujemy "Sentences" czyli złożone układy.
        this.sentenceMemory = new Map(); // conceptId -> Set(motorIds)
        this.inputBuffer = new Set(); // Accumulates drawing
        this.nextConceptId = 425; // Pointer for learning

        this.init();
    }

    init() {
        console.log(`[INIT] Initializing Cognitive Brain (Geometry Engine) with ${this.maxNodes} neurons...`);
        for(let i=0; i<this.maxNodes; i++) {
            this.spawnNewNeuron(i);
        }
        this.initializeConnections();
    }
    
    registerConnection(conn) {
        const key = `${conn.from}-${conn.to}`;
        if (this.edgeSet.has(key)) return; 

        this.edgeSet.add(key);
        this.connections.push(conn);
        if (!this.adjacency.has(conn.from)) this.adjacency.set(conn.from, []);
        this.adjacency.get(conn.from).push(conn);
    }

    initializeConnections() {
        console.log("[INIT] Wiring Sentence Projection Architecture...");
        
        const retina = this.neurons.filter(n => n.id < 200);
        const edgeDetectors = this.neurons.filter(n => n.id >= 250 && n.id < 300);
        const angleDetectors = this.neurons.filter(n => n.id >= 300 && n.id < 325);
        const memory = this.neurons.filter(n => n.id >= 325 && n.id < 425);
        const concepts = this.neurons.filter(n => n.id >= 425 && n.id < 475);
        const inhibitors = this.neurons.filter(n => n.type === 'INHIBITORY');

        // 1. INPUT PROCESSING CHAIN (Standard Vision)
        edgeDetectors.forEach((edge, idx) => {
            const rowOffset = Math.floor(idx / 7) * 2;
            const colOffset = (idx % 7) * 2;
            for (let dr = 0; dr < 3; dr++) {
                for (let dc = 0; dc < 3; dc++) {
                    const rid = (rowOffset + dr) * 14 + (colOffset + dc);
                    if (rid < 200) this.addConnection(rid, edge.id, 1.5);
                }
            }
        });

        angleDetectors.forEach((angle) => {
            const near = edgeDetectors.sort((a,b) => this.dist(angle, a) - this.dist(angle, b));
            near.slice(0, 7).forEach(e => this.addConnection(e.id, angle.id, 1.3));
        });

        // 2. ABSTRACTION & MEMORY
        [...edgeDetectors, ...angleDetectors].forEach(feat => {
            for (let i = 0; i < 4; i++) {
                const target = memory[Math.floor(Math.random() * memory.length)];
                if (target) this.addConnection(feat.id, target.id, 1.0);
            }
        });

        memory.forEach(m => {
            if (Math.random() < 0.3) {
                const target = concepts[Math.floor(Math.random() * concepts.length)];
                if (target) this.addConnection(m.id, target.id, 2.0);
            }
        });

        // 3. REMOVED LATERAL INHIBITION (Konkurencja USUNIĘTA)
        /* 
           W wersji 2.6 usuwamy wzajemne hamowanie (Negative Weights) między pojęciami.
           Teraz neurony Concept mogą "współpracować" (Co-activation).
        */

        // 4. SENTENCE PROJECTION (Top-Down Projection)
        // Każde pojęcie przechowuje i rzutuje swoją "Sentencję" na Canvas
        this.wireSentenceToCanvas(425, 'CIRCLE_SENTENCE');   
        this.wireSentenceToCanvas(430, 'TRIANGLE_SENTENCE'); 
        this.wireSentenceToCanvas(435, 'SQUARE_SENTENCE');   
        this.wireSentenceToCanvas(440, 'CROSS_SENTENCE');    

        // 5. GLOBAL MASKING SUPPORT (Inhibitory - Noise Gates)
        inhibitors.forEach(inh => {
            // Inhibitory mają teraz zadanie czyścić tło, ale są sterowane globalnie w step()
            const targets = this.neurons.filter(n => 
                (n.type === 'MOTOR') && this.dist(inh, n) < 40
            );
            // Ustawiamy silne połączenia hamujące
            targets.slice(0, 15).forEach(t => this.addConnection(inh.id, t.id, -2.0));
        });

        console.log(`[INIT] Total connections: ${this.connections.length}`);
    }

    wireSentenceToCanvas(conceptId, shapeName) {
        const motorNeurons = this.neurons.filter(n => n.type === 'MOTOR');
        const sentencePixels = new Set();
        
        motorNeurons.forEach(n => {
            const idx = n.id - 200;
            const r = Math.floor(idx / 7);
            const c = idx % 7;
            let isActive = false;

            // Definicje Sentencji (Geometrycznych)
            if (shapeName === 'CIRCLE_SENTENCE') {
                const d = Math.sqrt(Math.pow(r-3, 2) + Math.pow(c-3, 2));
                if (d > 1.8 && d < 3.3) isActive = true;
            } else if (shapeName === 'TRIANGLE_SENTENCE') {
                if (r === 5 && c >= 1 && c <= 5) isActive = true;
                if (Math.abs(c-3) === Math.abs(r-1) && r >= 1 && r < 5) isActive = true;
            } else if (shapeName === 'SQUARE_SENTENCE') {
                if ((r === 1 || r === 5) && c >= 1 && c <= 5) isActive = true;
                if ((c === 1 || c === 5) && r >= 1 && r <= 5) isActive = true;
            } else if (shapeName === 'CROSS_SENTENCE') {
                if (r === 3 || c === 3) isActive = true;
            }

            if (isActive) {
                sentencePixels.add(n.id);
                // PROJEKCJA ADDYTYWNA: Silne połączenie pobudzające
                // Wiele sentencji może celować w ten sam piksel -> sumowanie sygnału
                this.addConnection(conceptId, n.id, 5.0);
            }
        });

        this.sentenceMemory.set(conceptId, sentencePixels);
        
        if (this.neurons[conceptId]) {
            this.neurons[conceptId].label = shapeName;
            this.neurons[conceptId].type = 'CONCEPT'; // Traktujemy jako źródło sentencji
        }
    }
    
    addConnection(fromId, toId, weightFactor = 1.0) {
        if (fromId === toId) return;
        const key = `${fromId}-${toId}`;
        if (this.edgeSet.has(key)) return;
        this.registerConnection({
            from: fromId, to: toId,
            weight: (0.2 + Math.random() * 0.1) * weightFactor,
            active: 0.0
        });
    }

    spawnNewNeuron(id) {
        let type = 'ASSOCIATION';
        let position = { x: 0, y: 0, z: 0 };
        
        if (id < 200) { type = 'SENSORY'; position = this.gridPos(id, 14, -90, 6.0); } 
        else if (id >= 200 && id < 250) { type = 'MOTOR'; position = this.gridPos(id-200, 7, 90, 11.0); } 
        else if (id >= 250 && id < 300) { type = 'FEATURE_EDGE'; position = this.gridPos(id-250, 7, -50, 10.0); }
        else if (id >= 425 && id < 475) { 
            type = 'CONCEPT'; // Sentence Holders
            position = this.gridPos(id-425, 7, 45, 13.0); 
        }
        else if (id >= 700) {
            type = 'INHIBITORY'; 
            // CLOUD SCATTER: Distribute randomly to look organic
            position = { 
                x: (Math.random() - 0.5) * 140, 
                y: (Math.random() - 0.5) * 120, 
                z: (Math.random() - 0.5) * 100 
            };
        }
        else {
            type = 'MEMORY'; 
            position = { x: (Math.random()-0.5)*45, y: (Math.random()-0.5)*90, z: (Math.random()-0.5)*90 };
        }

        const neuron = { id, position, type, potential: 0.0, threshold: 0.25, refractory: 0.0, label: type };
        this.neurons.push(neuron);
        return neuron;
    }

    gridPos(idx, width, xOffset, scale) {
        const r = Math.floor(idx / width);
        const c = idx % width;
        const centerOffset = width / 2;
        return { 
            x: xOffset, 
            y: (r - centerOffset) * scale, 
            z: (c - centerOffset) * scale 
        };
    }

    step(dt, time) {
        // 1. IDENTYFIKACJA AKTYWNYCH SENTENCJI
        // Sprawdzamy, które pojęcia (Sentencje) są aktywne.
        let activeConcepts = this.neurons.filter(n => n.type === 'CONCEPT' && n.potential > 0.3);
        
        // 2. UNION MASKING (Sumowanie Zbiorów)
        let allowedPixels = new Set();
        if (activeConcepts.length > 0) {
            activeConcepts.forEach(c => {
                const sentence = this.sentenceMemory.get(c.id);
                if (sentence) {
                    sentence.forEach(pixelId => allowedPixels.add(pixelId));
                }
            });
        }

        this.neurons.forEach(n => {
            let decay = 0.90; // Slower general decay
            if (n.type === 'MOTOR' && n.potential > 0.4) decay = 0.96; // LATCH EFFECT: Stickier patterns
            
            // SEQUENCE DRAW HOLD: If neuron is buffered (being drawn), do not decay!
            if (this.inputBuffer.has(n.id)) {
                n.potential = 1.0; // Keep it lit
                n.stress = 0.0;
                decay = 1.0; // No decay
            } else {
                n.potential *= decay;
            }

            if (n.potential < 0.005) n.potential = 0;
            if (n.refractory > 0) n.refractory -= dt;
            
            // INTELLIGENT MASKING
            if (n.type === 'MOTOR' && activeConcepts.length > 0) {
                // Jeśli ten piksel NIE należy do SUMY aktywnych sentencji -> Wygaszenie (Tło)
                if (!allowedPixels.has(n.id)) {
                    n.potential *= 0.1; 
                }
            }
            
            // NOISE (Spontaneous Activity) - FIX GHOST SIGNALS
            // Only allow noise in SENSORY or very rarely elsewhere
            if (Math.random() < 0.001) {
                if (n.type === 'SENSORY' && !this.inputBuffer.has(n.id)) {
                    n.potential += 0.1; 
                } else if (Math.random() < 0.01) {
                    // Very rare spontaneous thought in higher layers
                    n.potential += 0.05;
                }
            }

            // FIRE?
            if (n.potential > n.threshold && n.refractory <= 0) {
                 // Spontaneous firing handled by potential check
                 // For higher layers, make it harder to fire on pure noise
                 if (n.type !== 'SENSORY' && n.potential > 0.3) {
                     this.fire(n, 4, n.potential); 
                 } else if (n.type === 'SENSORY') {
                     // In Sequence Mode, buffered neurons DO NOT FIRE automatically.
                     // They fire only via fireInputTrace().
                     // In Rapid Fire, they are handled by addToInputTrace->fire.
                     // So here, only fire if NOT in buffer (e.g. noise or feedback)
                     if (!this.inputBuffer.has(n.id)) {
                        this.fire(n, 4, n.potential);
                     }
                 }
            }
        });

        // Propagation
        for (let i = this.activeSignals.length - 1; i >= 0; i--) {
            const s = this.activeSignals[i];
            s.progress += dt * 2.5; // SLOWER FLOW (Liquid thoughts) 
            if (s.progress >= 1.0) {
                const target = this.neurons[s.to];
                if (target && target.type !== 'SENSORY') {
                    const impact = s.weight * s.energy;
                    
                    // Additive Logic (działa zarówno dla pobudzeń jak i hamowania)
                    target.potential = Math.max(0, target.potential + impact);

                    if (s.conn) s.conn.active = 1.0;
                    if (target.potential > target.threshold && target.refractory <= 0 && s.remainingDepth > 0) {
                        this.fire(target, s.remainingDepth, s.energy * 0.90); // BETTER RETENTION (was 0.75)
                    } 
                }
                this.activeSignals.splice(i, 1);
            }
        }
        this.connections.forEach(c => c.active *= 0.75);
    }

    fire(neuron, depth = 5, energy = 1.0) {
        if (neuron.refractory > 0 || energy < 0.05) return;
        neuron.refractory = 0.15; 
        neuron.potential = 0;
        const outbound = this.adjacency.get(neuron.id) || [];
        outbound.forEach(c => {
            if (Math.abs(c.weight) > 0.05 || Math.random() < 0.15) {
                this.activeSignals.push({
                    from: neuron.id, to: c.to, weight: c.weight, progress: 0,
                    conn: c, energy: energy, remainingDepth: depth - 1
                });
            }
        });
    }

    // INPUT HANDLING (Drawing - Buffered or Rapid)
    addToInputTrace(neuronId, rapidFire = false) {
        const n = this.neurons[neuronId];
        if (n && n.type === 'SENSORY') {
            if (rapidFire) {
                // RAPID FIRE MODE: Immediate propagation
                n.potential = 1.0;
                n.stress = 0.0;
                this.fire(n, 6, 1.0);
            } else {
                // SEQUENCE MODE: Just buffer and glow
                n.potential = 0.8; // Visual feedback only (glow)
                n.stress = 0.0;
                this.inputBuffer.add(neuronId);
                // DO NOT FIRE. Wait for release.
            }
        }
    }

    fireInputTrace() {
        if (this.inputBuffer.size === 0) return;
        
        // GHOST SIGNAL FIX: Ignore small/accidental inputs (noise)
        // Was 3, now 15 to ensure deliberate drawing
        if (this.inputBuffer.size < 5) {
             this.inputBuffer.clear();
             return; // Too few points absolute
        }

        // SPATIAL FILTER: Check if points are spread out or just a blob (noise)
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        const bufferArray = Array.from(this.inputBuffer);
        
        bufferArray.forEach(id => {
            const n = this.neurons[id];
            if (n) {
                if (n.position.y < minY) minY = n.position.y;
                if (n.position.y > maxY) maxY = n.position.y;
                if (n.position.z < minX) minX = n.position.z; // Using Z as horizontal on the plane
                if (n.position.z > maxX) maxX = n.position.z;
            }
        });

        const width = maxX - minX;
        const height = maxY - minY;
        const diagonal = Math.sqrt(width*width + height*height);

        // If pattern is too small (e.g. just a click or small jitter), IGNORE
        if (diagonal < 8.0) {
            console.log(`[INPUT] Ignored spatial noise (Spread: ${diagonal.toFixed(1)})`);
            this.inputBuffer.clear();
            return;
        }

        console.log(`[INPUT] Analyzing sequence of ${this.inputBuffer.size} points...`);

        // 1. RECOGNITION (Jaccard Index)
        let bestMatch = null;
        let bestScore = 0.0;

        for (const [conceptId, pattern] of this.sentenceMemory) {
            const intersection = new Set([...this.inputBuffer].filter(x => pattern.has(x)));
            const union = new Set([...this.inputBuffer, ...pattern]);
            const score = intersection.size / union.size;

            if (score > bestScore) {
                bestScore = score;
                bestMatch = conceptId;
            }
        }

        // 2. DECISION
        // Higher threshold for recognition to avoid false positives
        if (bestScore > 0.35) { 
            // RECOGNIZED
            console.log(`[RECOGNIZED] Match: ${(bestScore*100).toFixed(1)}% (Concept ${bestMatch})`);
            const conceptNeuron = this.neurons[bestMatch];
            if (conceptNeuron) {
                // Boost concept
                conceptNeuron.potential = 1.0; 
                // Propagate stronger
                this.fire(conceptNeuron, 12, 1.0); 
            }
        } else {
            // NEW PATTERN -> LEARN
            // Only learn if it looks significant (not just scattered noise)
            // For now, size > 15 is the filter.
            console.log(`[NEW PATTERN] No match (Best: ${(bestScore*100).toFixed(1)}%). Learning...`);
            this.learnNewSequence();
        }

        // 3. CLEAR
        this.inputBuffer.clear();
    }

    learnNewSequence() {
        // STRICT LEARNING GUARD: Prevent "Ghost Signals"
        // 1. Min Points
        if (this.inputBuffer.size < 20) {
             console.log(`[LEARNING] Rejected: Too few points (${this.inputBuffer.size})`);
             this.inputBuffer.clear();
             return;
        }
        
        // 2. Spatial Spread
        let minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
        const bufferArray = Array.from(this.inputBuffer);
        bufferArray.forEach(id => {
            const n = this.neurons[id];
            if (n) {
                if (n.position.y < minY) minY = n.position.y;
                if (n.position.y > maxY) maxY = n.position.y;
                if (n.position.z < minZ) minZ = n.position.z;
                if (n.position.z > maxZ) maxZ = n.position.z;
            }
        });
        const width = maxZ - minZ;
        const height = maxY - minY;
        const diag = Math.sqrt(width*width + height*height);

        if (diag < 15.0) {
            console.log(`[LEARNING] Rejected: Pattern dense/noise (Spread: ${diag.toFixed(1)})`);
            this.inputBuffer.clear();
            return;
        }

        // Find free concept slot
        let newConceptId = -1;
        // Iterate through allocated concept range to find empty or use next pointer
        for (let id = 425; id < 475; id++) {
            if (!this.sentenceMemory.has(id)) {
                newConceptId = id;
                break;
            }
        }

        if (newConceptId !== -1) {
            // SAVE MEMORY
            this.sentenceMemory.set(newConceptId, new Set(this.inputBuffer));
            
            // WIRE IT
            const concept = this.neurons[newConceptId];
            concept.label = 'LEARNED';
            
            // Wire Concept -> Motor (Simple projection mapping for visualization)
            this.inputBuffer.forEach(sensoryId => {
                const motorId = sensoryId + 200; 
                if (this.neurons[motorId]) {
                        this.addConnection(newConceptId, motorId, 5.0);
                }
            });

            console.log(`[LEARNED] Assigned to Concept ${newConceptId}`);
            
            // FIRE
            concept.potential = 1.0;
            this.fire(concept, 12, 1.0);
        } else {
            console.warn("[MEMORY FULL] Cannot learn new pattern. Firing raw sensory.");
            this.inputBuffer.forEach(id => {
                const n = this.neurons[id];
                this.fire(n, 12, 1.0);
            });
        }
    }

    injectSymbol(symbolName) {
        console.log(`[INJECT] Injecting symbol: ${symbolName}`);
    }

    dist(n1, n2) {
        return Math.sqrt(Math.pow(n1.position.x-n2.position.x,2)+Math.pow(n1.position.y-n2.position.y,2)+Math.pow(n1.position.z-n2.position.z,2));
    }
}
