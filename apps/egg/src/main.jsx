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

const networks = [taikoMainnet]

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  ssr: true
})

const queryClient = new QueryClient()

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'Egg Exchange',
    description: 'The Egg Exchange',
    url: window.location.origin,
    icons: ['https://avatars.githubusercontent.com/u/37784886']
  },
  defaultNetwork: taikoMainnet,
  allowUnsupportedChain: false,
  features: {
    analytics: false,
    email: false,
    socials: false,
    swaps: false,
  },
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#f59e0b',
    '--w3m-border-radius-master': '20px',
  }
})

export function WalletProvider({ children }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>,
)
