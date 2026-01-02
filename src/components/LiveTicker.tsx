import React from 'react';
import { useWebSocket } from '../context/useWebSocket';

const LiveTicker: React.FC = () => {
  const { portfolio, qqqChange } = useWebSocket();
  const positions = portfolio?.positions || [];

  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const trackRef = React.useRef<HTMLDivElement | null>(null)
  const [repeatCount, setRepeatCount] = React.useState(1)

  const baseItems = React.useMemo(() => {
    return [
      { type: 'qqq' as const },
      ...positions.map((pos) => ({ type: 'pos' as const, symbol: pos.symbol, pos })),
    ]
  }, [positions])

  React.useEffect(() => {
    const container = containerRef.current
    const track = trackRef.current
    if (!container || !track) return

    const update = () => {
      const containerWidth = container.clientWidth
      const trackWidth = track.scrollWidth
      if (containerWidth <= 0 || trackWidth <= 0) return

      const baseWidth = trackWidth / Math.max(1, repeatCount)
      if (baseWidth <= 0) return

      // Ensure the scrolling content is at least 2x the container width
      // so the right side never looks empty during animation.
      const needed = Math.max(1, Math.ceil((containerWidth * 2) / baseWidth))
      if (needed !== repeatCount) setRepeatCount(needed)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(container)
    ro.observe(track)
    return () => ro.disconnect()
  }, [repeatCount, baseItems.length, qqqChange])

  const renderItem = (item: (typeof baseItems)[number], keyPrefix: string) => {
    if (item.type === 'qqq') {
      return (
        <div key={`${keyPrefix}-qqq`} className="px-6 flex items-center space-x-2 border-r border-white/5">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">NASDAQ (QQQ)</span>
          <span className={`text-sm font-mono leading-none inline-flex items-center ${qqqChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            <span className="inline-block w-3 text-center">{qqqChange >= 0 ? '▲' : '▼'}</span>
            <span>{Math.abs(qqqChange).toFixed(2)}%</span>
          </span>
        </div>
      )
    }

    const pos = item.pos
    return (
      <div key={`${keyPrefix}-${item.symbol}`} className="px-6 flex items-center space-x-3 border-r border-white/5">
        <span className="text-[10px] font-bold text-white tracking-widest uppercase">{pos.symbol}</span>
        <span className="text-zinc-300 font-mono text-xs">${pos.current_price?.toFixed(2)}</span>
        <span className={`text-xs font-mono leading-none inline-flex items-center ${(pos.change_today || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          <span className="inline-block w-3 text-center">{(pos.change_today || 0) >= 0 ? '▲' : '▼'}</span>
          <span>{Math.abs(pos.change_today || 0).toFixed(2)}%</span>
        </span>
      </div>
    )
  }

  const renderTrack = (keyPrefix: string) => (
    <div className="flex whitespace-nowrap items-center">
      {Array.from({ length: repeatCount }).flatMap((_, repIdx) =>
        baseItems.map((item, idx) => renderItem(item, `${keyPrefix}-${repIdx}-${idx}`))
      )}
    </div>
  )

  return (
    <div ref={containerRef} className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-white/10 h-10 flex items-center overflow-hidden z-50">
      {/* Two identical tracks => seamless loop */}
      <div className="flex animate-marquee items-center">
        <div ref={trackRef} className="flex">
          {renderTrack('track-a')}
        </div>
        <div className="flex" aria-hidden="true">
          {renderTrack('track-b')}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          will-change: transform;
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `,
        }}
      />
    </div>
  );
};

export default LiveTicker;
