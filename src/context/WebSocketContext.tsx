import React, { useEffect, useState, type ReactNode } from 'react'

import { WebSocketContext } from './websocketContext'
import type { MarketStatus, Portfolio, Transaction, AgentLog } from './websocketTypes'

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null)
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [botActive, setBotActive] = useState(false)
  const [qqqChange, setQqqChange] = useState(0)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    let ws: WebSocket
    let reconnectTimeout: ReturnType<typeof setTimeout>
    let refreshInterval: ReturnType<typeof setInterval> | undefined

    const fetchSnapshot = async () => {
      try {
        const rootRes = await fetch('http://127.0.0.1:8000/')
        const rootData = await rootRes.json()
        setBotActive(rootData.bot_active)
        setMarketStatus({
          status: rootData.market_status,
          next_open: rootData.next_open,
          next_close: rootData.next_close
        })
        if (rootData.qqq_change !== undefined) {
          setQqqChange(rootData.qqq_change)
        }

        const portRes = await fetch('http://127.0.0.1:8000/portfolio')
        const portData = await portRes.json()
        setPortfolio(prev => ({
          ...portData,
          initial_capital: prev?.initial_capital || portData.initial_capital || portData.equity
        }))

        // Keep these smaller (latest only) so the UI stays fresh without heavy load.
        const tradesRes = await fetch('http://127.0.0.1:8000/trades')
        const tradesData = await tradesRes.json()
        const sortedTrades = Array.isArray(tradesData)
          ? tradesData.sort((a: Transaction, b: Transaction) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 200)
          : []
        setTransactions(sortedTrades)

        const logsRes = await fetch('http://127.0.0.1:8000/logs')
        const logsData = await logsRes.json()
        setAgentLogs(Array.isArray(logsData) ? logsData.slice(-200) : [])
      } catch (e) {
        // Silent-ish: backend may be restarting.
        console.error('Failed to refresh snapshot', e)
      }
    }

    const connect = () => {
      ws = new WebSocket('ws://127.0.0.1:8000/ws')

      ws.onopen = async () => {
        console.log('Main Frontend WebSocket Connected')
        setIsConnected(true)
        
        // Fetch initial data
        try {
          await fetchSnapshot()
        } catch (e) {
          console.error('Failed to fetch initial data', e)
        }

        // Periodic refresh keeps ticker data moving even if WS state broadcasts pause.
        if (refreshInterval) clearInterval(refreshInterval)
        refreshInterval = setInterval(fetchSnapshot, 5000)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          
          if (msg.type === 'state') {
            setBotActive(msg.bot_active)
            setMarketStatus({
              status: msg.market_status,
              next_open: msg.next_open,
              next_close: msg.next_close
            })
            setQqqChange(msg.qqq_change)
            if (msg.portfolio) {
              setPortfolio(prev => ({
                ...msg.portfolio,
                initial_capital: prev?.initial_capital || msg.portfolio.initial_capital || msg.portfolio.equity
              }))
            }
          } else if (msg.type === 'logs') {
            setAgentLogs(msg.data)
          } else if (msg.type === 'trades') {
            setTransactions(prev => {
                const combined = [...msg.data, ...prev]
                const unique = combined.filter((v, i, a) => a.findIndex(t => t.timestamp === v.timestamp && t.symbol === v.symbol) === i)
                return unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 200)
            })
          }
        } catch (e) {
          console.error('Error parsing WebSocket message', e)
        }
      }

      ws.onclose = (event) => {
        if (!event.wasClean) {
          console.log('WS Connection Lost. Reconnecting...');
        }
        setIsConnected(false)
        if (refreshInterval) {
          clearInterval(refreshInterval)
          refreshInterval = undefined
        }
        reconnectTimeout = setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        // Silent error to avoid console clutter during reloads
        ws.close()
      }
    }

    connect()

    return () => {
      if (ws) ws.close()
      clearTimeout(reconnectTimeout)
      if (refreshInterval) clearInterval(refreshInterval)
    }
  }, [])

  return (
    <WebSocketContext.Provider value={{
      portfolio,
      marketStatus,
      agentLogs,
      transactions,
      botActive,
      qqqChange,
      isConnected
    }}>
      {children}
    </WebSocketContext.Provider>
  )
}
