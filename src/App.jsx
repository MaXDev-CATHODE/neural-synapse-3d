import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Bloom, EffectComposer } from '@react-three/drei';
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

  return (
    <div className="w-full h-screen relative bg-terminal-black overflow-hidden font-mono">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas gl={{ antialias: false, toneMapping: 0 }}>
          <PerspectiveCamera makeDefault position={[0, 0, 15]} />
          <OrbitControls enableZoom={true} enablePan={true} autoRotate autoRotateSpeed={0.5} minDistance={5} maxDistance={30} />
          
          <color attach="background" args={['#050505']} />
          <fog attach="fog" args={['#050505', 10, 30]} />
          
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          
          <Scene networkRef={networkRef} />
        </Canvas>
      </div>

      {/* VFX Layer */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-scanlines opacity-10"></div>
      <div className="scanline"></div>

      {/* UI Layer - Terminal */}
      <div className={`absolute top-4 left-4 z-20 transition-all duration-300 ${terminalOpen ? 'opacity-100' : 'opacity-0'}`}>
        <Terminal logs={systemLogs} onCommand={handleCommand} />
      </div>

      {/* Toggle Button */}
      <button 
        onClick={() => setTerminalOpen(!terminalOpen)}
        className="absolute bottom-4 left-4 z-30 px-3 py-1 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-black transition-colors"
      >
        {terminalOpen ? 'HIDE_TERM' : 'SHOW_TERM'}
      </button>

      {/* System Status Overlay */}
      <div className="absolute top-4 right-4 z-20 text-right pointer-events-none">
        <h1 className="text-xl font-bold tracking-widest text-terminal-blue">NEURAL SYNAPSE v2.0</h1>
        <p className="text-xs text-terminal-gray">ENGINE: THREE.JS // LOGIC: SNN</p>
        <p className="text-xs text-terminal-green animate-pulse">STATUS: ONLINE</p>
      </div>
    </div>
  );
}

export default App;
