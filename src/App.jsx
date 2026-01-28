import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
// import { EffectComposer, Bloom } from '@react-three/postprocessing' // Note: using drei's Effects usually simpler but customized pipeline might be needed. Let's stick to simple layout first.
import Scene from './components/Scene';
import Terminal from './components/Terminal';
import { NeuralNetwork } from './simulation/NeuralNetwork'; // Import class

function App() {
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [systemLogs, setSystemLogs] = useState([
    "[SYSTEM] Neural Core Initialized...",
    "[SYSTEM] Synaptic weights loaded.",
    "[Ready] Waiting for input...",
  ]);
  
  // Ref to hold the Network Logic Instance
  const networkRef = useRef(null);

  const addLog = (msg) => {
    setSystemLogs(prev => [...prev.slice(-10), msg]);
  };

  const handleCommand = (cmdOriginal) => {
      const cmd = cmdOriginal.toLowerCase().trim();
      addLog(`> ${cmdOriginal}`);

      if (!networkRef.current) return;

      if (cmd === 'help') {
          addLog("Available commands:");
          addLog("  stimulate <val> - Inject current into random nodes");
          addLog("  reset           - Zero out all potentials");
          addLog("  status          - Show network metrics");
          addLog("  clear           - Clear terminal");
      }
      else if (cmd.startsWith('stimulate')) {
          const val = parseFloat(cmd.split(' ')[1]) || 1.0;
          networkRef.current.injectStimulus(10, val);
          addLog(`[OK] Injected ${val}v into 10 nodes.`);
      }
      else if (cmd === 'reset') {
          networkRef.current.neurons.forEach(n => {
              n.potential = 0; 
              n.refractoryPeriod = 0;
          });
          addLog("[OK] Core reset complete.");
      }
      else if (cmd === 'status') {
          const active = networkRef.current.neurons.filter(n => n.potential > 0.1).length;
          addLog(`[METRICS] Active Neurons: ${active} / ${networkRef.current.neuronCount}`);
          addLog(`[METRICS] Peak Voltage: 1.0v`);
      }
      else if (cmd === 'clear') {
          setSystemLogs([]);
      }
      else {
          addLog(`[ERR] Unknown command: ${cmd}`);
      }
  };

  // Background Monitoring Stream
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const neuronId = Math.floor(Math.random() * 200);
        const voltage = (Math.random() * 1.5).toFixed(4);
        const states = ["FIRING", "REFRACTORY", "DEPOLARIZING", "COLLAPSED"];
        const state = states[Math.floor(Math.random() * states.length)];
        
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        addLog(`[${timestamp}] NODE_${neuronId}: ${state} @ ${voltage}v`);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-screen relative bg-terminal-black overflow-hidden font-mono">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0 cursor-crosshair">
        <Canvas 
          gl={{ antialias: false, toneMapping: 0 }}
          onPointerDown={(e) => {
             // Global click handler to trigger collapse via networkRef
             // Note: R3F components handle their own, but we can catch "misses" here
             // Using e.intersections if we want to hit the network
          }}
        >
          <PerspectiveCamera makeDefault position={[0, 0, 15]} />
          <OrbitControls 
            enableZoom={true} 
            enablePan={false} 
            autoRotate={!terminalOpen} // Stop rotation when terminal is active for precision
            autoRotateSpeed={0.5} 
            minDistance={5} 
            maxDistance={30} 
          />
          
          <color attach="background" args={['#050505']} />
          <fog attach="fog" args={['#050505', 10, 30]} />
          
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} intensity={2.5} />
          <pointLight position={[-10, -10, -10]} intensity={1.5} color="#5ccfe6" />
          
          <Scene networkRef={networkRef} />
        </Canvas>
      </div>

      {/* VFX Layer */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-scanlines opacity-10"></div>
      <div className="scanline"></div>

      {/* UI Layer - Terminal */}
      <div className={`absolute top-4 left-4 z-20 transition-all duration-300 ${terminalOpen ? 'opacity-100' : 'opacity-0 scale-95'}`}>
        <Terminal logs={systemLogs} onCommand={handleCommand} />
      </div>

      {/* Toggle Button */}
      <button 
        onClick={() => setTerminalOpen(!terminalOpen)}
        className="absolute bottom-4 left-4 z-30 px-3 py-1 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-black transition-all hover:scale-105"
      >
        {terminalOpen ? 'CLOSE_TERMINAL_SESSION' : 'OPEN_TERMINAL_SESSION'}
      </button>

      {/* System Status Overlay */}
      <div className="absolute top-4 right-4 z-20 text-right pointer-events-none select-none">
        <h1 className="text-xl font-bold tracking-widest text-terminal-blue">NEURAL SYNAPSE v2.5</h1>
        <p className="text-xs text-terminal-gray">ENGINE: THREE.JS // LOGIC: SNN_STOCHASTIC_CHAOS</p>
        <div className="flex items-center justify-end gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-terminal-green animate-pulse"></span>
            <p className="text-xs text-terminal-green uppercase tracking-tighter">Sync: Active</p>
        </div>
      </div>
    </div>
  );
}

export default App;
