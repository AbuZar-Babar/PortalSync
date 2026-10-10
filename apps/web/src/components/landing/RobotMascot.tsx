export default function RobotMascot() {
  return (
    <div className="relative w-72 h-80 sm:w-80 sm:h-92 flex items-center justify-center drop-shadow-2xl animate-gentle-float select-none">
      <svg
        className="w-full h-full"
        fill="none"
        viewBox="0 0 320 360"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="FlowMind 3D Robot Mascot"
        role="img"
      >
        <defs>
          <linearGradient id="bodyGrad" x1="60" y1="40" x2="260" y2="340" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#edf2fe" />
            <stop offset="100%" stopColor="#d9e3f8" />
          </linearGradient>
          <linearGradient id="visorGrad" x1="100" y1="90" x2="220" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0a1226" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="glowEar" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="neonLight" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Shadow underneath hovering mascot */}
        <ellipse cx="160" cy="335" rx="55" ry="10" fill="#818cf8" filter="blur(8px)" opacity="0.45" />

        {/* Right Ear Pod */}
        <rect x="238" y="112" width="20" height="38" rx="8" fill="url(#bodyGrad)" stroke="#c7d2fe" strokeWidth="1.5" />
        <circle cx="248" cy="131" r="5" fill="url(#glowEar)" />

        {/* Left Ear Pod */}
        <rect x="62" y="112" width="20" height="38" rx="8" fill="url(#bodyGrad)" stroke="#c7d2fe" strokeWidth="1.5" />
        <circle cx="72" cy="131" r="5" fill="url(#glowEar)" />

        {/* Head Capsule */}
        <rect
          x="74"
          y="60"
          width="172"
          height="142"
          rx="71"
          fill="url(#bodyGrad)"
          stroke="#ffffff"
          strokeWidth="2.5"
          filter="drop-shadow(0 14px 28px rgba(148, 163, 184, 0.25))"
        />

        {/* Sleek Glass Visor */}
        <rect x="92" y="86" width="136" height="88" rx="44" fill="url(#visorGrad)" />

        {/* Friendly Curved Glowing Eyes */}
        <path
          d="M112 128 C116 118 132 118 136 128"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="5"
          strokeLinecap="round"
          filter="url(#softGlow)"
        />
        <path
          d="M184 128 C188 118 204 118 208 128"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="5"
          strokeLinecap="round"
          filter="url(#softGlow)"
        />

        {/* Robot Body */}
        <path
          d="M116 200 C116 200 102 216 102 260 C102 295 125 305 160 305 C195 305 218 295 218 260 C218 216 204 200 204 200 Z"
          fill="url(#bodyGrad)"
          stroke="#ffffff"
          strokeWidth="2"
        />

        {/* Chest Core Light Indicator */}
        <circle cx="160" cy="245" r="13" fill="#ffffff" stroke="#c7d2fe" strokeWidth="2" />
        <circle cx="160" cy="245" r="9" fill="url(#neonLight)" filter="url(#softGlow)" />

        {/* Left Arm floating */}
        <path
          d="M102 225 C92 235 84 250 86 264 C87 272 94 274 98 268 C104 260 108 244 112 234"
          fill="url(#bodyGrad)"
          stroke="#ffffff"
          strokeWidth="2"
        />

        {/* Right Arm raised/waving */}
        <path
          d="M216 220 C228 215 238 205 244 195 C247 189 252 192 250 199 C246 211 234 235 220 238"
          fill="url(#bodyGrad)"
          stroke="#ffffff"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
