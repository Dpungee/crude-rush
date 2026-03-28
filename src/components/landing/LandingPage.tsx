'use client'

import { useWalletModal } from '@solana/wallet-adapter-react-ui'

export function LandingPage() {
  const { setVisible } = useWalletModal()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-oil-950 bg-grid-pattern relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-crude-500/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-flame/10 rounded-full blur-[96px]" />

      <div className="relative z-10 text-center px-4 max-w-2xl">
        {/* Logo / Title */}
        <div className="mb-2 text-6xl">🛢️</div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-3">
          <span className="text-crude">CRUDE</span>{' '}
          <span className="text-foreground">RUSH</span>
        </h1>
        <p className="text-xl md:text-2xl text-crude-400 font-semibold mb-2 tracking-wide">
          Drill. Refine. Dominate.
        </p>
        <p className="text-muted-foreground text-base md:text-lg mb-10 max-w-md mx-auto">
          Build your oil empire on Solana. Start with a tiny plot, grow into an unstoppable petroleum tycoon.
        </p>

        {/* Connect Button */}
        <button
          onClick={() => setVisible(true)}
          className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-crude-600 to-crude-500 text-oil-950 font-bold text-lg rounded-xl hover:from-crude-500 hover:to-crude-400 transition-all duration-200 shadow-lg shadow-crude-500/25 hover:shadow-crude-500/40 hover:scale-105 active:scale-100"
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
        <div className="mt-16 grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl mb-2">⛽</div>
            <div className="text-sm font-semibold text-foreground">Idle Production</div>
            <div className="text-xs text-muted-foreground">Wells pump while you sleep</div>
          </div>
          <div>
            <div className="text-3xl mb-2">📈</div>
            <div className="text-sm font-semibold text-foreground">Deep Upgrades</div>
            <div className="text-xs text-muted-foreground">Wells, refineries, prestige</div>
          </div>
          <div>
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-sm font-semibold text-foreground">On-Chain</div>
            <div className="text-xs text-muted-foreground">Wallet-linked, Solana-native</div>
          </div>
        </div>

        <p className="mt-12 text-xs text-muted-foreground/50">
          Built on Solana. Your empire, your wallet.
        </p>
      </div>
    </div>
  )
}
