import { createContext } from 'react'

import type { WebSocketContextType } from './websocketTypes'

export const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)
