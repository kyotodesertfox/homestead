import React, { useState } from 'react';
import { useAppKit } from '@reown/appkit/react';
import {
  useAccount, useChainId,
  useReadContract, useWriteContract,
} from 'wagmi';
import { formatUnits, parseUnits, parseEther, formatEther, decodeEventLog } from 'viem';
import { Lock, Plus, Search, ChevronDown, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { ADDRESSES, TOKEN_ESCROW_ABI, ERC20_ABI, TOKEN_DEPLOYER_ABI } from '../../contracts.js';

const ZERO          = '0x0000000000000000000000000000000000000000';
const HUB_CHAIN_ID  = 167000;

function shortAddr(a) { return a ? a.slice(0, 6) + '...' + a.slice(-4) : ''; }
function addrColor(a) {
  if (!a) return '#888';
  return `hsl(${parseInt(a.slice(2, 8), 16) % 360}, 65%, 55%)`;
}

function AddrPill({ addr }) {
  if (!addr) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-gray-100 text-gray-700">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: addrColor(addr) }} />
      {shortAddr(addr)}
    </span>
  );
}

function useTokenMeta(address) {
  const en = !!address && address !== ZERO;
  const { data: sym } = useReadContract({ address, abi: ERC20_ABI, functionName: 'symbol',   query: { enabled: en } });
  const { data: dec } = useReadContract({ address, abi: ERC20_ABI, functionName: 'decimals', query: { enabled: en } });
  return { symbol: sym, decimals: dec ?? 18 };
}

function useTokenBalance(token, account) {
  const { data } = useReadContract({
    address: token ?? undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account ?? ZERO],
    query: { enabled: !!token && !!account },
  });
  return data;
}

function useAllowance(token, owner, spender) {
  const { data } = useReadContract({
    address: token ?? undefined,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner ?? ZERO, spender ?? ZERO],
    query: { enabled: !!token && !!owner && !!spender },
  });
  return data ?? 0n;
}

function useRegisteredTokens() {
  const { data } = useReadContract({
    address: ADDRESSES.TOKEN_DEPLOYER,
    abi: TOKEN_DEPLOYER_ABI,
    functionName: 'getAllTokens',
  });
  const stkAddr = ADDRESSES.STK_HOMESTEAD?.toLowerCase();
  return (data ?? []).filter(a => a.toLowerCase() !== stkAddr);
}

function TokenSelect({ value, onChange, tokens }) {
  const [open, setOpen] = useState(false);
  const meta = useTokenMeta(value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-left hover:bg-gray-100 transition-colors"
      >
        <span className="flex items-center gap-2">
          {value ? (
            <>
              <span className="w-3 h-3 rounded-full" style={{ background: addrColor(value) }} />
              <span className="font-semibold text-gray-900">${meta.symbol ?? '...'}</span>
              <span className="text-xs text-gray-500 font-mono">{shortAddr(value)}</span>
            </>
          ) : <span className="text-gray-400">Select token</span>}
        </span>
        <ChevronDown size={16} className="text-gray-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          {tokens.length === 0
            ? <div className="px-4 py-3 text-sm text-gray-400">No registered tokens</div>
            : tokens.map(addr => <TokenOption key={addr} address={addr} selected={value === addr} onSelect={() => { onChange(addr); setOpen(false); }} />)}
        </div>
      )}
    </div>
  );
}

