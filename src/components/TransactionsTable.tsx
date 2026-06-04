import { useState, useMemo } from 'react';
import { 
  computeTradePerformance, 
  getTxKey 
} from '../utils/tradeMatcher';
import type { TradeMatch } from '../utils/tradeMatcher';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Award, 
  Activity, 
  RotateCcw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import type { Transaction } from '../context/websocketTypes';

interface TransactionsTableProps {
  transactions: Transaction[]
}

export default function TransactionsTable({ transactions }: TransactionsTableProps) {
  // Filter/search states
  const [searchQuery, setSearchQuery] = useState('');
  const [sideFilter, setSideFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Tooltip state
  const [activeTooltip, setActiveTooltip] = useState<{
    match: TradeMatch;
    x: number;
    y: number;
  } | null>(null);

  const [hoveredReason, setHoveredReason] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // Compute FIFO matches and stats
  const { matchesMap, stats } = useMemo(() => {
    return computeTradePerformance(transactions);
  }, [transactions]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx, idx) => {
      // Search query filter (checks symbol and reason)
      const matchesSearch = 
        (tx.symbol || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (tx.reason || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      // Side filter
      const matchesSide = sideFilter === 'all' || (tx.side || '').toLowerCase() === sideFilter.toLowerCase();
      
      // Status filter
      const status = tx.status || 'unknown';
      const matchesStatus = statusFilter === 'all' || status.toLowerCase() === statusFilter.toLowerCase();

      // Trade Type filter (opening vs closing)
      const txKey = getTxKey(tx, idx);
      const isClosing = matchesMap.has(txKey);
      const isOpening = !isClosing && tx.status !== 'canceled' && tx.price > 0 && tx.qty > 0;
      const matchesType = 
        typeFilter === 'all' ||
        (typeFilter === 'closing' && isClosing) ||
        (typeFilter === 'opening' && isOpening);

      return matchesSearch && matchesSide && matchesStatus && matchesType;
    });
  }, [transactions, searchQuery, sideFilter, statusFilter, typeFilter, matchesMap]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSideFilter('all');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  const hasActiveFilters = searchQuery !== '' || sideFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all';

  return (
    <div className="border border-neon-green/20 p-5 bg-black/60 backdrop-blur-md rounded-xl flex flex-col h-full shadow-2xl relative">
      
      {/* 1. Dashboard Stats Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Realized P&L Card */}
        <div className={`p-4 border rounded-xl bg-slate-950/40 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 ${
          stats.totalPnL > 0 
            ? 'border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
            : stats.totalPnL < 0 
              ? 'border-red-500/20 hover:border-red-500/40 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]'
              : 'border-slate-800'
        }`}>
          <div className="flex justify-between items-center text-xs text-green-800 uppercase tracking-widest mb-1 font-bold">
            <span>REALIZED P&L</span>
            <DollarSign className="w-3.5 h-3.5 opacity-60" />
          </div>
          <div className={`text-xl font-extrabold font-mono tracking-tight ${
            stats.totalPnL >= 0 ? 'text-neon-green' : 'text-red-500'
          }`}>
            {stats.totalPnL >= 0 ? '+' : '-'}${Math.abs(stats.totalPnL).toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
            {stats.totalPnL >= 0 ? (
              <span className="text-neon-green font-semibold inline-flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                +{stats.totalPnLPercent.toFixed(2)}%
              </span>
            ) : (
              <span className="text-red-500 font-semibold inline-flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" />
                {stats.totalPnLPercent.toFixed(2)}%
              </span>
            )}
            <span className="opacity-70">closed return</span>
          </div>
        </div>

        {/* Win Rate Card */}
        <div className="p-4 border border-slate-800 rounded-xl bg-slate-950/40 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-neon-green/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.08)]">
          <div className="flex justify-between items-center text-xs text-green-800 uppercase tracking-widest mb-1 font-bold">
            <span>WIN RATE</span>
            <Percent className="w-3.5 h-3.5 opacity-60" />
          </div>
          <div className="text-xl font-extrabold font-mono text-white">
            {stats.winRate.toFixed(1)}%
          </div>
          <div className="w-full bg-slate-850 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-900/50">
            <div 
              className="bg-gradient-to-r from-green-500 to-neon-green h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats.winRate}%` }}
            />
          </div>
        </div>

        {/* Profit Factor Card */}
        <div className="p-4 border border-slate-800 rounded-xl bg-slate-950/40 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-neon-green/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.08)]">
          <div className="flex justify-between items-center text-xs text-green-800 uppercase tracking-widest mb-1 font-bold">
            <span>PROFIT FACTOR</span>
            <Award className="w-3.5 h-3.5 opacity-60" />
          </div>
          <div className="text-xl font-extrabold font-mono text-white">
            {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            <span className="font-semibold text-gray-300">{stats.totalTrades}</span> closed trades ({stats.winningTrades}W - {stats.losingTrades}L)
          </div>
        </div>

        {/* Avg Win/Loss Card */}
        <div className="p-4 border border-slate-800 rounded-xl bg-slate-950/40 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-neon-green/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.08)]">
          <div className="flex justify-between items-center text-xs text-green-800 uppercase tracking-widest mb-1 font-bold">
            <span>AVG WIN / LOSS</span>
            <Activity className="w-3.5 h-3.5 opacity-60" />
          </div>
          <div className="text-sm font-extrabold font-mono flex items-center gap-1.5 mt-0.5">
            <span className="text-neon-green">+${stats.avgWin.toFixed(2)}</span>
            <span className="text-slate-650">/</span>
            <span className="text-red-500">-${stats.avgLoss.toFixed(2)}</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-2">
            Ratio: <span className="font-bold text-gray-350">{stats.avgLoss > 0 ? (stats.avgWin / stats.avgLoss).toFixed(2) : stats.avgWin > 0 ? '∞' : '0.00'}x</span>
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center justify-between mb-4 bg-slate-950/40 border border-slate-800/60 p-3 rounded-lg">
        
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-green-800" />
          <input
            type="text"
            placeholder="Search symbol or trade reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/60 border border-slate-850 pl-9 pr-4 py-1.5 text-xs text-neon-green placeholder-green-900/60 rounded-md focus:outline-none focus:border-neon-green/40 font-mono"
          />
        </div>

        {/* Filter Selectors */}
        <div className="flex flex-wrap gap-2 items-center text-xs">
          
          {/* Side filter */}
          <div className="flex items-center bg-black/60 border border-slate-850 px-2 py-1 rounded">
            <span className="text-green-800 font-bold uppercase tracking-wider mr-1 text-[10px]">Action:</span>
            <select
              value={sideFilter}
              onChange={(e) => setSideFilter(e.target.value)}
              className="bg-transparent text-neon-green border-none focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-slate-900">All</option>
              <option value="buy" className="bg-slate-900">Buy</option>
              <option value="sell" className="bg-slate-900">Sell</option>
            </select>
          </div>

          {/* Trade Type filter */}
          <div className="flex items-center bg-black/60 border border-slate-850 px-2 py-1 rounded">
            <span className="text-green-800 font-bold uppercase tracking-wider mr-1 text-[10px]">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-neon-green border-none focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-slate-900">All Trades</option>
              <option value="opening" className="bg-slate-900">Entries Only</option>
              <option value="closing" className="bg-slate-900">Realized Exits</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center bg-black/60 border border-slate-850 px-2 py-1 rounded">
            <span className="text-green-800 font-bold uppercase tracking-wider mr-1 text-[10px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-neon-green border-none focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-slate-900">All</option>
              <option value="filled" className="bg-slate-900">Filled</option>
              <option value="canceled" className="bg-slate-900">Canceled</option>
              <option value="new" className="bg-slate-900">Pending</option>
            </select>
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1 bg-red-950/20 border border-red-500/30 text-red-400 rounded hover:bg-red-950/40 hover:border-red-500/50 transition-colors flex items-center gap-1 font-bold text-[10px]"
            >
              <RotateCcw className="w-3 h-3" />
              RESET
            </button>
          )}
        </div>
      </div>

      {/* 3. Table Container */}
      <div className="flex-1 overflow-y-auto pr-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="text-green-700 border-b border-green-950/60 sticky top-0 bg-black/90 backdrop-blur-sm z-10 font-bold tracking-wider">
              <th className="py-2.5 pl-2">TIME</th>
              <th className="py-2.5">SYMBOL</th>
              <th className="py-2.5">ACTION</th>
              <th className="py-2.5 text-right">QTY</th>
              <th className="py-2.5 text-right">PRICE</th>
              <th className="py-2.5 text-center px-4">P&L / PERF</th>
              <th className="py-2.5">STATUS</th>
              <th className="py-2.5 pr-2">REASON</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-green-950/10">
            {filteredTransactions.map((tx, idx) => {
              const txKey = getTxKey(tx, idx);
              const match = matchesMap.get(txKey);

              return (
                <tr key={idx} className="hover:bg-green-950/5 group border-b border-green-950/5 transition-colors">
                  
                  {/* Timestamp */}
                  <td className="py-3 pl-2 text-neon-green/90 font-mono">
                    {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>

                  {/* Symbol */}
                  <td className="py-3 font-bold text-white font-mono">
                    <a 
                      href={`https://app.alpaca.markets/trade/${tx.symbol}?asset_class=stocks`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-neon-cyan hover:underline inline-flex items-center gap-0.5"
                    >
                      {tx.symbol}
                      <ExternalLink className="w-2.5 h-2.5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </td>

                  {/* Side */}
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide inline-flex items-center ${
                      tx.side?.toLowerCase() === 'buy'
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                        : tx.side?.toLowerCase() === 'sell'
                          ? 'bg-red-950/40 text-red-400 border border-red-500/20'
                          : 'bg-slate-900 text-white border border-slate-700'
                    }`}>
                      {(tx.side || '').toUpperCase()}
                    </span>
                  </td>

                  {/* Quantity */}
                  <td className="py-3 text-right text-gray-300 font-mono">{tx.qty}</td>

                  {/* Price */}
                  <td className="py-3 text-right text-neon-green/80 font-mono font-semibold">
                    {tx.price > 0 ? `$${tx.price.toFixed(2)}` : <span className="text-neon-amber text-[10px] font-bold">PENDING</span>}
                  </td>

                  {/* Realized P&L badge with interactive details */}
                  <td className="py-3 text-center px-4">
                    {match ? (
                      <div
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActiveTooltip({
                            match,
                            x: rect.left,
                            y: rect.bottom + window.scrollY + 6
                          });
                        }}
                        onMouseLeave={() => setActiveTooltip(null)}
                        className={`cursor-help px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 font-mono transition-all border ${
                          match.realizedPnL >= 0
                            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/30'
                            : 'bg-red-950/40 border-red-500/30 text-red-400 hover:bg-red-900/30'
                        }`}
                      >
                        {match.realizedPnL >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {match.realizedPnL >= 0 ? '+' : '-'}${Math.abs(match.realizedPnL).toFixed(2)}
                        <span className="opacity-75 font-normal ml-0.5">
                          ({match.realizedPnLPercent >= 0 ? '+' : ''}{match.realizedPnLPercent.toFixed(1)}%)
                        </span>
                      </div>
                    ) : (tx.status === 'filled' && tx.price > 0) ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-400 tracking-wide select-none">
                        ENTRY
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      tx.status === 'filled' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' :
                      tx.status === 'canceled' ? 'bg-red-950 text-red-400 border border-red-500/20' :
                      'bg-yellow-950 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {(tx.status || 'unknown').toUpperCase()}
                    </span>
                  </td>

                  {/* Reason with tooltip */}
                  <td 
                    className="py-3 text-gray-400 text-xs truncate max-w-[160px] cursor-help font-mono"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredReason({
                        text: tx.reason,
                        x: rect.left,
                        y: rect.bottom + window.scrollY + 6
                      });
                    }}
                    onMouseLeave={() => setHoveredReason(null)}
                  >
                    {tx.reason}
                  </td>
                </tr>
              );
            })}

            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500 font-mono">
                  {transactions.length === 0 ? 'No transactions yet' : 'No transactions match filters'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. FIFO Details Floating Tooltip */}
      {activeTooltip && (
        <div 
          className="fixed z-50 p-4 bg-slate-950 border border-neon-green/30 text-gray-250 text-xs max-w-xs rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] pointer-events-none font-mono"
          style={{ 
            left: Math.min(activeTooltip.x, window.innerWidth - 340), 
            top: activeTooltip.y 
          }}
        >
          <div className="flex items-center gap-1 text-[11px] font-bold text-neon-green border-b border-slate-800 pb-1.5 mb-2">
            <Activity className="w-3.5 h-3.5" />
            <span>REALIZED PERFORMANCE DETAILS</span>
          </div>
          
          <div className="space-y-1 mb-2.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Position Type:</span>
              <span className="font-bold text-white">{activeTooltip.match.isShort ? 'SHORT' : 'LONG'} EXIT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Avg Entry Price:</span>
              <span className="text-neon-cyan font-bold">${activeTooltip.match.avgOpenPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Exit Price:</span>
              <span className="text-white font-bold">${activeTooltip.match.closingTx.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Matched Quantity:</span>
              <span className="text-white font-bold">{activeTooltip.match.qty} shares</span>
            </div>
          </div>

          <div className="text-[10px] text-green-800 font-bold uppercase tracking-wider mb-1">Matched Entries:</div>
          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
            {activeTooltip.match.matches.map((m, idx) => (
              <div key={idx} className="flex items-start gap-1 bg-black/40 p-1.5 rounded border border-slate-900/60">
                <ChevronRight className="w-3 h-3 mt-0.5 text-neon-green" />
                <div className="flex-1">
                  <div className="flex justify-between text-white font-semibold">
                    <span>{m.qty} sh.</span>
                    <span>${m.tx.price.toFixed(2)}</span>
                  </div>
                  <div className="text-[9px] text-gray-500">
                    {new Date(m.tx.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. General hover tooltip for full reason description */}
      {hoveredReason && (
        <div 
          className="fixed z-50 px-3 py-2 bg-black border border-neon-green/30 text-neon-green text-xs max-w-xs rounded shadow-[0_0_15px_rgba(16,185,129,0.15)] pointer-events-none font-mono"
          style={{ 
            left: Math.min(hoveredReason.x, window.innerWidth - 300), 
            top: hoveredReason.y 
          }}
        >
          {hoveredReason.text}
        </div>
      )}
    </div>
  );
}
