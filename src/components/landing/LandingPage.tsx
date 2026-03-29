'use client'

import { useWalletModal } from '@solana/wallet-adapter-react-ui'

export function LandingPage() {
  const { setVisible } = useWalletModal()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-oil-950 bg-grid-pattern relative overflow-hidden">
      {/* Ambient glow effects — layered for depth */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-crude-500/8 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-flame/6 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px]" />

      <div className="relative z-10 text-center px-4 max-w-2xl">
        {/* Logo / Title */}
        <div className="mb-3 text-7xl drop-shadow-[0_0_30px_rgba(212,160,23,0.3)]">🛢️</div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-3">
          <span className="text-crude text-glow-gold">CRUDE</span>{' '}
          <span className="text-foreground">RUSH</span>
        </h1>
        <p className="text-xl md:text-2xl text-crude-400/90 font-bold mb-2 tracking-[0.2em] uppercase">
          Drill · Refine · Dominate
        </p>
        <p className="text-muted-foreground text-sm md:text-base mb-10 max-w-sm mx-auto leading-relaxed">
          Build an oil empire on Solana. Earn <span className="text-crude-400 font-semibold">$CRUDE</span> tokens. Compete on the leaderboard.
        </p>

        {/* Connect Button */}
        <button
          onClick={() => setVisible(true)}
          className="group relative inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-crude-600 to-crude-500 text-oil-950 font-black text-lg rounded-xl hover:from-crude-500 hover:to-crude-400 transition-all duration-200 shadow-xl shadow-crude-500/30 hover:shadow-crude-500/50 hover:scale-[1.03] active:scale-[0.98] tracking-wide"
        >
          <svg
            className="w-6 h-6"
            viewBox="0 0 128 128"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="64" cy="64" r="64" fill="currentColor" fillOpacity="0.15" />
            <path
              d="M110.584 49.8066C109.109 49.0776 107.465 48.7969 105.843 48.9956C104.221 49.1943 102.693 49.8636 101.432 50.924L86.4679 63.664C86.2065 63.8879 85.8799 64.0182 85.5384 64.0352C85.1969 64.0521 84.8593 63.9547 84.578 63.758C84.2968 63.5612 84.0876 63.2762 83.9825 62.9477C83.8774 62.6191 83.8822 62.2655 83.9961 61.94L93.0081 36.504C93.4319 35.2854 93.5439 33.984 93.334 32.7126C93.1241 31.4413 92.5992 30.2428 91.8081 29.228C91.0173 28.2133 89.9862 27.4151 88.8085 26.908C87.6309 26.401 86.3439 26.2014 85.0681 26.328L44.9081 30.396C43.2413 30.5635 41.6761 31.2596 40.4343 32.3851C39.1924 33.5107 38.3367 34.9997 37.9961 36.64L27.0401 87.312C26.7521 88.6571 26.8219 90.0553 27.2423 91.3643C27.6628 92.6733 28.4188 93.846 29.4321 94.764C30.3641 95.6105 31.4828 96.2244 32.6942 96.5548C33.9056 96.8853 35.1765 96.9233 36.4041 96.666L56.0041 92.648C56.3268 92.5814 56.6616 92.6154 56.9637 92.7453C57.2658 92.8752 57.5207 93.0944 57.6941 93.374C57.8676 93.6535 57.9514 93.98 57.9342 94.3091C57.917 94.6382 57.7996 94.9541 57.5981 95.214L48.6981 106.824C47.8526 107.935 47.3292 109.253 47.1858 110.64C47.0424 112.027 47.2846 113.427 47.8861 114.692C48.4453 115.878 49.3131 116.895 50.3987 117.635C51.4843 118.374 52.7464 118.808 54.0521 118.892C54.321 118.916 54.5916 118.916 54.8601 118.892C56.1118 118.84 57.3268 118.447 58.3801 117.756L109.252 83.792C110.442 83.0019 111.39 81.9059 112 80.62C112.664 79.2345 112.962 77.7044 112.866 76.1728C112.77 74.6412 112.283 73.1588 111.452 71.864L110.584 49.8066Z"
              fill="currentColor"
            />
          </svg>
          Connect Phantom
          <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Features */}
        <div className="mt-16 grid grid-cols-3 gap-4 md:gap-8 text-center">
          {[
            { icon: '⛽', title: 'Idle Empire', desc: 'Wells pump while you sleep' },
            { icon: '🪙', title: 'Earn $CRUDE', desc: 'Real tokens for real progress' },
            { icon: '🏆', title: 'Compete', desc: 'Leaderboards · Prestige · NFTs' },
          ].map((f) => (
            <div key={f.title} className="bg-oil-900/40 border border-oil-800/40 rounded-xl p-4 hover:border-crude-600/30 transition-colors">
              <div className="text-3xl mb-2">{f.icon}</div>
              <div className="text-sm font-bold text-foreground">{f.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{f.desc}</div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-muted-foreground/40">
          121 plots · 6 building types · On-chain rewards · Built on Solana
        </p>
      </div>
    </div>
  )
}
