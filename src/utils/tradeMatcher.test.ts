import { describe, expect, it } from 'vitest';
import { computeTradePerformance } from './tradeMatcher';
import type { Transaction } from '../context/websocketTypes';

describe('tradeMatcher', () => {
  it('should correctly match a simple buy and sell (long trade)', () => {
    const transactions: Transaction[] = [
      { timestamp: '2026-06-04T10:00:00Z', side: 'buy', symbol: 'AAPL', qty: 10, price: 150, reason: 'Entry', status: 'filled' },
      { timestamp: '2026-06-04T10:10:00Z', side: 'sell', symbol: 'AAPL', qty: 10, price: 160, reason: 'Exit', status: 'filled' },
    ];

    const { matchesMap, stats } = computeTradePerformance(transactions);

    expect(matchesMap.size).toBe(1);
    
    // Check match details for the closing trade (the sell)
    const match = Array.from(matchesMap.values())[0];
    expect(match.closingTx.side).toBe('sell');
    expect(match.qty).toBe(10);
    expect(match.realizedPnL).toBe(100); // 10 * (160 - 150)
    expect(match.realizedPnLPercent).toBe(6.666666666666667); // (160 - 150) / 150 * 100
    expect(match.avgOpenPrice).toBe(150);
    expect(match.isShort).toBe(false);
    expect(match.matches.length).toBe(1);
    expect(match.matches[0].tx.price).toBe(150);
    expect(match.matches[0].qty).toBe(10);

    // Check stats
    expect(stats.totalPnL).toBe(100);
    expect(stats.totalPnLPercent).toBe(6.666666666666667);
    expect(stats.winRate).toBe(100);
    expect(stats.totalTrades).toBe(1);
    expect(stats.winningTrades).toBe(1);
    expect(stats.losingTrades).toBe(0);
    expect(stats.profitFactor).toBe(Infinity);
    expect(stats.avgWin).toBe(100);
    expect(stats.avgLoss).toBe(0);
  });

  it('should handle multiple buys and average entry prices', () => {
    const transactions: Transaction[] = [
      { timestamp: '2026-06-04T10:00:00Z', side: 'buy', symbol: 'AAPL', qty: 5, price: 100, reason: 'Entry 1', status: 'filled' },
      { timestamp: '2026-06-04T10:05:00Z', side: 'buy', symbol: 'AAPL', qty: 5, price: 110, reason: 'Entry 2', status: 'filled' },
      { timestamp: '2026-06-04T10:10:00Z', side: 'sell', symbol: 'AAPL', qty: 10, price: 120, reason: 'Exit', status: 'filled' },
    ];

    const { matchesMap } = computeTradePerformance(transactions);

    expect(matchesMap.size).toBe(1);
    const match = Array.from(matchesMap.values())[0];
    expect(match.qty).toBe(10);
    expect(match.avgOpenPrice).toBe(105); // (5*100 + 5*110) / 10
    expect(match.realizedPnL).toBe(150); // 10 * (120 - 105)
    expect(match.realizedPnLPercent).toBeCloseTo(14.2857, 4); // (120 - 105) / 105 * 100
  });

  it('should handle partial sells and reduce remaining quantities in FIFO order', () => {
    const transactions: Transaction[] = [
      { timestamp: '2026-06-04T10:00:00Z', side: 'buy', symbol: 'AAPL', qty: 10, price: 100, reason: 'Entry', status: 'filled' },
      { timestamp: '2026-06-04T10:05:00Z', side: 'sell', symbol: 'AAPL', qty: 4, price: 110, reason: 'Exit 1', status: 'filled' },
      { timestamp: '2026-06-04T10:10:00Z', side: 'sell', symbol: 'AAPL', qty: 6, price: 120, reason: 'Exit 2', status: 'filled' },
    ];

    const { matchesMap, stats } = computeTradePerformance(transactions);

    expect(matchesMap.size).toBe(2);
    
    const matchesList = Array.from(matchesMap.values());
    
    // First exit
    const match1 = matchesList[0];
    expect(match1.qty).toBe(4);
    expect(match1.avgOpenPrice).toBe(100);
    expect(match1.realizedPnL).toBe(40); // 4 * (110 - 100)

    // Second exit
    const match2 = matchesList[1];
    expect(match2.qty).toBe(6);
    expect(match2.avgOpenPrice).toBe(100);
    expect(match2.realizedPnL).toBe(120); // 6 * (120 - 100)

    expect(stats.totalPnL).toBe(160);
    expect(stats.totalTrades).toBe(2);
    expect(stats.winRate).toBe(100);
  });

  it('should ignore canceled trades', () => {
    const transactions: Transaction[] = [
      { timestamp: '2026-06-04T10:00:00Z', side: 'buy', symbol: 'AAPL', qty: 10, price: 150, reason: 'Entry', status: 'filled' },
      { timestamp: '2026-06-04T10:05:00Z', side: 'sell', symbol: 'AAPL', qty: 10, price: 160, reason: 'Exit', status: 'canceled' },
    ];

    const { matchesMap, stats } = computeTradePerformance(transactions);

    expect(matchesMap.size).toBe(0);
    expect(stats.totalTrades).toBe(0);
  });

  it('should support short trades (sell entry then buy exit)', () => {
    const transactions: Transaction[] = [
      { timestamp: '2026-06-04T10:00:00Z', side: 'sell', symbol: 'TSLA', qty: 5, price: 200, reason: 'Short Entry', status: 'filled' },
      { timestamp: '2026-06-04T10:10:00Z', side: 'buy', symbol: 'TSLA', qty: 5, price: 180, reason: 'Short Cover', status: 'filled' },
    ];

    const { matchesMap, stats } = computeTradePerformance(transactions);

    expect(matchesMap.size).toBe(1);
    const match = Array.from(matchesMap.values())[0];
    expect(match.closingTx.side).toBe('buy');
    expect(match.qty).toBe(5);
    expect(match.isShort).toBe(true);
    expect(match.avgOpenPrice).toBe(200);
    expect(match.realizedPnL).toBe(100); // 5 * (200 - 180)
    expect(match.realizedPnLPercent).toBe(10); // (200 - 180) / 200 * 100

    expect(stats.totalPnL).toBe(100);
    expect(stats.winRate).toBe(100);
  });

  it('should calculate proper win rate, profit factor, average win, average loss', () => {
    const transactions: Transaction[] = [
      // Trade 1: Profit of $50 (Buy 5 AAPL at 100, Sell 5 AAPL at 110)
      { timestamp: '2026-06-04T10:00:00Z', side: 'buy', symbol: 'AAPL', qty: 5, price: 100, reason: 'Entry 1', status: 'filled' },
      { timestamp: '2026-06-04T10:05:00Z', side: 'sell', symbol: 'AAPL', qty: 5, price: 110, reason: 'Exit 1', status: 'filled' },
      // Trade 2: Loss of $30 (Buy 5 TSLA at 200, Sell 5 TSLA at 194)
      { timestamp: '2026-06-04T10:10:00Z', side: 'buy', symbol: 'TSLA', qty: 5, price: 200, reason: 'Entry 2', status: 'filled' },
      { timestamp: '2026-06-04T10:15:00Z', side: 'sell', symbol: 'TSLA', qty: 5, price: 194, reason: 'Exit 2', status: 'filled' },
    ];

    const { stats } = computeTradePerformance(transactions);

    expect(stats.totalTrades).toBe(2);
    expect(stats.winningTrades).toBe(1);
    expect(stats.losingTrades).toBe(1);
    expect(stats.winRate).toBe(50);
    expect(stats.totalPnL).toBe(20); // 50 - 30
    expect(stats.avgWin).toBe(50);
    expect(stats.avgLoss).toBe(30);
    expect(stats.profitFactor).toBe(1.6666666666666667); // 50 / 30
  });
});
