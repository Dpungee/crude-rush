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
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          window.onerror = function(msg, src, line, col, err) {
            var d = document.createElement('div');
            d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#1a0505;color:#f87171;padding:16px;font:12px monospace;white-space:pre-wrap;max-height:50vh;overflow:auto;border-bottom:2px solid #7f1d1d';
            d.textContent = 'ERROR: ' + msg + '\\n\\nSource: ' + src + ':' + line + ':' + col + '\\n\\nStack: ' + (err && err.stack ? err.stack : 'none');
            document.body.prepend(d);
          };
        `}} />
      </head>
      <body className="min-h-screen bg-oil-950 antialiased">
        <WalletProviderWrapper>
          {children}
        </WalletProviderWrapper>
      </body>
    </html>
  )
}
