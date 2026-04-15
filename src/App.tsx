import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react'
import axios from 'axios'
import { useWebSocket } from './context/useWebSocket'
import { Toaster, toast } from 'react-hot-toast'
import DashboardHeader from './components/DashboardHeader'
import ActiveHoldings from './components/ActiveHoldings'
import PortfolioBalance from './components/PortfolioBalance'
import TransactionsTable from './components/TransactionsTable'
import LogPanel from './components/LogPanel'
import LiveTicker from './components/LiveTicker'

const PerformanceChart = lazy(() => import('./components/PerformanceChart'))

interface PerformancePoint {
  date: string
  equity: number
  pnl?: number
}

interface BenchmarkPoint {
  date: string
  close: number
}

type LivePoint = { ts: number; equity: number; pnl: number }

type LlmSettings = {
  provider: string
  grok_model: string
  local_model: string
  local_url: string
  active_engine: string
  recommended_grok_model?: string
  openrouter_available?: boolean
  position_monitor_interval_seconds?: number
}

type LocalModel = {
  key: string
  display_name: string
  loaded?: boolean
}

type LocalModelsPayload = {
  local_models?: string[]
  local_models_detail?: LocalModel[]
  recommended_grok_model?: string
}

const pickPreferredLocalModel = (models: LocalModel[]) => {
  if (!models.length) return ''
  return models.find((model) => model.loaded)?.key || models[0].key
}

const normalizeModels = (payload: LocalModelsPayload): LocalModel[] => {
  const rawModels = Array.isArray(payload.local_models_detail) && payload.local_models_detail.length > 0
    ? payload.local_models_detail
    : (Array.isArray(payload.local_models) ? payload.local_models : []);

  return rawModels.map((m: any) => {
    if (typeof m === 'string') {
      return { key: m, display_name: m, loaded: false };
    }
    return {
      key: m.key || m.id || '',
      display_name: m.display_name || m.name || m.id || m.key || '',
      loaded: !!m.loaded
    };
  });
};


const isShortRange = (range: string) => range === '5S' || range === '15S' || range === '30S' || range === '1m' || range === '5m'

const rangeToMs = (range: string) => {
  switch (range) {
    case '5S':
      return 5_000
    case '15S':
      return 15_000
    case '30S':
      return 30_000
    case '1m':
      return 60_000
    case '5m':
      return 5 * 60_000
    default:
      return 0
  }
}


