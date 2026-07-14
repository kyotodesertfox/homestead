import { useState } from 'react';
import { ArrowLeft, Lock, Shield, Send, MessageSquare, ChevronRight, Inbox, Users } from 'lucide-react';

function fmt(addr) { return `${addr.slice(0, 6)}...${addr.slice(-4)}`; }

const MOCK_CONVERSATIONS = [];

export default function MessagesPanel({ onClose }) {
  const [selected, setSelected]   = useState(null);
  const [reply, setReply]         = useState('');
  const [quantum, setQuantum]     = useState(false);
  const [tab, setTab]             = useState('all');

  const conversations = MOCK_CONVERSATIONS.filter(c =>
    tab === 'all' ? true : tab === 'support' ? c.isSupport : !c.isSupport
  );

  return (
    <div className="fixed inset-0 z-60 flex flex-col bg-gray-50">

      {/* Header */}
      <div className="bg-hub-dark px-6 py-4 flex items-center justify-between shrink-0 border-b border-white/10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-hub-light hover:text-white transition-colors font-black uppercase tracking-widest text-xs"
        >
          <ArrowLeft size={16} />
          ← Back to Dashboard
        </button>
        <div className="flex items-center gap-2">
          <Lock size={14} className="text-hub-light" />
          <span className="text-white font-black uppercase tracking-widest text-xs">Homestead Chat</span>
          <span className="w-1.5 h-1.5 rounded-full bg-hub-light animate-pulse" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar -conversation list; hidden on mobile when a thread is open */}
        <div className={`w-full sm:w-72 shrink-0 bg-white border-r border-gray-100 flex-col ${selected ? 'hidden sm:flex' : 'flex'}`}>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {[
              { id: 'all',     label: 'All',     icon: <Inbox size={12} /> },
              { id: 'support', label: 'Support', icon: <MessageSquare size={12} /> },
              { id: 'groups',  label: 'Groups',  icon: <Users size={12} /> },
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black uppercase tracking-widest transition-colors ${
                  tab === id
                    ? 'text-hub-green border-b-2 border-hub-green'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                <MessageSquare size={28} className="text-gray-200" />
                <p className="text-xs font-black uppercase tracking-tight text-gray-400">No messages yet</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Messages appear here once you register your key and receive your first encrypted message.
                </p>
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.address}
                  onClick={() => setSelected(c)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                    selected?.address === c.address ? 'bg-hub-surface' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-hub-green/10 border border-hub-green/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-black text-hub-green">{c.address.slice(2, 4).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-black text-gray-900 font-mono">{fmt(c.address)}</span>
                      <span className="text-xs text-gray-400">{c.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {c.quantum && <Shield size={10} className="text-hub-green shrink-0" />}
                      <p className="text-xs text-gray-500 truncate">{c.preview}</p>
                    </div>
                    {c.unread > 0 && (
                      <span className="inline-block mt-1 bg-hub-green text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-gray-300 shrink-0 mt-1" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread view; full width on mobile when a thread is open */}
        <div className={`flex-col overflow-hidden ${selected ? 'flex flex-1' : 'hidden sm:flex sm:flex-1'}`}>
          {selected ? (
            <>
              {/* Thread header */}
              <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center gap-3 shrink-0">
                {/* Back to list on mobile */}
                <button
                  onClick={() => setSelected(null)}
                  className="sm:hidden text-gray-400 hover:text-gray-700 transition-colors mr-1"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="w-9 h-9 rounded-full bg-hub-green/10 border border-hub-green/20 flex items-center justify-center">
                  <span className="text-sm font-black text-hub-green">{selected.address.slice(2, 4).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 font-mono">{fmt(selected.address)}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {selected.quantum
                      ? <><Shield size={10} className="text-hub-green" /><span className="text-xs text-hub-green font-black">Quantum Encryption</span></>
                      : <><Lock size={10} className="text-gray-400" /><span className="text-xs text-gray-400">Standard Encryption</span></>
                    }
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {(selected.messages ?? []).map((m, i) => (
                  <div key={i} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs rounded-2xl px-4 py-2.5 ${
                      m.mine
                        ? 'bg-hub-green text-white rounded-br-sm'
                        : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm shadow-sm'
                    }`}>
                      <p className="text-sm leading-relaxed">{m.text}</p>
                      <p className={`text-xs mt-1 ${m.mine ? 'text-white/60' : 'text-gray-400'}`}>{m.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply compose */}
              <div className="px-6 py-4 border-t border-gray-100 bg-white shrink-0">
                <div className="flex gap-3 items-end">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Reply... encrypted before sending"
                    rows={2}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:border-hub-green"
                  />
                  <div className="flex flex-col gap-2 items-end">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quantum}
                        onChange={(e) => setQuantum(e.target.checked)}
                        className="accent-hub-green"
                      />
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Shield size={10} className="text-hub-green" />
                        $QUANTUM or ETH
                      </span>
                    </label>
                    <button
                      disabled={!reply.trim()}
                      className="flex items-center gap-1.5 bg-hub-green hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-2 px-4 rounded-xl uppercase tracking-widest text-xs transition-all"
                    >
                      <Send size={12} />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
              <div className="w-16 h-16 rounded-full bg-hub-surface border-2 border-hub-green/20 flex items-center justify-center">
                <Lock size={24} className="text-hub-green" />
              </div>
              <div>
                <p className="text-gray-900 font-black uppercase tracking-tight mb-1">Select a conversation</p>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                  All messages are end-to-end encrypted. Only your wallet can decrypt what you receive.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
