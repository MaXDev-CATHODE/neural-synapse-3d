import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import Scene from './components/Scene';
import Terminal from './components/Terminal';

function App() {
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [systemLogs, setSystemLogs] = useState([
    "[SYSTEM] Neural Core Initialized...",
    "[SYSTEM] Synaptic weights loaded.",
    "[Ready] Waiting for input...",
  ]);

  const addLog = (msg) => {
    setSystemLogs(prev => [...prev.slice(-10), msg]);
  };

  return (
    <div className="w-full h-screen relative bg-terminal-black overflow-hidden font-mono">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 10]} />
          <OrbitControls enableZoom={true} enablePan={true} autoRotate autoRotateSpeed={0.5} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Scene />
        </Canvas>
      </div>

      {/* VFX Layer */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-scanlines opacity-10"></div>
      <div className="scanline"></div>

      {/* UI Layer - Terminal */}
      <div className={`absolute top-4 left-4 z-20 transition-all duration-300 ${terminalOpen ? 'opacity-100' : 'opacity-0'}`}>
        <Terminal logs={systemLogs} onCommand={(cmd) => addLog(`> ${cmd}`)} />
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
        <h1 className="text-xl font-bold tracking-widest text-terminal-blue">NEURAL SYNAPSE v1.0</h1>
        <p className="text-xs text-terminal-gray">ENGINE: THREE.JS // LOGIC: SNN</p>
        <p className="text-xs text-terminal-green animate-pulse">STATUS: ONLINE</p>
      </div>
    </div>
  );
}

export default App;
