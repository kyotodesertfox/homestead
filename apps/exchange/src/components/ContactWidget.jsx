import { useState } from 'react';
import { Mail, X, Send, ChevronDown } from 'lucide-react';

function encodeForm(data) {
  return Object.keys(data)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(data[k])}`)
    .join('&');
}

export default function ContactWidget() {
  const [open, setOpen]   = useState(false);
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [botField, setBotField] = useState('');
  const [status, setStatus]   = useState(null); // null | 'sending' | 'sent' | 'error'

  const canSend = name.trim() && email.trim() && message.trim() && status !== 'sending';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSend) return;
    setStatus('sending');
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encodeForm({ 'form-name': 'contact', name, email, message, 'bot-field': botField }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Submission failed');
        setStatus('sent');
        setName(''); setEmail(''); setMessage('');
      })
      .catch(() => setStatus('error'));
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-6 bg-white shadow-2xl z-50 flex flex-col overflow-hidden sm:w-96 sm:max-h-[72vh] sm:rounded-2xl sm:border sm:border-gray-200">

          {/* Header */}
          <div className="bg-hub-dark px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-hub-light" />
              <span className="text-white font-black uppercase tracking-widest text-xs">Contact Homestead</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {status === 'sent' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-8">
                <div className="w-14 h-14 rounded-full bg-hub-surface border-2 border-hub-green flex items-center justify-center">
                  <Mail size={22} className="text-hub-green" />
                </div>
                <p className="text-gray-900 font-black uppercase tracking-tight">Message Sent</p>
                <p className="text-gray-500 text-xs leading-relaxed max-w-xs">
                  Thanks for reaching out. We'll get back to you by email.
                </p>
                <button onClick={() => setStatus(null)} className="text-hub-green text-xs font-black uppercase tracking-widest hover:text-green-700">
                  Send Another
                </button>
              </div>
            ) : (
              <form name="contact" onSubmit={handleSubmit} className="flex flex-col gap-3">
                <p className="text-gray-500 text-xs leading-relaxed">
                  Send us a plain-text message by email — no wallet needed.
                </p>

                {/* Honeypot */}
                <p className="hidden">
                  <label>Don't fill this out: <input name="bot-field" value={botField} onChange={e => setBotField(e.target.value)} /></label>
                </p>

                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-hub-green" />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-hub-green" />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={4}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:border-hub-green" />
                </div>

                {status === 'error' && (
                  <p className="text-xs text-red-500 font-medium">Something went wrong — please try again.</p>
                )}

                <button type="submit" disabled={!canSend}
                  className="flex items-center justify-center gap-2 bg-hub-green hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-2.5 px-4 rounded-lg uppercase tracking-widest text-xs transition-all">
                  <Send size={12} />
                  {status === 'sending' ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-hub-green hover:bg-green-700 text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-all active:scale-95"
        aria-label="Contact Homestead"
      >
        {open ? <ChevronDown size={22} /> : <Mail size={22} />}
      </button>
    </>
  );
}
