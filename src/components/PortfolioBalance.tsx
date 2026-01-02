interface PortfolioBalanceProps {
  equity: number
  buyingPower: number
  unrealizedPL: number
  initialCapital: number
}

export default function PortfolioBalance({ equity, buyingPower, unrealizedPL, initialCapital }: PortfolioBalanceProps) {
  const holdingsValue = buyingPower + unrealizedPL;
  const costBasis = holdingsValue - unrealizedPL;
  
  const cards = [
    { label: 'CASH AVAILABLE', value: buyingPower, color: 'text-neon-green' },
    { label: 'HOLDINGS VALUE', value: holdingsValue, color: 'text-neon-green' },
    { label: 'COST BASIS', value: costBasis, color: 'text-neon-green' },
    { label: 'UNREALIZED P&L', value: unrealizedPL, color: unrealizedPL >= 0 ? 'text-neon-green' : 'text-neon-red' },
    { label: 'INITIAL CAPITAL', value: initialCapital, color: 'text-neon-green' },
    { label: 'TOTAL VALUE', value: equity, color: 'text-neon-red' }, // Red in image for some reason, maybe to highlight?
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center mb-2">
        <span className="bg-neon-green text-black px-2 py-0.5 text-xs font-bold mr-2">PORTFOLIO BALANCE</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-black border border-neon-green/20 p-4 flex flex-col items-center justify-center">
            <span className="text-green-700 text-xs font-bold mb-1">{card.label}</span>
            <span className={`text-xl font-bold ${card.color}`}>
              ${card.value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
