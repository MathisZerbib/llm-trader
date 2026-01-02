import { useState } from 'react';

interface Log {
  type: string
  time: string
  content: string
}

interface LogPanelProps {
  logs: Log[]
}

export default function LogPanel({ logs }: LogPanelProps) {
  const [activeTab, setActiveTab] = useState<'NEURAL' | 'CHAT' | 'THOUGHTS'>('NEURAL');
  const tabs = ['NEURAL', 'CHAT', 'THOUGHTS'] as const

  const filteredLogs = logs.map(log => {
    // If the type was Reflections, we'll treat it as THOUGHTS in this component
    if (log.type === 'REFLECTIONS') return { ...log, type: 'THOUGHTS' as const };
    return log;
  }).filter(log => log.type === (activeTab === 'THOUGHTS' ? 'THOUGHTS' : activeTab));

  const getAgentColor = (content: string) => {
    if (content.includes('[STRATEGY')) return 'text-blue-400 border-blue-500';
    if (content.includes('[ANALYSIS')) return 'text-cyan-400 border-cyan-500';
    if (content.includes('[RISK')) return 'text-orange-400 border-orange-500';
    return 'text-purple-400 border-purple-500';
  };

  const getAgentBg = (content: string) => {
    if (content.includes('[STRATEGY')) return 'bg-blue-500';
    if (content.includes('[ANALYSIS')) return 'bg-cyan-500';
    if (content.includes('[RISK')) return 'bg-orange-500';
    return 'bg-purple-500';
  };

  return (
    <div className="border border-neon-green/30 bg-black/80 h-full flex flex-col shadow-[0_0_20px_rgba(0,255,65,0.05)]">
      <div className="flex border-b border-neon-green/30 bg-green-950/10">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs tracking-widest font-black border-r border-neon-green/30 last:border-r-0 transition-all ${
              activeTab === tab 
                ? 'bg-neon-green text-black shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]' 
                : 'text-green-800 hover:text-neon-green hover:bg-green-900/20'
            }`}
          >
            {tab} [{logs.filter(l => (l.type === 'REFLECTIONS' && tab === 'THOUGHTS') || (l.type === tab)).length}]
          </button>
        ))}
      </div>

      <div className="p-4 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log, idx) => (
            <div key={idx} className={`border-l-2 pl-4 py-1 transition-all hover:bg-white/5 ${getAgentColor(log.content).split(' ')[1]}`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${getAgentBg(log.content)}`}></div>
                  <span className={`text-[10px] font-black tracking-tighter uppercase ${getAgentColor(log.content).split(' ')[0]}`}>
                    {log.type === 'THOUGHTS' ? 'COGNITION_LINK_ESTABLISHED' : 'NETWORK_EVENT'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-green-900">{log.time}</span>
              </div>
              <p className={`text-xs font-mono leading-relaxed whitespace-pre-wrap ${getAgentColor(log.content).split(' ')[0]}`}>
                {log.content}
              </p>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20 filter grayscale">
            <div className="w-12 h-12 border-2 border-dashed border-neon-green rounded-full animate-spin-slow mb-4"></div>
            <span className="text-[10px] tracking-[0.2em] font-black">WAITING_FOR_DATA_STREAM...</span>
          </div>
        )}
      </div>
    </div>
  )
}
