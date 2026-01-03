import { useState } from 'react';

interface Transaction {
  timestamp: string
  side: string
  symbol: string
  qty: number
  price: number
  reason: string
  status?: string
}

interface TransactionsTableProps {
  transactions: Transaction[]
}

export default function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [tooltip, setTooltip] = useState<{ text: string, x: number, y: number } | null>(null);

  return (
    <div className="border border-neon-green/30 p-4 bg-black/50 h-full">
      <div className="flex items-center mb-4 border-b border-neon-green/20 pb-2">
        <span className="bg-neon-green text-black px-2 py-0.5 text-xs font-bold mr-2">TRANSACTIONS ({transactions.length})</span>
      </div>
      
      <div className="overflow-y-auto h-[calc(100%-40px)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-green-700 border-b border-green-900/30 sticky top-0 bg-black">
              <th className="py-2">TIME</th>
              <th className="py-2">ACTION</th>
              <th className="py-2">SYMBOL</th>
              <th className="py-2 text-right">QTY</th>
              <th className="py-2 text-right pr-6">PRICE</th>
              <th className="py-2">STATUS</th>
              <th className="py-2">REASON</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, idx) => (
              <tr key={idx} className="border-b border-green-900/10 hover:bg-green-900/10">
                <td className="py-2 text-neon-green">{new Date(tx.timestamp).toLocaleTimeString()}</td>
                <td
                  className={`py-2 font-bold ${
                    tx.side?.toLowerCase() === 'buy'
                      ? 'text-neon-green'
                      : tx.side?.toLowerCase() === 'sell'
                        ? 'text-red-500'
                        : 'text-white'
                  }`}
                >
                  {tx.side.toUpperCase()}
                </td>
                <td className="py-2 text-neon-green">{tx.symbol}</td>
                <td className="py-2 text-right">{tx.qty}</td>
                <td className="py-2 text-right text-green-600 pr-6">
                  {tx.price > 0 ? `$${tx.price.toFixed(2)}` : <span className="text-yellow-500 text-xs">PENDING</span>}
                </td>
                <td className="py-2">
                  <span className={`text-xs px-1 py-0.5 rounded ${
                    tx.status === 'filled' ? 'bg-green-900 text-green-300' :
                    tx.status === 'canceled' ? 'bg-red-900 text-red-300' :
                    'bg-yellow-900 text-yellow-300'
                  }`}>
                    {(tx.status || 'unknown').toUpperCase()}
                  </span>
                </td>
                <td 
                  className="py-2 text-gray-500 text-xs truncate max-w-[150px] cursor-help"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      text: tx.reason,
                      x: rect.left,
                      y: rect.bottom + 5
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {tx.reason}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-gray-500">No transactions yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {tooltip && (
        <div 
          className="fixed z-50 px-3 py-2 bg-black border border-neon-green text-neon-green text-xs max-w-xs rounded shadow-xl pointer-events-none"
          style={{ 
            left: Math.min(tooltip.x, window.innerWidth - 320), 
            top: tooltip.y 
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
