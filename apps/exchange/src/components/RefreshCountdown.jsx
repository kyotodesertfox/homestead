import { useState, useEffect } from 'react';

const INTERVAL = 30;

export default function RefreshCountdown({ resetKey, size = 14 }) {
  const [remaining, setRemaining] = useState(INTERVAL);

  useEffect(() => { setRemaining(INTERVAL); }, [resetKey]);

  useEffect(() => {
    const tick = setInterval(() => setRemaining(r => (r <= 1 ? INTERVAL : r - 1)), 1000);
    return () => clearInterval(tick);
  }, []);

  const center = size / 2;
  const radius = size / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - remaining / INTERVAL);

  return (
    <span className="inline-flex items-center gap-1 ml-1.5" style={{ verticalAlign: 'middle' }} title={`Price refreshes in ${remaining}s`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={2} />
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#22c55e" strokeWidth={2}
          strokeDasharray={circumference} strokeDashoffset={dashoffset}
          style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
    </span>
  );
}
