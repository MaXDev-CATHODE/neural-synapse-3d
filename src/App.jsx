import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import Scene from './components/Scene';
import Terminal from './components/Terminal';
import { NeuralNetwork } from './simulation/NeuralNetwork'; 

function App() {
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [systemLogs, setSystemLogs] = useState([
    "[SYSTEM] Neural Core Initialized...",
    "[SYSTEM] Synaptic weights loaded.",
    "[Ready] Neural Masterpiece running in HDR mode.",
  ]);
  
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
          networkRef.current.injectStimulus(15, val); // Increased count
          addLog(`[OK] Injected ${val}v into 15 nodes.`);
      }
      else if (cmd === 'reset') {
          networkRef.current.neurons.forEach(n => {
              n.potential = 0; 
              n.refractoryPeriod = 0;
          });
          networkRef.current.signals = [];
          addLog("[OK] Core reset complete.");
      }
      else if (cmd === 'status') {
          const active = networkRef.current.neurons.filter(n => n.potential > 0.1).length;
          const signals = networkRef.current.signals.length;
          addLog(`[METRICS] Active Neurons: ${active} / ${networkRef.current.neuronCount}`);
          addLog(`[METRICS] Active Signals: ${signals}`);
          addLog(`[METRICS] Peak Voltage: 1.0v (HDR Enabled)`);
      }
      else if (cmd === 'clear') {
          setSystemLogs([]);
      }
      else {
          addLog(`[ERR] Unknown command: ${cmd}`);
      }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        const neuronId = Math.floor(Math.random() * 200);
        const voltage = (Math.random() * 1.5).toFixed(4);
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        addLog(`[${timestamp}] NODE_${neuronId}: FIRING @ ${voltage}v`);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-screen relative bg-[#020202] overflow-hidden font-mono text-white">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0 cursor-crosshair">
        <Canvas 
          gl={{ 
            antialias: true, 
            toneMapping: THREE.NoToneMapping,
            stencil: false,
            depth: true,
            powerPreference: "high-performance"
          }}
          dpr={[1, 2]}
        >
          <PerspectiveCamera makeDefault position={[0, 0, 18]} />
          <OrbitControls 
            enableZoom={true} 
            enablePan={false} 
            autoRotate={!terminalOpen} 
            autoRotateSpeed={0.3} 
            minDistance={8} 
            maxDistance={35} 
          />
          
          <color attach="background" args={['#010101']} />
          {/* <fog attach="fog" args={['#010101', 15, 45]} /> */}
          
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
