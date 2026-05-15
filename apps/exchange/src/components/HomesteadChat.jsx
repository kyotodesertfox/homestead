import { useState } from 'react';
import { MessageSquare, X, Lock, Send, Key, ChevronDown, Users, Inbox, Shield } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';

export default function HomesteadChat() {
  const [open, setOpen]           = useState(false);
  const [tab, setTab]             = useState('inbox');
  const [message, setMessage]     = useState('');
  const [recipient, setRecipient] = useState('');
  const [quantumReady, setQuantumReady] = useState(false);

  const { isConnected } = useAccount();
  const { open: openWallet } = useAppKit();

  const handleSend = () => {
    if (!message.trim() || !recipient.trim()) return;
    // TODO: encrypt locally → pin to IPFS → call HomesteadRelay.sendMessage()
    setMessage('');
    setRecipient('');
  };

  return (
    <>
      {open && (
        <div
          className="fixed bottom-20 right-6 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          style={{ maxHeight: '72vh' }}
        >
          {/* Header */}
          <div className="bg-hub-dark px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-hub-light" />
              <span className="text-white font-black uppercase tracking-widest text-xs">Homestead Chat</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {!isConnected ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-hub-surface border-2 border-hub-green flex items-center justify-center">
                <Lock size={22} className="text-hub-green" />
              </div>
              <div>
                <p className="text-gray-900 font-black uppercase tracking-tight mb-1">Wallet Required</p>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Connect your wallet to access end-to-end encrypted messaging on Homestead Chat.
                </p>
              </div>
              <button
                onClick={() => openWallet()}
                className="bg-hub-green hover:bg-green-700 text-white font-black py-2 px-6 rounded uppercase tracking-widest text-xs transition-all"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex border-b border-gray-100 shrink-0">
                {[
                  { id: 'inbox',   icon: <Inbox size={12} />,        label: 'Inbox'   },
                  { id: 'compose', icon: <Send size={12} />,          label: 'Compose' },
                  { id: 'support', icon: <MessageSquare size={12} />, label: 'Support' },
                  { id: 'groups',  icon: <Users size={12} />,         label: 'Groups'  },
                ].map(({ id, icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
                      tab === id
                        ? 'text-hub-green border-b-2 border-hub-green'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>

              {/* Inbox */}
              {tab === 'inbox' && (
                <div className="flex-1 overflow-y-auto">
                  <div className="m-3 bg-hub-surface border border-hub-green/30 rounded-xl p-3 flex items-start gap-3">
                    <Key size={15} className="text-hub-green mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight text-gray-900 mb-0.5">Register Your Key</p>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Generate a quantum-ready keypair to send and receive encrypted messages.
                      </p>
                      <button className="mt-2 text-xs font-black text-hub-green uppercase tracking-widest hover:text-green-700 transition-colors">
                        Register →
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-8 text-center text-gray-400 text-xs font-medium">
                    No messages yet.
                  </div>
                </div>
              )}

              {/* Compose */}
              {tab === 'compose' && (
                <div className="flex-1 flex flex-col p-3 gap-3">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">To</label>
                    <input
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="0x..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 focus:outline-none focus:border-hub-green"
                    />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Encrypted locally before sending..."
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 resize-none focus:outline-none focus:border-hub-green min-h-24"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer" title="Upgrade to hybrid X25519 + ML-KEM-768 encryption. Fee paid in $BEER to the Treasury.">
                      <input
                        type="checkbox"
                        checked={quantumReady}
                        onChange={(e) => setQuantumReady(e.target.checked)}
                        className="accent-hub-green"
                      />
                      <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                        <Shield size={10} className="text-hub-green" />
                        Quantum upgrade · 1 $BEER
                      </span>
                    </label>
                    <button
                      onClick={handleSend}
                      disabled={!message.trim() || !recipient.trim()}
                      className="flex items-center gap-1.5 bg-hub-green hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-2 px-4 rounded uppercase tracking-widest text-xs transition-all"
                    >
                      <Send size={12} />
                      Send
                    </button>
                  </div>
                </div>
              )}

              {/* Support */}
              {tab === 'support' && (
                <div className="flex-1 flex flex-col p-3 gap-3">
                  <div className="bg-hub-dark rounded-xl p-3 flex items-center gap-2">
                    <Shield size={14} className="text-hub-light shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-white">Quantum by Default</p>
                      <p className="text-xs text-gray-400 leading-relaxed mt-0.5">
                        Support messages use hybrid X25519 + ML-KEM-768 encryption at no extra cost.
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Your Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe what you need help with..."
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 resize-none focus:outline-none focus:border-hub-green min-h-28"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Lock size={11} className="text-hub-green" />
                      <span className="text-xs text-gray-400 font-medium">Quantum encrypted · free</span>
                    </div>
                    <button
                      disabled={!message.trim()}
                      onClick={handleSend}
                      className="flex items-center gap-1.5 bg-hub-green hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-2 px-4 rounded uppercase tracking-widest text-xs transition-all"
                    >
                      <Send size={12} />
                      Send
                    </button>
                  </div>
                </div>
              )}

              {/* Groups */}
              {tab === 'groups' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
                  <Users size={28} className="text-gray-300" />
                  <p className="text-xs font-black uppercase tracking-tight text-gray-400">Group Threads</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Attested members only. Requires a registered key and minimum attestation tier.
                  </p>
                  <button className="text-xs font-black text-hub-green uppercase tracking-widest hover:text-green-700 transition-colors">
                    Create Group →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-hub-green hover:bg-green-700 text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-all active:scale-95"
        aria-label="Open Homestead Chat"
      >
        {open ? <ChevronDown size={22} /> : <Lock size={22} />}
      </button>
    </>
  );
}
