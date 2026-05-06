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
  position_monitor_interval_seconds?: number
  take_profit_percentage?: number
  stop_loss_percentage?: number
  daily_drawdown_threshold?: number
  web_research_enabled?: boolean
  web_research_max_tickers?: number
  web_research_days?: number
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
  onIntervalChange?: (seconds: number) => void;
  onSettingsChange?: (settings: Partial<LlmSettings>) => void;
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
  onIntervalChange,
  onSettingsChange,
  onRefreshModels,
  onApplyModelSettings,
}: DashboardHeaderProps) {
  const [time, setTime] = useState(new Date());
  const [isEngineOpen, setIsEngineOpen] = useState(false);

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
    if (diff <= 0) return "PROCESING...";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}H ${minutes}M`;
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
    <header className="mb-6 border-b border-green-900/40 pb-4">
      <div className="flex justify-between items-center gap-6">
        {/* SITUATION ROOM (LEFT) */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border border-neon-green/50 bg-green-950/10 px-2 py-1">
            <div className="w-3 h-3 bg-neon-green flex items-center justify-center">
              <span className="text-black text-[10px] font-bold">G</span>
            </div>
            <span className="text-[10px] font-bold tracking-widest text-neon-green">DASHBOARD</span>
          </div>
          
          {marketStatus && (
            <div className={`flex items-center gap-2 px-2 py-1 border ${marketStatus.status === 'open' ? 'border-green-500/30' : 'border-yellow-500/30'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${marketStatus.status === 'open' ? 'bg-green-500 animate-pulse shadow-[0_0_5px_#22c55e]' : 'bg-yellow-500'}`}></div>
              <span className={`text-[10px] font-bold tracking-tighter ${marketStatus.status === 'open' ? 'text-green-500' : 'text-yellow-500'}`}>
                {marketStatus.status.toUpperCase()}
              </span>
              <span className="text-[10px] text-green-900 font-mono">
                {timeUntil}
              </span>
            </div>
          )}
        </div>

        {/* COMMAND CENTER (MIDDLE) */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-2 py-1 border ${botActive ? 'border-green-800 bg-green-950/20' : 'border-red-900 bg-red-950/20'}`}>
             <div className={`w-1.5 h-1.5 ${botActive ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}></div>
             <span className={`text-[10px] font-bold tracking-[0.2em] ${botActive ? 'text-neon-green' : 'text-red-500'}`}>
               {botActive ? 'NEURAL_ACTIVE' : 'SYSTEM_PAUSED'}
             </span>
          </div>

          {onToggleBot && (
            <button 
              onClick={onToggleBot} 
              className={`px-4 py-1 text-[10px] font-bold tracking-widest border transition-all ${
                botActive 
                  ? 'border-red-600 text-red-600 hover:bg-red-950/30' 
                  : 'border-neon-green text-neon-green hover:bg-green-950/30'
              }`}
            >
              [ {botActive ? 'ABORT_AGENT' : 'INITIALIZE_AGENT'} ]
            </button>
          )}
        </div>

        {/* SYSTEMS & TIME (RIGHT) */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 font-mono text-[10px] text-green-800">
            <div className="flex flex-col items-end">
              <span className="tracking-widest opacity-50">PARIS/CET</span>
              <span className="text-neon-green font-bold">{formatTime(time)}</span>
            </div>
            <div className="flex flex-col items-end border-l border-green-950 pl-4">
              <span className="tracking-widest opacity-50">NY/EST</span>
              <span className="text-neon-green font-bold">{new Date(time.getTime() - 6 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          </div>

          <button
            onClick={() => setIsEngineOpen(!isEngineOpen)}
            className={`px-3 py-1 text-[10px] font-bold tracking-widest border transition-colors ${
              isEngineOpen ? 'bg-neon-green text-black border-neon-green' : 'text-green-600 border-green-900 hover:text-neon-green hover:border-green-600'
            }`}
          >
            [ {isEngineOpen ? 'CLOSE_ENGINE' : 'ENGINE_ROOM'} ]
          </button>
        </div>
      </div>

      {/* MARKET CLOSED BANNER */}
      {marketStatus && marketStatus.status !== 'open' && (
        <div className="mt-3 flex items-center gap-3 border border-yellow-900/50 bg-yellow-950/10 px-3 py-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/70"></div>
          <span className="text-[9px] font-bold tracking-[0.25em] text-yellow-600/80">
            MARKET_CLOSED — POSITION_MONITOR &amp; LLM_CALLS SUSPENDED
          </span>
          <span className="ml-auto text-[9px] font-mono text-yellow-900/70">
            OPENS_IN: {timeUntil}
          </span>
        </div>
      )}

      {/* ENGINE ROOM PANEL (COLLAPSIBLE) */}
      {isEngineOpen && llmSettings && (
        <div className="mt-4 grid grid-cols-12 gap-4 border border-green-900/30 bg-green-950/5 p-3 rounded-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-[9px] uppercase tracking-[0.2em] text-green-900 font-bold">LLM_Provider</label>
            <select
              value={llmSettings.provider}
              onChange={(e) => onProviderChange?.(e.target.value)}
              className="bg-black border border-green-900 text-neon-green text-[10px] px-2 py-1 outline-none hover:border-green-700 transition-colors"
            >
              <option value="grok">xAI_Grok</option>
              <option value="local">LM_Studio</option>
            </select>
          </div>

          <div className="col-span-4 flex flex-col gap-1">
            <label className="text-[9px] uppercase tracking-[0.2em] text-green-900 font-bold">Neural_Model_Core</label>
            {llmSettings.provider === 'grok' ? (
              <input
                value={llmSettings.grok_model}
                onChange={(e) => onGrokModelChange?.(e.target.value)}
                placeholder={llmSettings.recommended_grok_model || 'x-ai/grok-4.1-fast'}
                className="bg-black border border-green-900 text-neon-green text-[10px] px-2 py-1 outline-none w-full hover:border-green-700 transition-colors"
              />
            ) : (
              <select
                value={llmSettings.local_model}
                onChange={(e) => onLocalModelChange?.(e.target.value)}
                className="bg-black border border-green-900 text-neon-green text-[10px] px-2 py-1 outline-none w-full hover:border-green-700 transition-colors"
              >
                {!localModels.some((model) => model.key === llmSettings.local_model) && llmSettings.local_model && (
                  <option value={llmSettings.local_model}>{llmSettings.local_model} (*)</option>
                )}
                {localModels.length > 0 ? (
                  localModels.map((model) => (
                    <option key={model.key} value={model.key}>
                      {model.display_name}{model.loaded ? ' (ACTIVE)' : ''}
                    </option>
                  ))
                ) : (
                  <option value={llmSettings.local_model}>SCANNING_FOR_LOCAL_CORES...</option>
                )}
              </select>
            )}
          </div>
          
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-[9px] uppercase tracking-[0.2em] text-green-900 font-bold">Audit_Frequency</label>
            <select
              value={llmSettings.position_monitor_interval_seconds || 60}
              onChange={(e) => onIntervalChange?.(parseInt(e.target.value))}
              className="bg-black border border-green-900 text-neon-green text-[10px] px-2 py-1 outline-none hover:border-green-700 transition-colors"
            >
              <option value={30}>30_SECONDS</option>
              <option value={60}>01_MINUTE</option>
              <option value={300}>05_MINUTES</option>
              <option value={600}>10_MINUTES</option>
              <option value={1800}>30_MINUTES</option>
            </select>
          </div>

          <div className="col-span-4 flex items-end gap-2">
            {llmSettings.provider === 'local' && onRefreshModels && (
              <button
                onClick={onRefreshModels}
                disabled={modelsLoading}
                className="flex-1 py-1 text-[10px] font-bold tracking-widest border border-green-800 text-green-700 hover:text-neon-green hover:border-green-600 transition-all disabled:opacity-30"
              >
                {modelsLoading ? 'RE-SCANNING...' : 'SYNC_LOCAL_CORES'}
              </button>
            )}

            {onApplyModelSettings && (
              <button
                onClick={onApplyModelSettings}
                className="flex-1 py-1 text-[10px] font-bold tracking-widest border border-neon-green bg-green-900/20 text-neon-green hover:bg-neon-green hover:text-black transition-all"
              >
                ENGAGE_CONFIG
              </button>
            )}
          </div>

          {/* BOT BEHAVIOR SUB-PANEL */}
          <div className="col-span-12 mt-2 pt-2 border-t border-green-900/20 grid grid-cols-12 gap-4">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-[0.2em] text-green-900 font-bold">Take_Profit %</label>
              <input
                type="number"
                step="0.5"
                value={(llmSettings.take_profit_percentage || 0.05) * 100}
                onChange={(e) => onSettingsChange?.({ take_profit_percentage: parseFloat(e.target.value) / 100 })}
                className="bg-black border border-green-900 text-neon-green text-[10px] px-2 py-1 outline-none hover:border-green-700 transition-colors"
              />
            </div>
            
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-[0.2em] text-green-900 font-bold">Stop_Loss %</label>
              <input
                type="number"
                step="0.5"
                value={(llmSettings.stop_loss_percentage || -0.03) * 100}
                onChange={(e) => onSettingsChange?.({ stop_loss_percentage: parseFloat(e.target.value) / 100 })}
                className="bg-black border border-green-900 text-neon-green text-[10px] px-2 py-1 outline-none hover:border-green-700 transition-colors"
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-[0.2em] text-green-900 font-bold">Max_Drawdown %</label>
              <input
                type="number"
                step="0.5"
                value={(llmSettings.daily_drawdown_threshold || -0.03) * 100}
                onChange={(e) => onSettingsChange?.({ daily_drawdown_threshold: parseFloat(e.target.value) / 100 })}
                className="bg-black border border-green-900 text-neon-green text-[10px] px-2 py-1 outline-none hover:border-green-700 transition-colors"
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-[0.2em] text-green-900 font-bold">Web_Research</label>
              <select
                value={llmSettings.web_research_enabled ? 'true' : 'false'}
                onChange={(e) => onSettingsChange?.({ web_research_enabled: e.target.value === 'true' })}
                className="bg-black border border-green-900 text-neon-green text-[10px] px-2 py-1 outline-none hover:border-green-700 transition-colors"
              >
                <option value="true">ENABLED</option>
                <option value="false">DISABLED</option>
              </select>
            </div>

            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-[0.2em] text-green-900 font-bold">Res_Tickers</label>
              <input
                type="number"
                value={llmSettings.web_research_max_tickers || 3}
                onChange={(e) => onSettingsChange?.({ web_research_max_tickers: parseInt(e.target.value) })}
                className="bg-black border border-green-900 text-neon-green text-[10px] px-2 py-1 outline-none hover:border-green-700 transition-colors"
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-[0.2em] text-green-900 font-bold">Res_Days</label>
              <input
                type="number"
                value={llmSettings.web_research_days || 3}
                onChange={(e) => onSettingsChange?.({ web_research_days: parseInt(e.target.value) })}
                className="bg-black border border-green-900 text-neon-green text-[10px] px-2 py-1 outline-none hover:border-green-700 transition-colors"
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
