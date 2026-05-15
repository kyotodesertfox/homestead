import { Lock, Shield, Key, MessageSquare, ArrowLeftRight, EyeOff, Layers, Zap } from 'lucide-react';

const HOW_IT_WORKS = [
  {
    icon: <Key size={28} />,
    step: '01',
    title: 'Register Your Key',
    text: 'Your wallet generates a hybrid keypair — classical X25519 and post-quantum ML-KEM-768. The public key bundle is pinned to IPFS. Only the content address (CID) is stored on-chain. No raw key bytes hit the blockchain.',
  },
  {
    icon: <Lock size={28} />,
    step: '02',
    title: 'Encrypt Locally',
    text: "Your browser fetches the recipient's public key bundle and derives two independent shared secrets. Those secrets are merged via HKDF into a single AES-256-GCM key. Encryption happens entirely in your browser — the plaintext never leaves your device.",
  },
  {
    icon: <MessageSquare size={28} />,
    step: '03',
    title: 'Deliver Through the Contract',
    text: 'The encrypted blob is pinned to IPFS. The contract records only: sender address, recipient address, and blob CID. No message content. No metadata. The contract routes — it does not read.',
  },
];

const FEATURES = [
  {
    icon: <EyeOff size={22} />,
    title: 'Zero-Knowledge Routing',
    text: 'The smart contract cannot read your messages. Taiko cannot read your messages. The relay operator cannot read your messages. The contract is a trustless router, not an inbox.',
  },
  {
    icon: <ArrowLeftRight size={22} />,
    title: 'Treasury Trust Tunnel',
    text: 'HomesteadRelay verifies a two-way trust with the Homestead Treasury before any privileged operation. No external authority can inject itself as a middleman — the trust is cryptographically enforced between two deployed contracts.',
  },
  {
    icon: <Layers size={22} />,
    title: 'Attestation Tiers',
    text: 'Wallet holders, registered brewers, and verified members each unlock different capabilities. Attestation is a trust signal embedded by the contract — not a platform permission you ask someone to grant.',
  },
  {
    icon: <Zap size={22} />,
    title: 'Gas-Efficient Events',
    text: 'Messages are stored as on-chain events, not state. Your history is permanently anchored to the chain without paying state storage costs. Indexers reconstruct your inbox; the chain holds the proof.',
  },
];

export default function RelayPage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">

        {/* HERO */}
        <section className="bg-white border-t-8 border-hub-green shadow-2xl rounded-b-lg p-8 md:p-12 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Lock size={32} className="text-hub-green" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Communications</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900 mb-4">
            Homestead <span className="text-hub-green">Relay</span>
          </h1>
          <p className="text-xl text-gray-700 font-medium leading-relaxed mb-2">
            Encrypted messaging owned by no one.
          </p>
          <p className="text-gray-500 font-medium leading-relaxed max-w-2xl">
            A wallet-native communications layer built on Taiko. All messages travel through a smart contract
            that routes without reading. Your keys never leave your device. No platform can open what only
            your wallet can decrypt. The only trust relationship is between your wallet and the Homestead
            Treasury — enforced by code, not policy.
          </p>
        </section>

        {/* HOMESTEAD CHAT CALLOUT */}
        <section className="mb-12 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-hub-green flex items-center justify-center shadow-lg">
            <MessageSquare size={30} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-hub-green mb-1">Built on HomesteadRelay</p>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900">Homestead Chat</h2>
            <p className="text-gray-500 font-medium text-sm mt-2 max-w-md">
              The chat interface lives in your exchange — bottom right corner. Wallet-native. Encrypted.
              No server reads your messages. No platform holds your keys.
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mb-12">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-6 border-b-4 border-hub-green pb-3">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-hub-green">{s.icon}</div>
                  <span className="text-3xl font-black text-gray-100">{s.step}</span>
                </div>
                <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className="mb-12">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-6 border-b-4 border-hub-green pb-3">
            Architecture
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <div className="text-hub-green mb-4">{f.icon}</div>
                <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* QUANTUM-READY */}
        <section className="mb-12">
          <div className="bg-hub-dark rounded-2xl p-8 md:p-12 text-white">
            <div className="flex items-center gap-3 mb-6">
              <Shield size={28} className="text-hub-light" />
              <span className="text-xs font-black uppercase tracking-widest text-hub-light">Premium Feature</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-4">
              Quantum-Ready <span className="text-hub-light">Encryption</span>
            </h2>
            <p className="text-gray-300 font-medium leading-relaxed mb-6 max-w-2xl">
              Standard elliptic curve cryptography will be broken by quantum computers within the next decade.
              HomesteadRelay's hybrid encryption model is built for that world today.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="text-xs font-black uppercase tracking-widest text-hub-light mb-2">Classical Layer</div>
                <div className="text-white font-black uppercase tracking-tight mb-1">X25519 ECDH</div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Curve25519 Diffie-Hellman key exchange. Fast, battle-tested, and the current gold standard
                  for end-to-end encryption. Broken only by a quantum adversary.
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="text-xs font-black uppercase tracking-widest text-hub-light mb-2">Post-Quantum Layer</div>
                <div className="text-white font-black uppercase tracking-tight mb-1">ML-KEM-768 (Kyber)</div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  NIST FIPS 203. A lattice-based key encapsulation mechanism that survives quantum attacks.
                  Combined with X25519 via HKDF — breaking the cipher requires breaking both, simultaneously.
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="text-xs font-black uppercase tracking-widest text-hub-light mb-3">The Model</div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Quantum-ready messaging is a premium tier today — the fee goes directly into the Homestead Treasury.
                As the Treasury grows, that paywall comes down. The goal is quantum-resistant messaging
                for every wallet, permanently free, funded by the people who valued it enough to pay first.
              </p>
            </div>
          </div>
        </section>

        {/* TRUST MODEL */}
        <section>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-6 border-b-4 border-hub-green pb-3">
            The Trust Model
          </h2>
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
            <p className="text-gray-700 font-medium leading-relaxed mb-6">
              HomesteadRelay does not trust Taiko. It does not trust any external platform, oracle, or team.
              The only authority it recognizes is the Homestead Treasury — and that recognition is mutual.
            </p>
            <div className="flex flex-col md:flex-row items-center gap-4 justify-center py-4">
              <div className="bg-hub-surface border-2 border-hub-green rounded-xl px-6 py-4 text-center">
                <div className="text-xs font-black uppercase tracking-widest text-hub-green mb-1">Your Wallet</div>
                <div className="text-gray-900 font-black uppercase tracking-tight">Sender / Recipient</div>
              </div>
              <ArrowLeftRight size={24} className="text-hub-green shrink-0" />
              <div className="bg-hub-surface border-2 border-hub-green rounded-xl px-6 py-4 text-center">
                <div className="text-xs font-black uppercase tracking-widest text-hub-green mb-1">On-Chain</div>
                <div className="text-gray-900 font-black uppercase tracking-tight">HomesteadRelay Contract</div>
              </div>
              <ArrowLeftRight size={24} className="text-hub-green shrink-0" />
              <div className="bg-hub-surface border-2 border-hub-green rounded-xl px-6 py-4 text-center">
                <div className="text-xs font-black uppercase tracking-widest text-hub-green mb-1">Treasury</div>
                <div className="text-gray-900 font-black uppercase tracking-tight">Mutual Trust Anchor</div>
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium leading-relaxed mt-6 text-center">
              The relay verifies the Treasury trusts it. The Treasury verifies the relay is registered.
              No third party can insert itself into that handshake.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
