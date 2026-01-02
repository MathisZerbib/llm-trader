import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot
} from 'recharts'
import { Percent, DollarSign, Bomb, Activity } from 'lucide-react'

type PerformanceTooltipProps = {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
}

function isShortRange(timeRange?: string) {
  return timeRange === '5S' || timeRange === '15S' || timeRange === '30S' || timeRange === '1m' || timeRange === '5m'
}

function formatXAxisTick(label: string, timeRange: string) {
  if (!isShortRange(timeRange)) return label
  const d = new Date(label)
  if (Number.isNaN(d.getTime())) return label
  return d.toLocaleTimeString('en-US', { hour12: false })
}

function formatTooltipLabel(label: string, timeRange?: string) {
  if (!isShortRange(timeRange)) return label
  const d = new Date(label)
  if (Number.isNaN(d.getTime())) return label
  return d.toLocaleTimeString('en-US', { hour12: false })
}

// Custom Tooltip
const PerformanceTooltip: React.FC<PerformanceTooltipProps & { modelName?: string, data?: PerformancePoint[], viewMode?: 'equity' | 'pnl', timeRange?: string }> = ({ active, payload, label, modelName, data, viewMode, timeRange }) => {
  if (!active || !payload || !payload.length || !data || !viewMode) return null;
  const idx = data.findIndex(d => d.date === label);
  if (idx === -1) return null;
  const point = data[idx];
  // Calculate percentage performance relative to the first point
  const baseEquity = data[0]?.equity || 1;
  const dollar = viewMode === 'equity' ? point.equity : (point.pnl ?? 0);
  const percent = viewMode === 'equity' ? ((point.equity - baseEquity) / baseEquity) * 100 : (point.pnl ?? 0);
  return (
    <div className="bg-black border border-neon-green p-2 text-xs shadow-[0_0_10px_rgba(0,255,0,0.2)] font-mono min-w-[160px]">
      <p className="text-gray-400 mb-1">{label ? formatTooltipLabel(label, timeRange) : ''}</p>
      <p className="text-neon-green font-bold mb-1">{modelName ? `${modelName} Performance:` : ''}</p>
      <div className="flex flex-col gap-1">
        <span><span className="text-green-400">$</span> {dollar.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        <span><span className="text-green-400">%</span> {percent > 0 ? '+' : ''}{percent.toLocaleString(undefined, { maximumFractionDigits: 2 })}%</span>
      </div>
    </div>
  );
}

// Custom Dot for the end of the line (Grok Logo placeholder)
interface CustomDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  dataLength: number;
}

const CustomDot: React.FC<CustomDotProps> = (props) => {
  const { cx, cy, index, dataLength } = props;
  // Only render for the last point
  if (index === dataLength - 1) {
    const uniqueId = `grok-logo-clip-${index}`;
    return (
      <g>
        <defs>
            <clipPath id={uniqueId}>
                <circle cx={cx} cy={cy} r={10} />
            </clipPath>
        </defs>
        <circle cx={cx} cy={cy} r={12} fill="white" stroke="#00ff00" strokeWidth={1} />
        <image
            href="/assets/grok-ai-icon.webp"
            x={(cx ?? 0) - 10}
            y={(cy ?? 0) - 10}
            width={20}
            height={20}
            clipPath={`url(#${uniqueId})`}
        />
      </g>
    );
  }
  return null;
};

interface PerformancePoint {
  date: string
  equity: number
  pnl?: number
}

interface BenchmarkPoint {
  date: string
  close: number
}

interface PerformanceChartProps {
  data: PerformancePoint[]
  timeRange: string
  onTimeRangeChange: (range: string) => void
  qqqChange: number
  benchmark?: BenchmarkPoint[]
}

type ChartPoint = PerformancePoint & { qqq_equity?: number }

function toEpochMs(dateStr: string) {
  const d = new Date(dateStr)
  const t = d.getTime()
  return Number.isNaN(t) ? null : t
}

