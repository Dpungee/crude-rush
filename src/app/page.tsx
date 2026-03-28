'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { LandingPage } from '@/components/landing/LandingPage'
import { GameShell } from '@/components/game/GameShell'

export default function Home() {
  const { connected } = useWallet()

  if (!connected) {
    return <LandingPage />
  }

  return <GameShell />
}
