import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import Scene from './components/Scene';
function App() {
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [timeScale, setTimeScale] = useState(1.0); // 1.0 = Normal, 0.2 = 5x Slower
  const [fireMode, setFireMode] = useState('SEQUENCE'); // 'SEQUENCE' | 'RAPID'
  const [showWelcome, setShowWelcome] = useState(true);
  
  const networkRef = useRef(null);
  const activeKeysRef = useRef(new Set()); 
  
  // Keyboard Logic
  useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.repeat) return;
        
        const code = e.code;
        // IGNORE CAMERA CONTROLS for Injection
        // We don't want to inject 'W' when moving forward, triggering re-renders.
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'Space', 'ShiftLeft', 'ControlLeft'].includes(code)) {
            return; 
        }

        const char = e.key.toUpperCase();
        if (!/^[A-Z0-9]$/.test(char)) return;
        
        // Check REF immediately (synchronous)
        if (activeKeysRef.current.has(char)) return;
        
        activeKeysRef.current.add(char);
        
        if(networkRef.current) {
            networkRef.current.injectSymbol(char);
        }
        
        // Update UI state
        setActiveKeys(new Set(activeKeysRef.current));
    };

    const handleKeyUp = (e) => {
        const char = e.key.toUpperCase();
        activeKeysRef.current.delete(char);
        setActiveKeys(new Set(activeKeysRef.current));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="w-full h-screen relative bg-[#020202] overflow-hidden font-mono text-white select-none">
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
          <color attach="background" args={['#010101']} />
          <Scene networkRef={networkRef} timeScale={timeScale} fireMode={fireMode} />
          <ambientLight intensity={0.5} />
        </Canvas>
      </div>

      {/* WELCOME OVERLAY */}
      {showWelcome && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0a0a0a] border border-terminal-green/50 p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(0,255,0,0.1)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-terminal-green to-transparent"></div>
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tighter">COGNITIVE <span className="text-terminal-green">NEURAL</span> NETWORK</h1>
                <p className="text-terminal-gray text-sm mb-6 uppercase tracking-widest">Interactive Spiking Neural Network Simulation</p>
                
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-terminal-green font-bold mb-2 border-b border-terminal-green/20 pb-1">HOW IT WORKS</h3>
                        <ul className="text-sm text-gray-300 space-y-2">
                            <li>• <b className="text-white">Draw</b> shapes on the 3D grid with Mouse Left Button.</li>
                            <li>• <b className="text-white">Neurons</b> capture input and propagate signals.</li>
                            <li>• <b className="text-white">Concepts</b> (Purple) recognize patterns (Triangle, Square).</li>
                            <li>• If no pattern matches, the network <b className="text-terminal-blue">Learns</b> a new one.</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-terminal-blue font-bold mb-2 border-b border-terminal-blue/20 pb-1">CONTROLS</h3>
                        <ul className="text-sm text-gray-300 space-y-2">
                            <li>• <span className="bg-gray-800 px-1 rounded text-xs">LMB (Hold)</span> : Draw / Input</li>
                            <li>• <span className="bg-gray-800 px-1 rounded text-xs">RMB (Drag)</span> : Rotate Camera</li>
                            <li>• <span className="bg-gray-800 px-1 rounded text-xs">Scroll</span> : Zoom (Dolly)</li>
                            <li>• <span className="bg-gray-800 px-1 rounded text-xs">Time</span> : Slow Motion Controls (Bottom Left)</li>
                            <li>• <span className="bg-gray-800 px-1 rounded text-xs">Mode</span> : Sequence vs Rapid Fire</li>
                        </ul>
                    </div>
                </div>

                <button 
                    onClick={() => setShowWelcome(false)}
                    className="w-full py-4 bg-terminal-green/10 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-black font-bold tracking-widest transition-all text-lg"
                >
                    INITIALIZE SIMULATION
                </button>
            </div>
        </div>
      )}

      {/* UI */}
      {!showWelcome && (
        <>
            <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', zIndex: 100 }}>
                <h1 className="text-xl font-bold">Cognitive Brain 2.0</h1>
                <p className="text-sm opacity-70">KEYBOARD INPUT ACTIVE</p>
                <div style={{ display: 'flex', gap: '5px', marginTop: '10px', flexWrap: 'wrap', maxWidth: '300px' }}>
                    {Array.from(activeKeys).map(k => (
                        <span key={k} style={{...btnStyle, color: '#FFD700', borderColor: '#FFD700'}}>{k}</span>
                    ))}
                    {activeKeys.size === 0 && <span style={{...btnStyle, opacity: 0.5}}>...</span>}
                </div>
            </div>

            <div className="absolute bottom-4 left-4 z-30 flex items-center gap-4">
                {/* FIRE MODE TOGGLE */}
                <div className="flex gap-1 border border-terminal-gray/50 p-1 bg-black/50">
                     <button 
                        onClick={() => setFireMode('SEQUENCE')}
                        className={`px-3 py-1 text-xs font-bold transition-all ${fireMode === 'SEQUENCE' ? 'bg-terminal-blue text-black' : 'text-terminal-gray hover:text-white'}`}
                     >
                        SEQUENCE (DRAW)
                     </button>
                     <button 
                        onClick={() => setFireMode('RAPID')}
                        className={`px-3 py-1 text-xs font-bold transition-all ${fireMode === 'RAPID' ? 'bg-red-500 text-black' : 'text-terminal-gray hover:text-white'}`}
                     >
                        RAPID FIRE
                     </button>
                </div>

                <div className="h-6 w-px bg-terminal-gray/50"></div>

                {/* TIME CONTROL */}
                <div className="flex gap-2">
                    {[
                        { label: '1x', val: 1.0 },
                        { label: '2x', val: 0.5 },
                        { label: '5x', val: 0.2 }
                    ].map(opt => (
                        <button 
                            key={opt.label}
                            onClick={() => setTimeScale(opt.val)}
                            className={`px-3 py-1 border transition-all text-sm font-bold ${
                                Math.abs(timeScale - opt.val) < 0.01 
                                ? 'bg-terminal-green text-black border-terminal-green scale-105' 
                                : 'border-terminal-green text-terminal-green hover:bg-terminal-green/20'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="absolute top-4 right-4 z-20 text-right pointer-events-none select-none">
                <h1 className="text-xl font-bold tracking-widest text-terminal-blue">NEURAL SYNAPSE v2.5</h1>
                <p className="text-xs text-terminal-gray">ENGINE: THREE.JS // LOGIC: SNN</p>
                <div className="flex items-center justify-end gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-terminal-green animate-pulse"></span>
                    <p className="text-xs text-terminal-green uppercase tracking-tighter">Sync: Active</p>
                </div>
            </div>
        </>
      )}
    </div>
  );
}

const btnStyle = {
    padding: '8px 16px',
    background: '#222',
    color: '#0f0',
    border: '1px solid #0f0',
    cursor: 'pointer',
    fontWeight: 'bold',
    minWidth: '40px',
    textAlign: 'center'
};

export default App;