function TokenOption({ address, selected, onSelect }) {
  const meta = useTokenMeta(address);
  return (
    <button type="button" onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${selected ? 'bg-green-50' : ''}`}
    >
      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: addrColor(address) }} />
      <span className="font-semibold text-gray-900">${meta.symbol ?? '...'}</span>
      <span className="text-xs text-gray-400 font-mono ml-auto">{shortAddr(address)}</span>
    </button>
  );
}

function StatusBadge({ e }) {
  if (!e) return null;
  if (e.cancelled) return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600"><XCircle size={12} /> Cancelled</span>;
  if (e.released)  return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700"><CheckCircle size={12} /> Released</span>;
  if (e.ethDeposited > 0n) {
    if (e.initiatorConfirmed && e.counterpartyConfirmed) return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700"><CheckCircle size={12} /> Both confirmed</span>;
    if (e.initiatorConfirmed || e.counterpartyConfirmed) return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700"><Clock size={12} /> 1 of 2 confirmed</span>;
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700"><Lock size={12} /> Funded</span>;
  }
  return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500"><Clock size={12} /> Awaiting funds</span>;
}

function Btn({ label, loading, onWrite, disabled, outline }) {
  const [busy, setBusy] = useState(false);
  async function go() { setBusy(true); try { await onWrite(); } finally { setBusy(false); } }
  const base = 'px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  return (
    <button onClick={go} disabled={disabled || busy} className={
      outline
        ? `${base} border-2 border-hub-green text-hub-green bg-white hover:bg-green-50`
        : `${base} bg-hub-green text-white hover:bg-green-700`
    }>
      {busy ? loading : label}
    </button>
  );
}

function EscrowCard({ id, account, escrowAddr, onRefresh }) {
  const { data: raw, refetch } = useReadContract({
    address: escrowAddr,
    abi: TOKEN_ESCROW_ABI,
    functionName: 'getEscrow',
    args: [BigInt(id)],
    query: { enabled: !!escrowAddr },
  });

  const e = raw ? {
    initiator: raw[0], counterparty: raw[1], token: raw[2],
    tokenAmount: raw[3], ethRequired: raw[4], ethDeposited: raw[5],
    initiatorConfirmed: raw[6], counterpartyConfirmed: raw[7],
    released: raw[8], cancelled: raw[9],
  } : null;

  const meta = useTokenMeta(e?.token);
  const { writeContractAsync } = useWriteContract();

  if (!e || e.initiator === ZERO) return null;

  const isI = account?.toLowerCase() === e.initiator.toLowerCase();
  const isC = account?.toLowerCase() === e.counterparty.toLowerCase();
  const myDone = isI ? e.initiatorConfirmed : isC ? e.counterpartyConfirmed : false;

  async function fund()    { await writeContractAsync({ address: escrowAddr, abi: TOKEN_ESCROW_ABI, functionName: 'fund',    args: [BigInt(id)], value: e.ethRequired }); refetch(); onRefresh?.(); }
  async function confirm() { await writeContractAsync({ address: escrowAddr, abi: TOKEN_ESCROW_ABI, functionName: 'confirm', args: [BigInt(id)] }); refetch(); onRefresh?.(); }
  async function cancel()  { await writeContractAsync({ address: escrowAddr, abi: TOKEN_ESCROW_ABI, functionName: 'cancel',  args: [BigInt(id)] }); refetch(); onRefresh?.(); }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Escrow #{id}</span>
        <StatusBadge e={e} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[['Initiator', e.initiator, isI], ['Recipient', e.counterparty, isC]].map(([label, addr, mine]) => (
          <div key={label} className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <AddrPill addr={addr} />
              {mine && <span className="text-xs font-bold text-hub-green">you</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 p-3 bg-hub-surface rounded-xl mb-4">
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-400 mb-0.5">Tokens locked</p>
          <p className="font-black text-gray-900 text-sm">
            {parseFloat(formatUnits(e.tokenAmount, meta.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
            <span className="text-hub-green ml-1">${meta.symbol ?? '...'}</span>
          </p>
        </div>
        <ArrowRight size={14} className="text-gray-300 shrink-0" />
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-400 mb-0.5">ETH required</p>
          <p className="font-black text-gray-900 text-sm">{parseFloat(formatEther(e.ethRequired)).toFixed(4)} ETH</p>
        </div>
      </div>

      {e.ethDeposited > 0n && (
        <>
          <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-xl mb-3 text-sm">
            <span className="text-blue-600 font-semibold">ETH deposited</span>
            <span className="font-bold text-blue-700">{parseFloat(formatEther(e.ethDeposited)).toFixed(4)} ETH</span>
          </div>
          <div className="flex gap-3 mb-4">
            {[['Initiator', e.initiatorConfirmed], ['Recipient', e.counterpartyConfirmed]].map(([lbl, done]) => (
              <div key={lbl} className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${done ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                {done ? <CheckCircle size={12} /> : <Clock size={12} />}
                {lbl} {done ? 'confirmed' : 'pending'}
              </div>
            ))}
          </div>
        </>
      )}

      {(isI || isC) && !e.released && !e.cancelled && (
        <div className="flex flex-wrap gap-2">
          {isC && e.ethDeposited === 0n && (
            <Btn label={`Fund ${parseFloat(formatEther(e.ethRequired)).toFixed(4)} ETH`} loading="Funding..." onWrite={fund} />
          )}
          {(isI || isC) && !myDone && e.ethDeposited > 0n && (
            <Btn label="Confirm" loading="Confirming..." onWrite={confirm} />
          )}
          {(isI || isC) && (
            <Btn label={e.ethDeposited > 0n ? 'Vote cancel' : 'Cancel'} loading="Cancelling..." onWrite={cancel} outline />
          )}
        </div>
      )}
    </div>
  );
}

function FilteredCard({ id, account, escrowAddr, onRefresh }) {
  const { data: raw } = useReadContract({
    address: escrowAddr,
    abi: TOKEN_ESCROW_ABI,
    functionName: 'getEscrow',
    args: [BigInt(id)],
    query: { enabled: !!escrowAddr && !!account },
  });
  if (!raw) return null;
  const init = raw[0], cpty = raw[1];
  if (init.toLowerCase() !== account?.toLowerCase() && cpty.toLowerCase() !== account?.toLowerCase()) return null;
  return <EscrowCard id={id} account={account} escrowAddr={escrowAddr} onRefresh={onRefresh} />;
}

function CreatePanel({ tokens, escrowAddr, account, onDone }) {
  const [cp,     setCp]     = useState('');
  const [token,  setToken]  = useState('');
  const [amount, setAmount] = useState('');
  const [eth,    setEth]    = useState('');
  const [done,   setDone]   = useState(false);
  const [newId,  setNewId]  = useState(null);

  const meta      = useTokenMeta(token);
  const balance   = useTokenBalance(token, account);
  const allowance = useAllowance(token, account, escrowAddr);

  const { writeContractAsync } = useWriteContract();

  const parsed    = (() => { try { return parseUnits(amount || '0', meta.decimals); } catch { return 0n; } })();
  const parsedEth = (() => { try { return parseEther(eth || '0'); } catch { return 0n; } })();

  const valid = cp.length === 42 && cp.startsWith('0x') && token && parsed > 0n && parsedEth > 0n;
  const needsApproval = allowance < parsed && parsed > 0n;

  async function doApprove() {
    await writeContractAsync({ address: token, abi: ERC20_ABI, functionName: 'approve', args: [escrowAddr, parsed] });
  }

  async function doCreate() {
    const receipt = await writeContractAsync({
      address: escrowAddr,
      abi: TOKEN_ESCROW_ABI,
      functionName: 'create',
      args: [cp, token, parsed, parsedEth],
    });
    let id = null;
    if (receipt?.logs) {
      for (const log of receipt.logs) {
        try {
          const d = decodeEventLog({ abi: TOKEN_ESCROW_ABI, ...log });
          if (d.eventName === 'EscrowCreated') { id = d.args.escrowId; break; }
        } catch {}
      }
    }
    setNewId(id); setDone(true); onDone?.();
  }

  if (done) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle size={28} className="text-hub-green" />
      </div>
      <p className="font-black text-gray-900">Escrow created</p>
      {newId !== null && <p className="text-gray-500 text-sm">ID: <span className="font-bold text-gray-900">#{newId.toString()}</span></p>}
      <p className="text-xs text-gray-400 text-center max-w-xs">Share the ID with your counterparty - they fund it to activate.</p>
      <button onClick={() => { setDone(false); setCp(''); setToken(''); setAmount(''); setEth(''); }} className="text-hub-green font-bold text-sm hover:underline">
        Create another
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Recipient address</label>
        <input value={cp} onChange={e => setCp(e.target.value.trim())} placeholder="0x..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-hub-green transition-colors" />
      </div>
      <div>
        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Token to lock</label>
        <TokenSelect value={token} onChange={setToken} tokens={tokens} />
        {token && balance !== undefined && (
          <p className="text-xs text-gray-400 mt-1.5">Balance: <span className="font-semibold text-gray-600">{parseFloat(formatUnits(balance, meta.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${meta.symbol}</span></p>
        )}
      </div>
      <div>
        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Token amount</label>
        <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" type="number" min="0" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-hub-green transition-colors" />
      </div>
      <div>
        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">ETH required from counterparty</label>
        <input value={eth} onChange={e => setEth(e.target.value)} placeholder="0.0" type="number" min="0" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-hub-green transition-colors" />
      </div>
      <div className="flex gap-3 pt-1">
        {needsApproval
          ? <Btn label={`Approve $${meta.symbol ?? 'token'}`} loading="Approving..." onWrite={doApprove} disabled={!valid} />
          : <Btn label="Create escrow" loading="Creating..." onWrite={doCreate} disabled={!valid} />
        }
      </div>
      {needsApproval && valid && <p className="text-xs text-gray-400">Approve first, then create.</p>}
    </div>
  );
}

export default function Page() {
  const { open }           = useAppKit();
  const { address, isConnected } = useAccount();
  const chainId            = useChainId();
  const escrowAddr         = ADDRESSES.TOKEN_ESCROW;
  const tokens             = useRegisteredTokens();

  const [tab,        setTab]        = useState('create');
  const [refreshKey, setRefreshKey] = useState(0);
  const [lookupId,   setLookupId]   = useState('');
  const [lookedUp,   setLookedUp]   = useState(null);

  const { data: nextIdRaw } = useReadContract({
    address: escrowAddr,
    abi: TOKEN_ESCROW_ABI,
    functionName: 'nextEscrowId',
    query: { enabled: !!escrowAddr },
  });

  const count = Math.min(Number(nextIdRaw ?? 0), 50);
  const allIds = Array.from({ length: count }, (_, i) => i).reverse();

  const wrongChain = isConnected && chainId !== HUB_CHAIN_ID;

  const tabs = [
    { id: 'create', label: 'New Escrow', Icon: Plus  },
    { id: 'mine',   label: 'My Escrows', Icon: Lock  },
    { id: 'lookup', label: 'Look up',    Icon: Search },
  ];

  return (
    <div className="min-h-screen bg-hub-surface py-10 px-4">
      <div className="max-w-lg mx-auto">

        <div className="mb-8">
          <p className="text-xs font-black text-hub-green uppercase tracking-widest mb-1">MARKETPLACE</p>
          <h1 className="text-3xl font-black text-gray-900">Token Escrow</h1>
          <p className="text-gray-400 mt-1">Lock tokens, receive ETH. Both parties confirm to release.</p>
        </div>

        {wrongChain && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 mb-5 text-sm text-red-600 font-semibold">
            Wrong network - switch to Taiko mainnet
          </div>
        )}

        {!escrowAddr && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-3 mb-5 text-sm text-yellow-700 font-semibold">
            VITE_TOKEN_ESCROW not set - deploy the contract and add its address to .env
          </div>
        )}

        {nextIdRaw !== undefined && (
          <p className="text-xs text-gray-400 font-semibold mb-4 px-1">
            {nextIdRaw.toString()} escrow{nextIdRaw !== 1n ? 's' : ''} on chain
          </p>
        )}

        <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm border border-gray-100 mb-6">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === id ? 'bg-hub-green text-white shadow-sm' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'create' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5">Create escrow</h2>
            {isConnected ? (
              <CreatePanel tokens={tokens} escrowAddr={escrowAddr} account={address} onDone={() => { setRefreshKey(k => k + 1); setTab('mine'); }} />
            ) : (
              <div className="flex flex-col items-center gap-4 py-8">
                <Lock size={28} className="text-gray-200" />
                <p className="text-gray-400 text-sm">Connect your wallet to continue</p>
                <button onClick={() => open()} className="bg-hub-green text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-green-700 transition-colors">Connect</button>
              </div>
            )}
          </div>
        )}

        {tab === 'mine' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1 mb-1">Your escrows</h2>
            {!isConnected ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center gap-3">
                <p className="text-gray-400 text-sm">Connect to see your escrows</p>
                <button onClick={() => open()} className="bg-hub-green text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-green-700">Connect</button>
              </div>
            ) : count === 0 ? (
              <p className="text-gray-400 text-sm px-1">No escrows on chain yet.</p>
            ) : (
              allIds.map(id => (
                <FilteredCard key={`${id}-${refreshKey}`} id={id} account={address} escrowAddr={escrowAddr} onRefresh={() => setRefreshKey(k => k + 1)} />
              ))
            )}
          </div>
        )}

        {tab === 'lookup' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5">Look up escrow</h2>
            <div className="flex gap-3 mb-5">
              <input
                value={lookupId}
                onChange={e => setLookupId(e.target.value)}
                placeholder="Escrow ID (e.g. 0)"
                type="number"
                min="0"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-hub-green transition-colors"
              />
              <button
                onClick={() => { const n = parseInt(lookupId, 10); if (!isNaN(n) && n >= 0) setLookedUp(n); }}
                className="bg-hub-green text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Search size={15} />
                Go
              </button>
            </div>
            {lookedUp !== null && (
              <EscrowCard id={lookedUp} account={address} escrowAddr={escrowAddr} />
            )}
          </div>
        )}

      </div>
    </div>
  );
}
