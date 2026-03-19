interface Props {
  state: 'greeting' | 'thinking' | 'idle';
  size?: number;
}

export function YiucpMascot({ state, size = 120 }: Props) {
  const animationStyle: React.CSSProperties =
    state === 'greeting'
      ? { animation: 'yiucpEntrance 0.8s ease-out forwards' }
      : state === 'thinking'
        ? { animation: 'yiucpBounce 1s ease-in-out infinite' }
        : {};

  return (
    <>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #D3010A 0%, #A80008 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(211, 1, 10, 0.25)',
          ...animationStyle,
        }}
      >
        {/* Stylized mascot face */}
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 80 80" fill="none">
          {/* Head */}
          <circle cx="40" cy="32" r="22" fill="#FFD7A3" />
          {/* Hair */}
          <path d="M18 28C18 16 28 8 40 8C52 8 62 16 62 28C62 28 58 22 40 22C22 22 18 28 18 28Z" fill="#2D1B0E" />
          <path d="M18 28C16 24 17 18 22 14" stroke="#2D1B0E" strokeWidth="3" strokeLinecap="round" />
          <path d="M62 28C64 24 63 18 58 14" stroke="#2D1B0E" strokeWidth="3" strokeLinecap="round" />
          {/* Eyes */}
          <ellipse cx="32" cy="32" rx="3" ry="3.5" fill="#2D1B0E" />
          <ellipse cx="48" cy="32" rx="3" ry="3.5" fill="#2D1B0E" />
          <circle cx="33.5" cy="31" r="1" fill="white" />
          <circle cx="49.5" cy="31" r="1" fill="white" />
          {/* Eyebrows */}
          <path d="M27 27C29 25 33 25 35 26" stroke="#2D1B0E" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M45 26C47 25 51 25 53 27" stroke="#2D1B0E" strokeWidth="1.5" strokeLinecap="round" />
          {/* Smile */}
          <path d="M32 40C34 44 46 44 48 40" stroke="#2D1B0E" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Beard shadow */}
          <path d="M30 42C32 48 48 48 50 42" stroke="#8B6B4A" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.3" />
          {/* Body - Red shirt */}
          <path d="M20 54C20 50 28 46 40 46C52 46 60 50 60 54L62 72H18L20 54Z" fill="#D3010A" />
          {/* Collar */}
          <path d="M32 46L40 52L48 46" stroke="#A80008" strokeWidth="2" fill="none" />
          {/* Toyota logo on chest */}
          <ellipse cx="32" cy="58" rx="5" ry="4" stroke="white" strokeWidth="1.2" fill="none" />
          {/* Rhino logo area */}
          <rect x="42" y="54" width="12" height="8" rx="2" fill="#A80008" />
          <text x="48" y="60" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold">R</text>
          {/* Buttons */}
          <circle cx="40" cy="58" r="1.2" fill="white" />
          <circle cx="40" cy="64" r="1.2" fill="white" />
        </svg>
      </div>
      <style>{`
        @keyframes yiucpEntrance {
          0% { opacity: 0; transform: translateY(30px) scale(0.8); }
          60% { opacity: 1; transform: translateY(-5px) scale(1.05); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes yiucpBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </>
  );
}
