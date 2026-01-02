export interface Position {
  symbol: string
  qty: number
  market_value: number
  unrealized_pl: number
  avg_cost?: number
  current_price?: number
  change_today?: number
}

export interface Portfolio {
  equity: number
  buying_power: number
  initial_capital: number
  positions: Position[]
}

export interface MarketStatus {
  status: string
  next_open: string
  next_close: string
}

export interface AgentLog {
  timestamp: string
  title: string
  content: string
}

export interface Transaction {
  timestamp: string
  side: string
  symbol: string
  qty: number
  price: number
  reason: string
  status?: string
}

export interface WebSocketContextType {
  portfolio: Portfolio | null
  marketStatus: MarketStatus | null
  agentLogs: AgentLog[]
  transactions: Transaction[]
  botActive: boolean
  qqqChange: number
  isConnected: boolean
}
