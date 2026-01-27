import React, { useState, useRef, useEffect } from 'react';

const Terminal = ({ logs, onCommand }) => {
    const [input, setInput] = useState('');
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            const cmd = input.trim();
            if (cmd) {
                onCommand(cmd);
                if (cmd === 'clear') {
                    // Handled by parent theoretically, but visual clear could be here
                } else if (cmd === 'help') {
                    // onCommand will echo, parent logic handles response
                }
                setInput('');
            }
        }
    };

    return (
        <div className="w-[400px] h-[300px] backdrop-blur-md bg-terminal-black/80 border border-terminal-gray rounded-lg shadow-2xl overflow-hidden flex flex-col font-mono text-xs">
            {/* Header */}
            <div className="bg-terminal-gray/50 px-3 py-1 flex items-center justify-between border-b border-terminal-gray">
                <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-terminal-red"></div>
                    <div className="w-2 h-2 rounded-full bg-terminal-blue"></div>
                    <div className="w-2 h-2 rounded-full bg-terminal-green"></div>
                </div>
                <span className="text-terminal-gray text-[10px]">bash -- neuron-cli</span>
            </div>

            {/* Output */}
            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-1">
                {logs.map((log, i) => (
                    <div key={i} className="text-terminal-blue">
                        <span className="text-terminal-green opacity-50">{new Date().toLocaleTimeString().split(' ')[0]}</span>{' '}
                        {log}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-terminal-black/50 border-t border-terminal-gray flex items-center gap-2">
                <span className="text-terminal-purple">❯</span>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="bg-transparent border-none outline-none text-white w-full h-full placeholder-terminal-gray"
                    placeholder="Type command..."
                    autoFocus
                />
            </div>
        </div>
    );
};

export default Terminal;
