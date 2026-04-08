import { useState, useEffect, useMemo } from 'react';

interface MarketStatus {
  status: string
  next_open: string
  next_close: string
}

interface LlmSettings {
  provider: string
  grok_model: string
  local_model: string
  local_url: string
  recommended_grok_model?: string
  active_engine?: string
}

interface LocalModel {
  key: string
  display_name: string
  loaded?: boolean
}

interface DashboardHeaderProps {
  botActive?: boolean;
  marketStatus?: MarketStatus | null;
  onToggleBot?: () => void;
  llmSettings?: LlmSettings;
  localModels?: LocalModel[];
  modelsLoading?: boolean;
  onProviderChange?: (provider: string) => void;
  onGrokModelChange?: (model: string) => void;
  onLocalModelChange?: (model: string) => void;
  onRefreshModels?: () => void;
  onApplyModelSettings?: () => void;
}

export default function DashboardHeader({
  botActive,
  marketStatus,
  onToggleBot,
  llmSettings,
  localModels = [],
  modelsLoading = false,
  onProviderChange,
  onGrokModelChange,
  onLocalModelChange,
  onRefreshModels,
  onApplyModelSettings,
}: DashboardHeaderProps) {
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
        {/* <h1 className="text-2xl font-bold tracking-wider text-neon-green">
          <span className="text-white">GROK TRADER</span> - ANALYTICS
        </h1> */}
        {/* <span className="bg-green-900/30 text-neon-green px-2 py-0.5 text-xs rounded border border-neon-green/50">
          ID: U23147095
        </span> */}
          
        <span className={`px-2 py-0.5 text-xs rounded border ${botActive ? 'bg-green-900/30 text-neon-green border-neon-green/50' : 'bg-red-900/30 text-red-500 border-red-500/50'}`}>
          {botActive ? 'ACTIVE' : 'PAUSED'}
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

      {llmSettings && (
        <div className="ml-6 flex items-end gap-3 rounded border border-neon-green/20 bg-black/70 px-3 py-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.2em] text-green-800">Provider</span>
            <select
              value={llmSettings.provider}
              onChange={(e) => onProviderChange?.(e.target.value)}
              className="bg-black border border-green-800 text-neon-green text-xs px-2 py-1 rounded outline-none"
            >
              <option value="grok">Grok</option>
              <option value="local">LM Studio</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] uppercase tracking-[0.2em] text-green-800">Model</span>
            {llmSettings.provider === 'grok' ? (
              <input
                value={llmSettings.grok_model}
                onChange={(e) => onGrokModelChange?.(e.target.value)}
                placeholder={llmSettings.recommended_grok_model || 'x-ai/grok-4.1-fast'}
                className="bg-black border border-green-800 text-neon-green text-xs px-2 py-1 rounded outline-none w-64"
              />
            ) : (
              <select
                value={llmSettings.local_model}
                onChange={(e) => onLocalModelChange?.(e.target.value)}
                className="bg-black border border-green-800 text-neon-green text-xs px-2 py-1 rounded outline-none w-64"
              >
                {!localModels.some((model) => model.key === llmSettings.local_model) && llmSettings.local_model && (
                  <option value={llmSettings.local_model}>{llmSettings.local_model} (current)</option>
                )}
                {localModels.length > 0 ? (
                  localModels.map((model) => (
                    <option key={model.key} value={model.key}>
                      {model.display_name}{model.loaded ? ' (loaded)' : ''}
                    </option>
                  ))
                ) : (
                  <option value={llmSettings.local_model}>No LM Studio models detected</option>
                )}
              </select>
            )}
          </div>

          {llmSettings.provider === 'local' && onRefreshModels && (
            <button
              onClick={onRefreshModels}
              disabled={modelsLoading}
              className="px-3 py-1 text-xs font-bold rounded border border-green-800 text-green-600 hover:text-neon-green disabled:opacity-50"
            >
              {modelsLoading ? 'REFRESHING' : 'REFRESH'}
            </button>
          )}

          {onApplyModelSettings && (
            <button
              onClick={onApplyModelSettings}
              className="px-3 py-1 text-xs font-bold rounded border border-neon-green bg-neon-green text-black hover:bg-green-400"
            >
              APPLY
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-green-700">
        <span>PARIS {formatTime(time)}</span>
        <span>NY {new Date(time.getTime() - 6 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      </div>
    </header>
  );
}
