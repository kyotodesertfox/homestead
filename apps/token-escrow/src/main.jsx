import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { taiko } from '@reown/appkit/networks'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const projectId = import.meta.env.VITE_WALLET_CONNECT;

const taikoMainnet = {
  ...taiko,
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.taiko.xyz'] },
    public:  { http: ['https://rpc.mainnet.taiko.xyz'] },
  }
}

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [taikoMainnet],
  ssr: true,
})

const queryClient = new QueryClient()

createAppKit({
  adapters: [wagmiAdapter],
  networks: [taikoMainnet],
  projectId,
  metadata: {
    name: 'Homestead Escrow',
    description: 'Token escrow - lock tokens, receive ETH.',
    url: window.location.origin,
    icons: ['https://avatars.githubusercontent.com/u/37784886'],
  },
  defaultNetwork: taikoMainnet,
  allowUnsupportedChain: false,
  features: { analytics: false, email: false, socials: false, swaps: false },
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#16a34a',
    '--w3m-border-radius-master': '20px',
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
