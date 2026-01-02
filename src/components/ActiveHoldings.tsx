import React from 'react'

interface Position {
  symbol: string
  qty: number
  market_value: number
  unrealized_pl: number
  avg_cost?: number
  current_price?: number
}


interface ActiveHoldingsProps {
  positions: Position[]
  selected: string[]
  onSelect: (symbol: string, checked: boolean) => void
  expanded?: boolean
  onToggleExpanded?: () => void
  onSelectAll?: (symbols: string[], checked: boolean) => void
}


const ActiveHoldings: React.FC<ActiveHoldingsProps> = React.memo(({ positions, selected, onSelect, expanded, onToggleExpanded, onSelectAll }) => {
  const symbols = React.useMemo(() => positions.map((p) => p.symbol), [positions])
  const selectedInList = React.useMemo(() => selected.filter((s) => symbols.includes(s)), [selected, symbols])
  const allSelected = symbols.length > 0 && selectedInList.length === symbols.length
  const someSelected = selectedInList.length > 0 && !allSelected
  const selectAllRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    if (!selectAllRef.current) return
    selectAllRef.current.indeterminate = someSelected
  }, [someSelected])

  return (
    <div className="flex-1 min-h-0 border border-neon-green/30 bg-black/50 p-4 flex flex-col">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></span>
          ACTIVE HOLDINGS
        </h2>
        {onToggleExpanded && (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="px-2 py-1 text-[10px] font-bold tracking-widest border border-neon-green/40 text-neon-green hover:bg-green-900/20 transition-colors"
          >
            {expanded ? 'COLLAPSE' : 'EXPAND'}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {positions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-green-800 italic">
            <span>NO ACTIVE POSITIONS</span>
            <span className="text-xs mt-2">Waiting for signals...</span>
          </div>
        ) : (
          <table className="w-full text-sm text-left border-separate border-spacing-x-2">
            <thead className="text-xs text-green-700 uppercase border-b border-green-900/30 sticky top-0 bg-black z-10">
              <tr>
                <th className="py-2 pl-0">
                  {onSelectAll && (
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      aria-label="Select all holdings"
                      disabled={symbols.length === 0}
                      checked={allSelected}
                      onChange={(e) => onSelectAll(symbols, e.target.checked)}
                      className="accent-neon-green"
                    />
                  )}
                </th>
                <th className="py-2 pl-0">Asset</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Value</th>
                <th className="py-2 text-right">P/L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-green-900/20">
              {positions.map((pos) => (
                <tr key={pos.symbol} className="hover:bg-green-900/10 transition-colors group">
                  <td className="py-3 pl-0">
                    <input
                      type="checkbox"
                      checked={selected.includes(pos.symbol)}
                      onChange={e => onSelect(pos.symbol, e.target.checked)}
                      className="accent-neon-green"
                    />
                  </td>
                  <td className="py-3 font-bold text-neon-green pl-0">{pos.symbol}</td>
                  <td className="py-3 text-right text-gray-400 group-hover:text-gray-300">{pos.qty}</td>
                  <td className="py-3 text-right text-gray-200">${pos.market_value.toLocaleString()}</td>
                  <td className={`py-3 text-right font-mono ${pos.unrealized_pl >= 0 ? 'text-neon-green' : 'text-red-500'}`}>
                    {pos.unrealized_pl >= 0 ? '+' : ''}{pos.unrealized_pl.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
})

export default ActiveHoldings
