'use client'

import { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'
// Default Solana wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css'

const CLUSTER_URLS: Record<string, string> = {
  devnet: 'https://api.devnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  testnet: 'https://api.testnet.solana.com',
}

export function WalletProviderWrapper({ children }: { children: React.ReactNode }) {
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK as 'devnet' | 'mainnet-beta') || 'devnet'
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || CLUSTER_URLS[network] || CLUSTER_URLS.devnet

  const wallets = useMemo(() => [new PhantomWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