function addBenchmarkSeries(data: PerformancePoint[], benchmark: BenchmarkPoint[] | undefined, fallbackQqqChange: number): ChartPoint[] {
  if (!data.length) return []

  if (!benchmark || benchmark.length === 0) {
    // Fallback: approximate line (previous behavior)
    const base = data[0].equity
    return data.map((pt, idx) => {
      const denom = Math.max(1, data.length - 1)
      const percent = (fallbackQqqChange / 100) * (idx / denom)
      return { ...pt, qqq_equity: base * (1 + percent) }
    })
  }

  const baseEquity = data[0].equity
  const benchWithTs = benchmark
    .map((b) => ({ ...b, ts: toEpochMs(b.date) }))
    .filter((b): b is BenchmarkPoint & { ts: number } => b.ts !== null)
    .sort((a, b) => a.ts - b.ts)

  if (benchWithTs.length === 0) {
    return data.map((pt) => ({ ...pt }))
  }

  const benchByDate = new Map(benchmark.map((b) => [b.date, b.close]))

  // Prefer base close that matches the first portfolio point (so series lines up)
  const baseCloseMatched = benchByDate.get(data[0].date)
  const baseClose = baseCloseMatched ?? benchWithTs[0].close
  const safeBaseClose = baseClose === 0 ? 1 : baseClose

  let j = 0
  return data.map((pt) => {
    const direct = benchByDate.get(pt.date)
    let close = direct

    if (close === undefined) {
      const ptTs = toEpochMs(pt.date)
      if (ptTs !== null) {
        while (j + 1 < benchWithTs.length && benchWithTs[j + 1].ts <= ptTs) j++
        const a = benchWithTs[j]
        const b = benchWithTs[Math.min(j + 1, benchWithTs.length - 1)]
        close = Math.abs(a.ts - ptTs) <= Math.abs(b.ts - ptTs) ? a.close : b.close
      }
    }

    if (close === undefined) return { ...pt }
    return {
      ...pt,
      qqq_equity: baseEquity * (close / safeBaseClose),
    }
  })
}

