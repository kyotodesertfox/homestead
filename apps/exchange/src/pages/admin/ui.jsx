// ─────────────────────────────────────────────────────────────────────────────
// Shared admin console primitives.
//
// Moved verbatim out of Page.jsx so the Map tab can reuse them instead of
// keeping a second copy. Behaviour is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { CheckCheck, Copy, ExternalLink } from 'lucide-react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { keccak256 } from 'viem';
import { ADDRESSES, ARTIFACT_HASHES } from '../../contracts';

export function Label({ children }) {
  return <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">{children}</p>;
}

export function Input({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-hub-green transition-colors ${className}`}
    />
  );
}

export function Btn({ onClick, disabled, children, variant = 'primary', size = 'sm' }) {
  const base = 'font-black uppercase tracking-widest rounded transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-4 py-2 text-xs', md: 'px-6 py-2.5 text-xs' };
  const variants = {
    primary:  'bg-hub-green hover:bg-green-700 text-white',
    danger:   'bg-red-600 hover:bg-red-700 text-white',
    ghost:    'border border-gray-200 hover:border-hub-green text-gray-700 hover:text-hub-green',
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]}`}>{children}</button>;
}

export function TxStatus({ hash, isConfirming, isConfirmed, error }) {
  if (error)       return <p className="text-xs text-red-500 mt-1 font-mono">{error.shortMessage ?? error.message}</p>;
  if (isConfirming) return <p className="text-xs text-amber-500 mt-1">Confirming…</p>;
  if (isConfirmed && hash) return (
    <a href={`https://taikoscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-hub-green mt-1 hover:underline">
      Confirmed <ExternalLink size={10} />
    </a>
  );
  return null;
}

// ── Copy address helper ───────────────────────────────────────────────────────
export function CopyAddr({ address, full = false }) {
  const [copied, setCopied] = useState(false);
  if (!address) return <span className="text-xs font-mono text-gray-400">…</span>;
  const copy = async (e) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(address);
      } else {
        const el = document.createElement('input');
        el.value = address;
        el.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { }
  };
  const display = full ? address : `${address.slice(0, 10)}…${address.slice(-8)}`;
  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      <span className="font-mono text-xs text-gray-600 truncate">{display}</span>
      <button onClick={copy} className="text-hub-green hover:brightness-75 transition-all shrink-0">
        {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
      </button>
      <a
        href={`https://taikoscan.io/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="text-hub-green hover:brightness-75 transition-all shrink-0"
      >
        <ExternalLink size={13} />
      </a>
    </span>
  );
}

// ── Tooltip hint ─────────────────────────────────────────────────────────────
export function Hint({ text }) {
  return (
    <span className="relative group inline-flex shrink-0">
      <span className="w-3.5 h-3.5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 text-[9px] font-black flex items-center justify-center cursor-help transition-colors select-none">?</span>
      <span className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900 text-white text-xs font-medium rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed shadow-xl normal-case tracking-normal">
        {text}
      </span>
    </span>
  );
}

// ── Write hook wrapper ────────────────────────────────────────────────────────
export function useWrite() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  return { writeContract, hash, isPending, isConfirming, isConfirmed, writeError };
}

// ── Implementation drift ──────────────────────────────────────────────────────
// Strip the CBOR metadata suffix before hashing so toolchain upgrades
// that only rotate metadata don't produce false "outdated" positives.
export function stripMetadata(hex) {
  const metaLen = parseInt(hex.slice(-4), 16);
  return hex.slice(0, -(metaLen * 2 + 4));
}

export function codeHash(bytecode) {
  if (!bytecode || bytecode === '0x') return null;
  return keccak256(stripMetadata(bytecode));
}

const ERC1967 = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

// Proxies: read impl slot then hash impl bytecode.
// Non-upgradeable: hash the contract bytecode directly.
export const PROXY_KEYS   = ['TREASURY', 'TOKEN_DEPLOYER', 'NFT_DEPLOYER', 'RELAY'];
export const DIRECT_KEYS  = ['MARKETPLACE', 'ROUTER', 'FACTORY'];
export const HASH_KEY_MAP = { FACTORY: 'DEX_FACTORY' };

export function useCodeHashes(enabled = true) {
  const publicClient = usePublicClient();
  const [hashes, setHashes] = useState({});

  useEffect(() => {
    if (!publicClient || !enabled) return;
    let cancelled = false;
    async function load() {
      const results = {};
      await Promise.all([
        ...PROXY_KEYS.map(async k => {
          const addr = ADDRESSES[k];
          if (!addr) return;
          const raw = await publicClient.getStorageAt({ address: addr, slot: ERC1967 });
          const impl = raw ? '0x' + raw.slice(-40) : null;
          if (!impl || impl === '0x' + '0'.repeat(40)) return;
          const code = await publicClient.getBytecode({ address: impl });
          results[k] = codeHash(code);
        }),
        ...DIRECT_KEYS.map(async k => {
          const addr = ADDRESSES[k];
          if (!addr) return;
          const code = await publicClient.getBytecode({ address: addr });
          results[k] = codeHash(code);
        }),
      ]);
      if (!cancelled) setHashes(results);
    }
    load();
    return () => { cancelled = true; };
  }, [publicClient, enabled]);

  return hashes;
}

// 'ok' | 'stale' | 'unknown'
export function hashState(hashes, addrKey) {
  const expected = ARTIFACT_HASHES[HASH_KEY_MAP[addrKey] ?? addrKey];
  const actual   = hashes[addrKey];
  if (!expected || !actual) return 'unknown';
  return actual === expected ? 'ok' : 'stale';
}

export function CodeHashDot({ hashes, addrKey }) {
  const state = hashState(hashes, addrKey);
  const cls = { ok: 'bg-hub-green', stale: 'bg-amber-400', unknown: 'bg-gray-300' }[state];
  const title = { ok: 'Up to date', stale: 'Upgrade available', unknown: 'Checking…' }[state];
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 inline-block mr-1 ${cls}`} title={title} />;
}
