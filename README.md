\# llm-trader (Frontend)

React + TypeScript dashboard for the llm-trader project (performance chart, portfolio/holdings, transactions, logs, and a live marquee ticker).

\## Tech Stack
- React + TypeScript
- Vite
- Tailwind CSS
- Recharts
- WebSocket + HTTP polling (for resilience during backend restarts)

\## Requirements
- Node.js 18+ (or Bun)
- The backend running locally at `http://127.0.0.1:8000` with WebSocket at `ws://127.0.0.1:8000/ws`

\## Getting Started

Install dependencies:
```bash
npm install
```

Run dev server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

\## Project Structure
- `src/App.tsx` — main dashboard layout
- `src/components/` — UI components (PerformanceChart, ActiveHoldings, LogPanel, LiveTicker, etc.)
- `src/context/` — WebSocket provider + types

\## Configuration
The frontend currently expects the backend on `127.0.0.1:8000`. If you want this configurable, add a Vite env var (e.g. `VITE_API_BASE_URL`) and update the WebSocket/HTTP URLs accordingly.

\## Notes
- If the backend is down, the UI will show stale/empty data. Start the backend first.
- The marquee ticker is designed to be continuous (no empty right side) and will refresh data periodically.
