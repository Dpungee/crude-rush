import type { Metadata } from 'next'
import './globals.css'
import { WalletProviderWrapper } from '@/components/shared/WalletProvider'

export const metadata: Metadata = {
  title: 'Crude Rush - Drill. Refine. Dominate.',
  description: 'Build your oil empire on Solana. An idle incremental game where you drill, refine, and dominate the leaderboard.',
  openGraph: {
    title: 'Crude Rush',
    description: 'Build your oil empire on Solana.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-oil-950 antialiased">
        <WalletProviderWrapper>
          {children}
        </WalletProviderWrapper>
      </body>
    </html>
  )
}
