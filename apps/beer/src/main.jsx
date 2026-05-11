import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { taiko } from '@reown/appkit/networks'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 1. Project ID from your .env
const projectId = import.meta.env.VITE_WALLET_CONNECT;

// 2. Taiko Mainnet Definition (Cleaned up)
const taikoMainnet = {
  ...taiko, // Spreads default Taiko config from Reown
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.taiko.xyz'] },
      public: { http: ['https://rpc.mainnet.taiko.xyz'] },
  }
}

const networks = [taikoMainnet]

// 3. Create Adapter
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  ssr: true
})

const queryClient = new QueryClient()

// 4. Initialize AppKit
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'Beer Exchange',
    description: 'The Beer Swap Portal',
    url: window.location.origin,
    icons: ['https://avatars.githubusercontent.com/u/37784886']
  },
  defaultNetwork: taikoMainnet,
    allowUnsupportedChain: false,
    features: {
      analytics: false,
      email: false,
      socials: false,
      swaps: false, // Disabling Reown's native swap to use your custom UI
    },
    themeMode: 'light',
    themeVariables: {
      '--w3m-accent': '#FBB117', // Matching your #FBB117 Guild Yellow
      '--w3m-border-radius-master': '20px',
    }
})

// Wrap your main application with this
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
  {/* Wrap App in the WalletProvider you defined above */}
  <WalletProvider>
  <App />
  </WalletProvider>
  </React.StrictMode>,
)
