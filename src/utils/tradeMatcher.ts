import type { Transaction } from '../context/websocketTypes';

export interface MatchedTradeItem {
  tx: Transaction;
  qty: number;
}

export interface TradeMatch {
  closingTxKey: string;
  closingTx: Transaction;
  qty: number;
  realizedPnL: number;
  realizedPnLPercent: number;
  avgOpenPrice: number;
  isShort: boolean;
  matches: MatchedTradeItem[];
}

export interface TradeStats {
  totalPnL: number;
  totalPnLPercent: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
}

export const getTxKey = (tx: Transaction, index: number): string => {
  if (tx.id) return `id-${tx.id}`;
  if (tx.order_id) return `order-${tx.order_id}`;
  return `key-${tx.symbol || ''}-${tx.timestamp || ''}-${tx.side || ''}-${tx.qty || 0}-${index}`;
};

/**
 * Computes trade matches and aggregate stats from a list of transactions using FIFO.
 * Matches BUYs (long entry) with SELLs (long exit) and vice versa (short selling).
 */
export function computeTradePerformance(transactions: Transaction[]): {
  matchesMap: Map<string, TradeMatch>;
  stats: TradeStats;
} {
  const matchesMap = new Map<string, TradeMatch>();

  // Filter out canceled or invalid trades and sort chronologically (oldest first)
  const activeTxs = [...transactions]
    .filter(tx => tx.status !== 'canceled' && tx.price > 0 && tx.qty > 0)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Group transactions by symbol
  const symbolTxs: { [symbol: string]: Transaction[] } = {};
  activeTxs.forEach(tx => {
    const symbol = tx.symbol || 'UNKNOWN';
    if (!symbolTxs[symbol]) {
      symbolTxs[symbol] = [];
    }
    symbolTxs[symbol].push(tx);
  });

  let totalGrossProfit = 0;
  let totalGrossLoss = 0;
  let winningTradesCount = 0;
  let losingTradesCount = 0;
  let totalClosedTradesCount = 0;
  let totalClosedVolume = 0; // Sum of (avgOpenPrice * qty) to compute weighted average return
  let totalClosedPnL = 0;

  // Track the original index in the input array to generate key fallback
  const getOrigIndex = (tx: Transaction) => transactions.indexOf(tx);

  for (const symbol in symbolTxs) {
    const txs = symbolTxs[symbol];

    // Queues tracking open positions for FIFO matching
    const buyQueue: { tx: Transaction; qtyLeft: number; origIndex: number }[] = [];
    const sellQueue: { tx: Transaction; qtyLeft: number; origIndex: number }[] = [];

    txs.forEach(tx => {
      const origIndex = getOrigIndex(tx);
      const txKey = getTxKey(tx, origIndex);
      const side = (tx.side || '').toLowerCase();

      if (side === 'buy') {
        let qtyToMatch = tx.qty;
        const matches: MatchedTradeItem[] = [];
        let totalCost = 0;

        // Check if covering a short (matching against unmatched sells)
        while (qtyToMatch > 0 && sellQueue.length > 0) {
          const sellItem = sellQueue[0];
          const matchedQty = Math.min(qtyToMatch, sellItem.qtyLeft);

          matches.push({ tx: sellItem.tx, qty: matchedQty });
          totalCost += sellItem.tx.price * matchedQty;

          sellItem.qtyLeft -= matchedQty;
          qtyToMatch -= matchedQty;

          if (sellItem.qtyLeft <= 0) {
            sellQueue.shift();
          }
        }

        // If short trades covered, record this BUY as the closing transaction
        if (matches.length > 0) {
          const totalQty = tx.qty - qtyToMatch;
          const avgSellPrice = totalCost / totalQty;
          const buyPrice = tx.price;
          
          // PnL for Short = SellPrice - BuyPrice
          const realizedPnL = totalQty * (avgSellPrice - buyPrice);
          const realizedPnLPercent = avgSellPrice > 0 ? ((avgSellPrice - buyPrice) / avgSellPrice) * 100 : 0;

          matchesMap.set(txKey, {
            closingTxKey: txKey,
            closingTx: tx,
            qty: totalQty,
            realizedPnL,
            realizedPnLPercent,
            avgOpenPrice: avgSellPrice,
            isShort: true,
            matches
          });

          totalClosedTradesCount++;
          totalClosedPnL += realizedPnL;
          totalClosedVolume += avgSellPrice * totalQty;
          if (realizedPnL > 0) {
            winningTradesCount++;
            totalGrossProfit += realizedPnL;
          } else {
            losingTradesCount++;
            totalGrossLoss += Math.abs(realizedPnL);
          }
        }

        // Push any remaining buy quantity to buy queue (building a long position)
        if (qtyToMatch > 0) {
          buyQueue.push({ tx, qtyLeft: qtyToMatch, origIndex });
        }

      } else if (side === 'sell') {
        let qtyToMatch = tx.qty;
        const matches: MatchedTradeItem[] = [];
        let totalCost = 0;

        // Check if selling a long (matching against unmatched buys)
        while (qtyToMatch > 0 && buyQueue.length > 0) {
          const buyItem = buyQueue[0];
          const matchedQty = Math.min(qtyToMatch, buyItem.qtyLeft);

          matches.push({ tx: buyItem.tx, qty: matchedQty });
          totalCost += buyItem.tx.price * matchedQty;

          buyItem.qtyLeft -= matchedQty;
          qtyToMatch -= matchedQty;

          if (buyItem.qtyLeft <= 0) {
            buyQueue.shift();
          }
        }

        // If long trades sold, record this SELL as the closing transaction
        if (matches.length > 0) {
          const totalQty = tx.qty - qtyToMatch;
          const avgBuyPrice = totalCost / totalQty;
          const sellPrice = tx.price;

          // PnL for Long = SellPrice - BuyPrice
          const realizedPnL = totalQty * (sellPrice - avgBuyPrice);
          const realizedPnLPercent = avgBuyPrice > 0 ? ((sellPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0;

          matchesMap.set(txKey, {
            closingTxKey: txKey,
            closingTx: tx,
            qty: totalQty,
            realizedPnL,
            realizedPnLPercent,
            avgOpenPrice: avgBuyPrice,
            isShort: false,
            matches
          });

          totalClosedTradesCount++;
          totalClosedPnL += realizedPnL;
          totalClosedVolume += avgBuyPrice * totalQty;
          if (realizedPnL > 0) {
            winningTradesCount++;
            totalGrossProfit += realizedPnL;
          } else {
            losingTradesCount++;
            totalGrossLoss += Math.abs(realizedPnL);
          }
        }

        // Push any remaining sell quantity to sell queue (building a short position)
        if (qtyToMatch > 0) {
          sellQueue.push({ tx, qtyLeft: qtyToMatch, origIndex });
        }
      }
    });
  }

  const winRate = totalClosedTradesCount > 0 ? (winningTradesCount / totalClosedTradesCount) * 100 : 0;
  const profitFactor = totalGrossLoss > 0 ? totalGrossProfit / totalGrossLoss : totalGrossProfit > 0 ? Infinity : 0;
  const totalPnLPercent = totalClosedVolume > 0 ? (totalClosedPnL / totalClosedVolume) * 100 : 0;

  const avgWin = winningTradesCount > 0 ? totalGrossProfit / winningTradesCount : 0;
  const avgLoss = losingTradesCount > 0 ? totalGrossLoss / losingTradesCount : 0;

  const stats: TradeStats = {
    totalPnL: totalClosedPnL,
    totalPnLPercent,
    winRate,
    totalTrades: totalClosedTradesCount,
    winningTrades: winningTradesCount,
    losingTrades: losingTradesCount,
    profitFactor,
    avgWin,
    avgLoss
  };

  return { matchesMap, stats };
}