function App() {
  const {
    portfolio,
    marketStatus,
    agentLogs,
    transactions,
    botActive,
    qqqChange
  } = useWebSocket()

  const [timeRange, setTimeRange] = useState<string>("1D")
  const [httpPerformance, setHttpPerformance] = useState<PerformancePoint[]>([])
  const [benchmark, setBenchmark] = useState<BenchmarkPoint[]>([])
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])
  const [holdingsExpanded, setHoldingsExpanded] = useState(false)
  const [llmSettings, setLlmSettings] = useState<LlmSettings>({
    provider: 'grok',
    grok_model: 'x-ai/grok-4.1-fast',
    local_model: 'local-model',
    local_url: 'http://host.docker.internal:1234/v1',
    active_engine: 'grok:x-ai/grok-4.1-fast',
    recommended_grok_model: 'x-ai/grok-4.1-fast',
    openrouter_available: false,
  })
  const [localModels, setLocalModels] = useState<LocalModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)

  const [livePoints, setLivePoints] = useState<LivePoint[]>([])
  const latestEquityRef = useRef<number | null>(null)
  const latestInitialRef = useRef<number | null>(null)

  const handleSelectPosition = (symbol: string, checked: boolean) => {
    setSelectedPositions(prev =>
      checked ? [...prev, symbol] : prev.filter(s => s !== symbol)
    )
  }

  const loadLocalModels = async (localUrl: string) => {
    setModelsLoading(true)
    try {
      const response = await axios.get('http://localhost:8000/settings/llm/models', {
        params: { local_url: localUrl },
      })
      const payload: LocalModelsPayload = response.data

      const nextModels = normalizeModels(payload)
      setLocalModels(nextModels)

      const preferredModel = pickPreferredLocalModel(nextModels)
      if (preferredModel) {
        setLlmSettings((prev) => {
          if (prev.provider !== 'local') return prev
          const modelExists = nextModels.some((model: LocalModel) => model.key === prev.local_model)
          return modelExists ? prev : { ...prev, local_model: preferredModel }
        })
      }

      setLlmSettings((prev) => ({
        ...prev,
        recommended_grok_model: payload.recommended_grok_model ?? prev.recommended_grok_model,
      }))
    } catch (error) {
      console.error('Failed to load LM Studio models', error)
      setLocalModels([])
    } finally {
      setModelsLoading(false)
    }
  }

  const loadLlmSettings = async () => {
    try {
      const res = await axios.get('http://localhost:8000/settings/llm')
      const nextSettings = { ...llmSettings, ...res.data }
      setLlmSettings(nextSettings)
      await loadLocalModels(nextSettings.local_url)
    } catch (error) {
      console.error('Failed to load LLM settings', error)
    }
  }

  const saveLlmSettings = async () => {
    try {
      // 1. Save settings to our backend as usual
      const res = await axios.post('http://localhost:8000/settings/llm', {
        provider: llmSettings.provider,
        grok_model: llmSettings.grok_model,
        local_model: llmSettings.local_model,
        local_url: llmSettings.local_url,
        position_monitor_interval_seconds: llmSettings.position_monitor_interval_seconds,
      })

      const nextSettings = { ...llmSettings, ...res.data }
      setLlmSettings(nextSettings)

      // 2. If it's LM Studio, trigger the LOAD model API
      if (llmSettings.provider === 'local' && llmSettings.local_model) {
        toast.loading(`Loading ${llmSettings.local_model} in LM Studio...`, { id: 'lms-load' })
        try {
          await axios.post('http://localhost:8000/api/v1/models/load', {
            model: llmSettings.local_model,
            // You can add default parameters here or expose them in UI later
            context_length: 26000,
            flash_attention: true
          })
          toast.success(`${llmSettings.local_model} loaded successfully`, { id: 'lms-load' })
        } catch (loadErr: any) {
          console.error('Failed to load model in LM Studio', loadErr)
          toast.error(`LM Studio error: ${loadErr.response?.data?.detail || loadErr.message}`, { id: 'lms-load' })
        }
      }

      await loadLocalModels(nextSettings.local_url)
      toast.success(`LLM switched to ${res.data.active_engine}`)
    } catch (error) {
      console.error('Failed to update LLM settings', error)
      toast.error('Failed to update model settings')
    }
  }

  useEffect(() => {
    loadLlmSettings()
    // initial settings bootstrapping only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (llmSettings.provider !== 'local') return

    let cancelled = false

    const refreshLocalModels = async () => {
      try {
        setModelsLoading(true)
        const proxyResponse = await axios.get('http://localhost:8000/settings/llm/models', {
          params: { local_url: llmSettings.local_url },
        })
        const payload: LocalModelsPayload = proxyResponse.data

        if (cancelled) return
        const nextModels = normalizeModels(payload)
        setLocalModels(nextModels)
        const preferredModel = pickPreferredLocalModel(nextModels)
        if (preferredModel) {
          setLlmSettings((prev) => {
            const modelExists = nextModels.some((model: LocalModel) => model.key === prev.local_model)
            return modelExists ? prev : { ...prev, local_model: preferredModel }
          })
        }
        setLlmSettings((prev) => ({
          ...prev,
          recommended_grok_model: payload.recommended_grok_model ?? prev.recommended_grok_model,
        }))
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to refresh LM Studio models', error)
          setLocalModels([])
        }
      } finally {
        if (!cancelled) setModelsLoading(false)
      }
    }

    refreshLocalModels()

    return () => {
      cancelled = true
    }
  }, [llmSettings.provider, llmSettings.local_url])


  useEffect(() => {
    if (isShortRange(timeRange)) return

    let cancelled = false

    const fetchPerformance = async () => {
      try {
        const [perfRes, benchRes] = await Promise.all([
          axios.get(`http://localhost:8000/performance?period=${timeRange}`),
          axios.get(`http://localhost:8000/benchmark?symbol=QQQ&period=${timeRange}`),
        ])

        if (cancelled) return

        setHttpPerformance(Array.isArray(perfRes.data) ? perfRes.data.slice(-200) : [])
        setBenchmark(Array.isArray(benchRes.data) ? benchRes.data : [])
      } catch (error) {
        // Backend may be restarting; keep last known data.
        console.error('Error fetching performance', error)
      }
    }

    fetchPerformance()
    const interval = setInterval(fetchPerformance, 5000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [timeRange])

  // Remove unnecessary effect that synchronously clears benchmark
  // Instead, handle benchmark as a derived value in useMemo below

  useEffect(() => {
    if (!portfolio) return
    latestEquityRef.current = portfolio.equity
    latestInitialRef.current = portfolio.initial_capital || portfolio.equity
  }, [portfolio])

  useEffect(() => {
    const interval = setInterval(() => {
      const equity = latestEquityRef.current
      const initial = latestInitialRef.current
      if (equity == null || initial == null) return

      const ts = Date.now()
      const pnl = initial === 0 ? 0 : ((equity - initial) / initial) * 100

      setLivePoints((prev) => {
        const next = [...prev, { ts, equity, pnl }]
        const cutoff = ts - 2 * 60 * 60_000 // keep 2 hours of 1s samples
        const pruned = next.filter((p) => p.ts >= cutoff)
        return pruned.length > 10_000 ? pruned.slice(-10_000) : pruned
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const performance: PerformancePoint[] = useMemo(() => {
    if (!isShortRange(timeRange)) return httpPerformance

    const windowMs = rangeToMs(timeRange)
    const now = livePoints.length > 0 ? livePoints[livePoints.length - 1].ts : 0
    const cutoff = now - windowMs
    return livePoints
      .filter((p) => p.ts >= cutoff)
      .slice(-400)
      .map((p) => ({
        date: new Date(p.ts).toISOString(),
        equity: p.equity,
        pnl: p.pnl,
      }))
  }, [httpPerformance, livePoints, timeRange])


  const toggleBot = async () => {
    try {
      if (botActive) {
        // STOP AGENT
        await axios.post('http://localhost:8000/bot/stop')
        toast.success('Agent Stopped', {
          style: { background: '#000', color: '#f00', border: '1px solid #f00' },
        })
      } else {
        // START AGENT (Enable + Run Once)
        await axios.post('http://localhost:8000/bot/start')

        // Trigger immediate run
        await axios.post('http://localhost:8000/run-agent')

        toast.success('Agent Started & Executing...', {
          style: { background: '#000', color: '#0f0', border: '1px solid #0f0' },
          iconTheme: { primary: '#0f0', secondary: '#000' },
        })
      }
    } catch (error) {
      console.error("Error toggling bot", error)
      toast.error('Failed to toggle bot', {
        style: { background: '#000', color: '#f00', border: '1px solid #f00' },
      })
    }
  }

  // Transform transactions and logs for the LogPanel
  const combinedLogs = [
    ...transactions.map(tx => ({
      type: 'NEURAL',
      time: new Date(tx.timestamp).toLocaleString(),
      content: `Executed ${tx.side} ${tx.qty} ${tx.symbol} @ $${tx.price}. Reason: ${tx.reason}`,
      rawTime: new Date(tx.timestamp).getTime()
    })),
    ...agentLogs.map(log => ({
      type: 'REFLECTIONS',
      time: new Date(log.timestamp).toLocaleString(),
      content: `[${log.title}] ${log.content}`,
      rawTime: new Date(log.timestamp).getTime()
    }))
  ].sort((a, b) => b.rawTime - a.rawTime);

  const logs = combinedLogs.map(({ type, time, content }) => ({ type, time, content }))

  return (
    <div className="min-h-screen bg-black text-neon-green p-6 pb-16 font-mono selection:bg-neon-green selection:text-black">
      <Toaster position="bottom-right" />
      <DashboardHeader
        botActive={botActive}
        marketStatus={marketStatus}
        onToggleBot={toggleBot}
        llmSettings={llmSettings}
        localModels={localModels}
        modelsLoading={modelsLoading}
        onProviderChange={(provider) => setLlmSettings((prev) => ({ ...prev, provider }))}
        onGrokModelChange={(grok_model) => setLlmSettings((prev) => ({ ...prev, grok_model }))}
        onLocalModelChange={(local_model) => setLlmSettings((prev) => ({ ...prev, local_model }))}
        onIntervalChange={(seconds) => setLlmSettings((prev) => ({ ...prev, position_monitor_interval_seconds: seconds }))}
        onRefreshModels={() => loadLocalModels(llmSettings.local_url)}
        onApplyModelSettings={saveLlmSettings}
      />

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column (Chart) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="h-96">
            <Suspense fallback={<div className="h-full flex items-center justify-center border border-neon-green/30 text-green-700">INITIALIZING VISUALIZATION...</div>}>
              <PerformanceChart
                data={performance}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                qqqChange={qqqChange}
                benchmark={benchmark}
              />
            </Suspense>
          </div>

          <PortfolioBalance
            equity={portfolio?.equity || 0}
            buyingPower={portfolio?.buying_power || 0}
            initialCapital={portfolio?.initial_capital || 0}
            unrealizedPL={portfolio?.positions.reduce((acc, p) => acc + p.unrealized_pl, 0) || 0}
          />

          <div className="h-72">
            <TransactionsTable transactions={transactions} />
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="border border-neon-green/20 bg-black/70 p-4 rounded flex items-center justify-between text-xs text-green-700">
            <div>
              <div className="uppercase tracking-[0.2em] text-green-800">Active engine</div>
              <div className="text-neon-green font-bold mt-1">{llmSettings.active_engine}</div>
            </div>
            <div className="text-right">
              <div className="uppercase tracking-[0.2em] text-green-800">Recommended Grok</div>
              <div className="text-white font-mono mt-1">{llmSettings.recommended_grok_model || 'x-ai/grok-4.1-fast'}</div>
            </div>
          </div>

          <div className={`${holdingsExpanded ? 'h-96' : 'h-72'} flex flex-col gap-2`}>
            <ActiveHoldings
              positions={portfolio?.positions || []}
              selected={selectedPositions}
              onSelect={handleSelectPosition}
              onSelectAll={(symbols, checked) => setSelectedPositions(checked ? symbols : [])}
              expanded={holdingsExpanded}
              onToggleExpanded={() => setHoldingsExpanded((v) => !v)}
            />
            <button
              className="mt-2 px-4 py-2 bg-neon-green text-black font-bold rounded disabled:opacity-40 border border-neon-green hover:bg-green-400 transition-colors"
              disabled={selectedPositions.length === 0}
              onClick={async () => {
                try {
                  const res = await axios.post('http://localhost:8000/positions/close', {
                    symbols: selectedPositions
                  })
                  const { results } = res.data
                  type SellResult = { symbol: string; status: string; order_id?: string; error?: string }
                  const success = (results as SellResult[]).filter((r) => r.status === 'submitted').map((r) => r.symbol)
                  const failed = (results as SellResult[]).filter((r) => r.status !== 'submitted')
                  if (success.length > 0) {
                    toast.success(`Sell order submitted for: ${success.join(', ')}`)
                  }
                  if (failed.length > 0) {
                    toast.error(`Failed to sell: ${failed.map((f) => f.symbol).join(', ')}`)
                  }
                  setSelectedPositions([])
                } catch {
                  toast.error('Sell request failed')
                }
              }}
            >
              Sell Position{selectedPositions.length > 1 ? 's' : ''}
            </button>
          </div>

          <div className="flex-1 min-h-96">
            <LogPanel logs={logs} />
          </div>
        </div>
      </div>

      {/* Footer / Status Bar */}
      <div className="mt-6 flex justify-between text-xs text-green-800 border-t border-green-900/30 pt-2">
        <div className="flex gap-4">
          <span>Mode: {botActive ? 'AUTONOMOUS' : 'MANUAL'}</span>
          <span>Session: {new Date().toISOString()}</span>
        </div>
      </div>
      <LiveTicker />
    </div>
  )
}

export default App