const PerformanceChart: React.FC<PerformanceChartProps> = React.memo(({ data, timeRange, onTimeRangeChange, qqqChange, benchmark }) => {
  const ranges = ['5S', '15S', '30S', '1m', '5m', '1D', '1W', '1M', '3M', '1Y', 'ALL']
  const [viewMode, setViewMode] = React.useState<'equity' | 'pnl'>('equity')
  const [currentTime, setCurrentTime] = React.useState(new Date().toLocaleTimeString('en-US', { hour12: false }));

  React.useEffect(() => {
    let isMounted = true;
    const timer = setInterval(() => {
      if (isMounted) {
        setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
      }
    }, 1000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // Mock data for the overlay box - memoized
  const marketStats = React.useMemo(() => [
    { name: 'NASDAQ (QQQ)', value: `${qqqChange > 0 ? '+' : ''}${qqqChange}%`, color: qqqChange >= 0 ? 'text-neon-green' : 'text-red-500' },
    { name: 'Model', value: 'Grok-1', color: 'text-white' },
  ], [qqqChange]);
  const modelName = 'Grok-1';

  // Prepare data with QQQ benchmark line - memoized
  const chartData = React.useMemo(() => addBenchmarkSeries(data, benchmark, qqqChange), [data, benchmark, qqqChange]);

  return (
    <div className="h-full bg-black border border-neon-green/30 flex flex-col relative overflow-hidden font-mono">
      
      {/* Top Green Bar Header */}
      <div className="bg-neon-green text-black px-2 py-1 flex justify-between items-center z-20">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tracking-wider">{'>>'} REAL-TIME PERFORMANCE (%)</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center gap-2 p-2 border-b border-neon-green/20 bg-black/80 z-20">
        <div className="flex gap-1">
          <button 
            onClick={() => setViewMode('pnl')}
            className={`p-1.5 rounded-sm transition-all ${viewMode === 'pnl' ? 'bg-neon-green text-black' : 'bg-green-900/20 text-green-600 hover:text-neon-green'}`}
          >
            <Percent size={14} />
          </button>
          <button 
            onClick={() => setViewMode('equity')}
            className={`p-1.5 rounded-sm transition-all ${viewMode === 'equity' ? 'bg-neon-green text-black' : 'bg-green-900/20 text-green-600 hover:text-neon-green'}`}
          >
            <DollarSign size={14} />
          </button>
          <button className="p-1.5 rounded-sm bg-green-900/20 text-green-600 hover:text-red-500 transition-colors">
            <Bomb size={14} />
          </button>
        </div>

        <div className="h-4 w-px bg-neon-green/20 mx-2"></div>

        <div className="flex gap-1">
          {ranges.map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              className={`px-2 py-0.5 text-[10px] font-bold transition-all border border-transparent ${
                timeRange === range
                  ? 'text-neon-green border-neon-green bg-green-900/20'
                  : 'text-green-800 hover:text-neon-green'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Overlay Stats Box */}
      <div className="absolute top-24 left-6 z-10 border border-neon-green bg-black/90 p-2 shadow-[0_0_15px_rgba(0,255,0,0.1)] max-w-[200px]">
        <div className="text-neon-green text-xs font-bold mb-2 border-b border-neon-green/30 pb-1">
          TIME: {currentTime}
        </div>
        <div className="space-y-1">
          {marketStats.map((stat) => (
            <div key={stat.name} className="flex justify-between text-[10px] gap-4">
              <span className={stat.color}>{stat.name}:</span>
              <span className={stat.color}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 w-full min-h-0 relative">
        {/* Zero Line for PnL */}
        {viewMode === 'pnl' && (
          <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-700 pointer-events-none"></div>
        )}

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff00" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#00ff00" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2e1a" vertical={false} horizontal={false} />
              {/* Vertical Grid Lines only */}
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2e1a" vertical={true} horizontal={false} />
              
              <XAxis 
                dataKey="date" 
                stroke="#1a4d1a" 
                tick={{ fill: '#1a4d1a', fontSize: 10, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                minTickGap={50}
                tickFormatter={(value) => formatXAxisTick(String(value), timeRange)}
              />
              <YAxis 
                stroke="#1a4d1a"
                tick={{ fill: '#1a4d1a', fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(value) => viewMode === 'pnl' ? `${value}` : `$${value.toLocaleString()}`}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                orientation="right"
              />
              <Tooltip content={<PerformanceTooltip modelName={modelName} data={data} viewMode={viewMode} timeRange={timeRange} />} cursor={{ stroke: viewMode === 'equity' ? '#00ff00' : '#22d3ee', strokeWidth: 1 }} />
              
              <Area 
                type="step" 
                dataKey={viewMode} 
                stroke={viewMode === 'equity' ? '#00ff00' : '#22d3ee'} 
                strokeWidth={2}
                fillOpacity={1} 
                fill={`url(#${viewMode === 'equity' ? 'colorEquity' : 'colorPnl'})`} 
                isAnimationActive={false}
                dot={(props) => <CustomDot {...props} dataLength={chartData.length} />}
              />
              {/* NASDAQ QQQ Comparison Dashed Line */}
              <Area
                type="step"
                dataKey="qqq_equity"
                stroke="#0088FF"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="none"
                isAnimationActive={false}
                dot={false}
                name="NASDAQ (QQQ)"
                legendType="line"
              />
              {/* NASDAQ Logo at the end of the dashed area line */}
              {chartData.length > 0 && chartData[chartData.length - 1].qqq_equity !== undefined && (
                <ReferenceDot
                  x={chartData[chartData.length - 1].date}
                  y={chartData[chartData.length - 1].qqq_equity as number}
                  r={0}
                  shape={(props) => {
                    const cx = props.cx;
                    const cy = props.cy;
                    const uniqueId = `nasdaq-logo-clip`;
                    return (
                      <g>
                        <defs>
                          <clipPath id={uniqueId}>
                            <circle cx={cx} cy={cy} r={10} />
                          </clipPath>
                        </defs>
                        <circle cx={cx} cy={cy} r={12} fill="white" stroke="#38bdf8" strokeWidth={2} />
                        <image
                          href="/assets/nasdaq.png"
                          x={cx - 10}
                          y={cy - 10}
                          width={20}
                          height={20}
                          clipPath={`url(#${uniqueId})`}
                          style={{ pointerEvents: 'none' }}
                        />
                      </g>
                    );
                  }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-green-800">
            <div className="text-center animate-pulse">
              <Activity size={48} className="mx-auto mb-4 opacity-50" />
              <p className="mb-2 font-mono">INITIALIZING DATA STREAM...</p>
            </div>
          </div>
        )}
      </div>

      {/* Decorative Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-5 z-0" 
           style={{ 
             backgroundImage: 'linear-gradient(#00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }}>
      </div>
    </div>
  )
})

export default PerformanceChart
