'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useGameStore } from '@/stores/gameStore'
import { ResourceCounter } from './ResourceCounter'
import { truncateWallet } from '@/lib/utils'

export function TopBar() {
  const { publicKey, disconnect } = useWallet()
  const { setVisible } = useWalletModal()
  const petrodollars = useGameStore((s) => s.petrodollars)
  const crudeOil = useGameStore((s) => s.crudeOil)
  const refinedOil = useGameStore((s) => s.refinedOil)
  const storageCapacity = useGameStore((s) => s.storageCapacity)

  return (
    <div className="h-14 bg-oil-900/90 border-b border-oil-800 flex items-center justify-between px-4 backdrop-blur-sm">
      {/* Left: Brand */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🛢️</span>
        <span className="text-lg font-black tracking-tight">
          <span className="text-crude">CRUDE</span>
          <span className="text-foreground ml-0.5">RUSH</span>
        </span>
      </div>

      {/* Center: Resources */}
      <div className="flex items-center gap-6">
        <ResourceCounter
          emoji="💰"
          label="Petrodollars"
          value={petrodollars}
          color="text-crude-400"
        />
        <ResourceCounter
          emoji="🛢️"
          label="Crude Oil"
          value={crudeOil}
          maxValue={storageCapacity}
          color="text-amber-400"
        />
        <ResourceCounter
          emoji="⚗️"
          label="Refined Oil"
          value={refinedOil}
          color="text-petro-blue"
        />
      </div>

      {/* Right: Wallet */}
      <div className="flex items-center gap-2">
        {publicKey && (
          <span className="text-xs text-muted-foreground font-mono bg-oil-800 px-2.5 py-1 rounded-md">
            {truncateWallet(publicKey.toBase58())}
          </span>
        )}
        <button
          onClick={() => {
            disconnect()
          }}
          className="text-xs text-muted-foreground hover:text-flame transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  )
}
