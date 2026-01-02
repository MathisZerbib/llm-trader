import { useState, useEffect, useMemo } from 'react';

interface MarketStatus {
  status: string
  next_open: string
  next_close: string
}

interface DashboardHeaderProps {
  botActive?: boolean;
  marketStatus?: MarketStatus | null;
  onToggleBot?: () => void;
}

export default function DashboardHeader({ botActive, marketStatus, onToggleBot }: DashboardHeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeUntil = useMemo(() => {
    if (!marketStatus) return "";

    const target = marketStatus.status === 'open'
      ? new Date(marketStatus.next_close)
      : new Date(marketStatus.next_open);

    const targetMs = target.getTime();
    if (Number.isNaN(targetMs)) return "—";

    const diff = targetMs - time.getTime();
    if (diff <= 0) return "Processing...";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }, [marketStatus, time]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <header className="flex justify-between items-center mb-6 border-b border-neon-green/30 pb-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 border border-neon-green px-3 py-1 rounded">
          <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
            <span className="text-black text-xs font-bold">S</span>
          </div>
          <span className="text-sm font-bold">DASHBOARD</span>
        </div>
        
        {marketStatus && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded border ${marketStatus.status === 'open' ? 'border-green-500 bg-green-900/20' : 'border-yellow-500 bg-yellow-900/20'}`}>
            <div className={`w-2 h-2 rounded-full ${marketStatus.status === 'open' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
            <span className={`text-xs font-bold ${marketStatus.status === 'open' ? 'text-green-500' : 'text-yellow-500'}`}>
              MARKET {marketStatus.status.toUpperCase()}
            </span>
            <span className="text-xs text-gray-400 border-l border-gray-700 pl-2">
              {marketStatus.status === 'open' ? 'CLOSES' : 'OPENS'} IN {timeUntil}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold tracking-wider text-neon-green">
          <span className="text-white">GROK TRADER</span> - ANALYTICS
        </h1>
        <span className="bg-green-900/30 text-neon-green px-2 py-0.5 text-xs rounded border border-neon-green/50">
          ID: U23147095
        </span>
        <span className={`px-2 py-0.5 text-xs rounded border ${botActive ? 'bg-green-900/30 text-neon-green border-neon-green/50' : 'bg-red-900/30 text-red-500 border-red-500/50'}`}>
          {botActive ? 'SYSTEM ACTIVE' : 'SYSTEM PAUSED'}
        </span>
        {onToggleBot && (
          <button 
            onClick={onToggleBot} 
            className={`px-3 py-1 text-xs font-bold rounded border transition-colors ${
              botActive 
                ? 'bg-red-900/20 text-red-500 border-red-500 hover:bg-red-900/40' 
                : 'bg-neon-green/20 text-neon-green border-neon-green hover:bg-neon-green/40'
            }`}
          >
            [ {botActive ? 'STOP AGENT' : 'EXECUTE AGENT'} ]
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-green-700">
        <span>PARIS {formatTime(time)}</span>
        <span>NY {new Date(time.getTime() - 6 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      </div>
    </header>
  );
}
