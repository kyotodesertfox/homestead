import React, { useState, useEffect } from 'react';
import { useAppKit } from '@reown/appkit/react';
import {
  useAccount, useBalance, useChainId,
  useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt,
} from 'wagmi';
import { formatUnits, parseUnits, parseEther, formatEther, decodeEventLog } from 'viem';
import { Lock, Unlock, Plus, Search, ChevronDown, CheckCircle, XCircle, Clock, ArrowRight, Wallet } from 'lucide-react';
import { ADDRESSES, TOKEN_ESCROW_ABI, ERC20_ABI, TOKEN_DEPLOYER_ABI } from './contracts.js';

const ZERO = '0x0000000000000000000000000000000000000000';
const HUB_CHAIN_ID = 167000;

function shortAddr(addr) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function addressColor(addr) {
  if (!addr) return '#888';
  const h = parseInt(addr.slice(2, 8), 16) % 360;
  return `hsl(${h}, 65%, 55%)`;
}

function AddrPill({ addr }) {
  if (!addr) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-gray-100 text-gray-700">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: addressColor(addr) }} />
      {shortAddr(addr)}
    </span>
  );
}

function useTokenMeta(address) {
  const enabled = !!address && address !== ZERO;
  const { data: sym }  = useReadContract({ address, abi: ERC20_ABI, functionName: 'symbol',   query: { enabled } });
  const { data: dec }  = useReadContract({ address, abi: ERC20_ABI, functionName: 'decimals', query: { enabled } });
  const { data: name } = useReadContract({ address, abi: ERC20_ABI, functionName: 'name',     query: { enabled } });
  return { symbol: sym, decimals: dec ?? 18, name };
}

function useTokenBalance(tokenAddress, account) {
  const { data } = useReadContract({
    address: tokenAddress ?? undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account ?? ZERO],
    query: { enabled: !!tokenAddress && !!account },
  });
  return data;
}

function useAllowance(tokenAddress, owner, spender) {
  const { data } = useReadContract({
    address: tokenAddress ?? undefined,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner ?? ZERO, spender ?? ZERO],
    query: { enabled: !!tokenAddress && !!owner && !!spender },
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
              <span className="w-3 h-3 rounded-full" style={{ background: addressColor(value) }} />
              <span className="font-semibold text-gray-900">${meta.symbol ?? '...'}</span>
              <span className="text-xs text-gray-500 font-mono">{shortAddr(value)}</span>
            </>
          ) : (
            <span className="text-gray-400">Select token</span>
          )}
        </span>
        <ChevronDown size={16} className="text-gray-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          {tokens.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400">No registered tokens found</div>
          )}
          {tokens.map(addr => (
            <TokenOption
              key={addr}
              address={addr}
              selected={value === addr}
              onSelect={() => { onChange(addr); setOpen(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TokenOption({ address, selected, onSelect }) {
  const meta = useTokenMeta(address);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${selected ? 'bg-green-50' : ''}`}
    >
      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: addressColor(address) }} />
      <span className="font-semibold text-gray-900">${meta.symbol ?? '...'}</span>
      <span className="text-xs text-gray-400 font-mono ml-auto">{shortAddr(address)}</span>
    </button>
  );
}

function StatusBadge({ escrow }) {
  if (!escrow) return null;
  if (escrow.cancelled) return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600"><XCircle size={12} /> Cancelled</span>;
  if (escrow.released)  return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700"><CheckCircle size={12} /> Released</span>;
  if (escrow.ethDeposited > 0n) {
    const both = escrow.initiatorConfirmed && escrow.counterpartyConfirmed;
    const one  = escrow.initiatorConfirmed || escrow.counterpartyConfirmed;
    if (both) return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700"><CheckCircle size={12} /> Confirmed</span>;
    if (one)  return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700"><Clock size={12} /> 1 of 2 confirmed</span>;
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700"><Lock size={12} /> Funded</span>;
  }
  return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500"><Clock size={12} /> Awaiting funds</span>;
}

function TxButton({ label, loadingLabel, onWrite, disabled, variant = 'primary' }) {
  const [pending, setPending] = useState(false);
  async function handle() {
    setPending(true);
    try { await onWrite(); } finally { setPending(false); }
  }
  const base = 'px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const styles = variant === 'primary'
    ? `${base} bg-hub-green text-white hover:bg-green-700`
    : `${base} border-2 border-hub-green text-hub-green bg-white hover:bg-green-50`;
  return (
    <button onClick={handle} disabled={disabled || pending} className={styles}>
      {pending ? loadingLabel : label}
    </button>
  );
}

// ---- Create Escrow panel ----
function CreatePanel({ tokens, escrowAddr, account, onCreated }) {
  const [counterparty, setCounterparty]   = useState('');
  const [token,        setToken]           = useState('');
  const [tokenAmount,  setTokenAmount]     = useState('');
  const [ethRequired,  setEthRequired]     = useState('');
  const [step,         setStep]            = useState('form'); // form | approve | create | done
  const [newId,        setNewId]           = useState(null);

  const meta     = useTokenMeta(token);
  const balance  = useTokenBalance(token, account);
  const allowance = useAllowance(token, account, escrowAddr);

  const { writeContractAsync } = useWriteContract();

  const parsedAmount = (() => {
    try { return parseUnits(tokenAmount || '0', meta.decimals); } catch { return 0n; }
  })();
  const parsedEth = (() => {
    try { return parseEther(ethRequired || '0'); } catch { return 0n; }
  })();

  const needsApproval = allowance < parsedAmount && parsedAmount > 0n;

  const isValid = (
    counterparty.length === 42 &&
    counterparty.startsWith('0x') &&
    token &&
    parsedAmount > 0n &&
    parsedEth > 0n
  );

  async function doApprove() {
    await writeContractAsync({
      address: token,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [escrowAddr, parsedAmount],
    });
    setStep('create');
  }

  async function doCreate() {
    const receipt = await writeContractAsync({
      address: escrowAddr,
      abi: TOKEN_ESCROW_ABI,
      functionName: 'create',
      args: [counterparty, token, parsedAmount, parsedEth],
    });

    let escrowId = null;
    if (receipt?.logs) {
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: TOKEN_ESCROW_ABI, ...log });
          if (decoded.eventName === 'EscrowCreated') { escrowId = decoded.args.escrowId; break; }
        } catch {}
      }
    }
    setNewId(escrowId);
    setStep('done');
    onCreated?.();
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={32} className="text-hub-green" />
        </div>
        <h3 className="text-lg font-black text-gray-900">Escrow created</h3>
        {newId !== null && (
          <p className="text-gray-500 text-sm">Escrow ID: <span className="font-bold text-gray-900">#{newId.toString()}</span></p>
        )}
        <p className="text-gray-400 text-xs text-center max-w-xs">
          Share the escrow ID with your counterparty. They deposit ETH to activate it.
        </p>
        <button
          onClick={() => { setStep('form'); setCounterparty(''); setToken(''); setTokenAmount(''); setEthRequired(''); setNewId(null); }}
          className="text-hub-green font-bold text-sm hover:underline"
        >
          Create another
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Counterparty address</label>
        <input
          value={counterparty}
          onChange={e => setCounterparty(e.target.value.trim())}
          placeholder="0x..."
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-hub-green transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Token to lock</label>
        <TokenSelect value={token} onChange={setToken} tokens={tokens} />
        {token && balance !== undefined && (
          <p className="text-xs text-gray-400 mt-1.5">
            Balance: <span className="font-semibold text-gray-600">
              {parseFloat(formatUnits(balance, meta.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${meta.symbol}
            </span>
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Token amount</label>
        <input
          value={tokenAmount}
          onChange={e => setTokenAmount(e.target.value)}
          placeholder="0.0"
          type="number"
          min="0"
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-hub-green transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">ETH required from counterparty</label>
        <input
          value={ethRequired}
          onChange={e => setEthRequired(e.target.value)}
          placeholder="0.0"
          type="number"
          min="0"
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-hub-green transition-colors"
        />
      </div>

      <div className="flex gap-3 pt-2">
        {needsApproval ? (
          <TxButton
            label={`Approve $${meta.symbol ?? 'token'}`}
            loadingLabel="Approving..."
            onWrite={doApprove}
            disabled={!isValid}
          />
        ) : (
          <TxButton
            label="Create escrow"
            loadingLabel="Creating..."
            onWrite={doCreate}
            disabled={!isValid}
          />
        )}
      </div>

      {needsApproval && isValid && (
        <p className="text-xs text-gray-400">Step 1 of 2 - approve token spend, then create escrow.</p>
      )}
    </div>
  );
}

// ---- Escrow card with actions ----
function EscrowCard({ id, escrowAddr, account, onRefresh }) {
  const { data: raw, refetch } = useReadContract({
    address: escrowAddr,
    abi: TOKEN_ESCROW_ABI,
    functionName: 'getEscrow',
    args: [BigInt(id)],
    query: { enabled: !!escrowAddr },
  });

  const escrow = raw ? {
    initiator:             raw[0],
    counterparty:          raw[1],
    token:                 raw[2],
    tokenAmount:           raw[3],
    ethRequired:           raw[4],
    ethDeposited:          raw[5],
    initiatorConfirmed:    raw[6],
    counterpartyConfirmed: raw[7],
    released:              raw[8],
    cancelled:             raw[9],
  } : null;

  const tokenMeta = useTokenMeta(escrow?.token);
  const { writeContractAsync } = useWriteContract();

  if (!escrow || escrow.initiator === ZERO) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-gray-400 text-sm">Escrow #{id} not found</p>
      </div>
    );
  }

  const isInitiator    = account?.toLowerCase() === escrow.initiator.toLowerCase();
  const isCounterparty = account?.toLowerCase() === escrow.counterparty.toLowerCase();
  const isParty        = isInitiator || isCounterparty;

  const myConfirmed = isInitiator ? escrow.initiatorConfirmed : isCounterparty ? escrow.counterpartyConfirmed : false;
  const canConfirm  = isParty && !myConfirmed && escrow.ethDeposited > 0n && !escrow.released && !escrow.cancelled;
  const canFund     = isCounterparty && escrow.ethDeposited === 0n && !escrow.cancelled;
  const canCancel   = isParty && !escrow.released && !escrow.cancelled;

  async function doFund() {
    await writeContractAsync({
      address: escrowAddr,
      abi: TOKEN_ESCROW_ABI,
      functionName: 'fund',
      args: [BigInt(id)],
      value: escrow.ethRequired,
    });
    refetch(); onRefresh?.();
  }

  async function doConfirm() {
    await writeContractAsync({
      address: escrowAddr,
      abi: TOKEN_ESCROW_ABI,
      functionName: 'confirm',
      args: [BigInt(id)],
    });
    refetch(); onRefresh?.();
  }

  async function doCancel() {
    await writeContractAsync({
      address: escrowAddr,
      abi: TOKEN_ESCROW_ABI,
      functionName: 'cancel',
      args: [BigInt(id)],
    });
    refetch(); onRefresh?.();
  }

  const tokenFmt = formatUnits(escrow.tokenAmount, tokenMeta.decimals);
  const ethFmt   = formatEther(escrow.ethRequired);
  const depFmt   = formatEther(escrow.ethDeposited);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Escrow</span>
          <span className="ml-2 text-xs font-bold text-gray-500">#{id}</span>
        </div>
        <StatusBadge escrow={escrow} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Initiator</p>
          <div className="flex items-center gap-1.5">
            <AddrPill addr={escrow.initiator} />
            {isInitiator && <span className="text-xs font-bold text-hub-green">you</span>}
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Counterparty</p>
          <div className="flex items-center gap-1.5">
            <AddrPill addr={escrow.counterparty} />
            {isCounterparty && <span className="text-xs font-bold text-hub-green">you</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-hub-surface rounded-xl mb-4">
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-400 mb-0.5">Tokens locked</p>
          <p className="font-black text-gray-900">
            {parseFloat(tokenFmt).toLocaleString(undefined, { maximumFractionDigits: 4 })}
            <span className="text-hub-green ml-1">${tokenMeta.symbol ?? '...'}</span>
          </p>
        </div>
        <ArrowRight size={16} className="text-gray-300 shrink-0" />
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-400 mb-0.5">ETH required</p>
          <p className="font-black text-gray-900">{parseFloat(ethFmt).toFixed(4)} ETH</p>
        </div>
      </div>

      {escrow.ethDeposited > 0n && (
        <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-xl mb-4 text-sm">
          <span className="text-blue-600 font-semibold">ETH deposited</span>
          <span className="font-bold text-blue-700">{parseFloat(depFmt).toFixed(4)} ETH</span>
        </div>
      )}

      {escrow.ethDeposited > 0n && (
        <div className="flex gap-3 mb-4">
          <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${escrow.initiatorConfirmed ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
            {escrow.initiatorConfirmed ? <CheckCircle size={12} /> : <Clock size={12} />}
            Initiator {escrow.initiatorConfirmed ? 'confirmed' : 'pending'}
          </div>
          <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${escrow.counterpartyConfirmed ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
            {escrow.counterpartyConfirmed ? <CheckCircle size={12} /> : <Clock size={12} />}
            Counterparty {escrow.counterpartyConfirmed ? 'confirmed' : 'pending'}
          </div>
        </div>
      )}

      {isParty && !escrow.released && !escrow.cancelled && (
        <div className="flex flex-wrap gap-2">
          {canFund && (
            <TxButton label={`Fund ${parseFloat(ethFmt).toFixed(4)} ETH`} loadingLabel="Funding..." onWrite={doFund} />
          )}
          {canConfirm && (
            <TxButton label="Confirm" loadingLabel="Confirming..." onWrite={doConfirm} />
          )}
          {canCancel && (
            <TxButton label={escrow.ethDeposited > 0n ? 'Vote cancel' : 'Cancel'} loadingLabel="Cancelling..." onWrite={doCancel} variant="outline" />
          )}
        </div>
      )}
    </div>
  );
}

// ---- Lookup panel ----
function LookupPanel({ escrowAddr, account }) {
  const [input, setInput] = useState('');
  const [id,    setId]    = useState(null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escrow ID (e.g. 0)"
          type="number"
          min="0"
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-hub-green transition-colors"
        />
        <button
          onClick={() => { const n = parseInt(input, 10); if (!isNaN(n) && n >= 0) setId(n); }}
          className="bg-hub-green text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Search size={16} />
          Look up
        </button>
      </div>
      {id !== null && (
        <EscrowCard id={id} escrowAddr={escrowAddr} account={account} />
      )}
    </div>
  );
}

// ---- My Escrows panel (scan recent IDs) ----
function MyEscrowsPanel({ escrowAddr, account, nextId }) {
  const count = Math.min(Number(nextId ?? 0), 50);
  const ids   = Array.from({ length: count }, (_, i) => i).reverse();

  if (!account) {
    return <p className="text-gray-400 text-sm">Connect your wallet to see your escrows.</p>;
  }
  if (count === 0) {
    return <p className="text-gray-400 text-sm">No escrows have been created yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {ids.map(id => (
        <FilteredEscrowCard key={id} id={id} escrowAddr={escrowAddr} account={account} />
      ))}
    </div>
  );
}

function FilteredEscrowCard({ id, escrowAddr, account }) {
  const { data: raw } = useReadContract({
    address: escrowAddr,
    abi: TOKEN_ESCROW_ABI,
    functionName: 'getEscrow',
    args: [BigInt(id)],
    query: { enabled: !!escrowAddr && !!account },
  });

  if (!raw) return null;
  const initiator    = raw[0];
  const counterparty = raw[1];
  if (
    initiator.toLowerCase()    !== account?.toLowerCase() &&
    counterparty.toLowerCase() !== account?.toLowerCase()
  ) return null;

  return <EscrowCard id={id} escrowAddr={escrowAddr} account={account} />;
}

// ---- Root App ----
export default function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [tab, setTab] = useState('create');
  const [refreshKey, setRefreshKey] = useState(0);

  const escrowAddr = ADDRESSES.TOKEN_ESCROW;
  const tokens     = useRegisteredTokens();

  const { data: nextIdRaw } = useReadContract({
    address: escrowAddr,
    abi: TOKEN_ESCROW_ABI,
    functionName: 'nextEscrowId',
    query: { enabled: !!escrowAddr },
  });

  const wrongChain = isConnected && chainId !== HUB_CHAIN_ID;

  const tabs = [
    { id: 'create', label: 'New Escrow', icon: Plus },
    { id: 'mine',   label: 'My Escrows', icon: Lock },
    { id: 'lookup', label: 'Look up',    icon: Search },
  ];

  return (
    <div className="min-h-screen bg-hub-surface">
      <div className="max-w-lg mx-auto px-4 pb-16">

        {/* Header */}
        <div className="pt-14 pb-6">
          <p className="text-xs font-black text-hub-green uppercase tracking-widest mb-1">HOMESTEAD</p>
          <h1 className="text-2xl font-black text-gray-900">Token Escrow</h1>
          <p className="text-gray-400 text-sm mt-1">Lock tokens. Receive ETH. No middlemen.</p>
        </div>

        {/* Wallet bar */}
        <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 shadow-sm border border-gray-100 mb-6">
          {isConnected ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-hub-green" />
                <AddrPill addr={address} />
              </div>
              <button onClick={() => open()} className="text-xs font-bold text-gray-400 hover:text-hub-green transition-colors">
                Switch
              </button>
            </>
          ) : (
            <button
              onClick={() => open()}
              className="flex items-center gap-2 text-sm font-bold text-hub-green hover:text-green-700 transition-colors"
            >
              <Wallet size={16} />
              Connect wallet
            </button>
          )}
          {nextIdRaw !== undefined && (
            <span className="text-xs text-gray-400 font-semibold">{nextIdRaw.toString()} escrows total</span>
          )}
        </div>

        {wrongChain && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 mb-6 text-sm text-red-600 font-semibold">
            Wrong network - switch to Taiko mainnet
          </div>
        )}

        {!escrowAddr && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-3 mb-6 text-sm text-yellow-700 font-semibold">
            VITE_TOKEN_ESCROW not set - add the deployed contract address to your .env
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm border border-gray-100 mb-6">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  tab === t.id ? 'bg-hub-green text-white shadow-sm' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Panel */}
        {tab === 'create' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-5">Create escrow</h2>
            {isConnected ? (
              <CreatePanel
                tokens={tokens}
                escrowAddr={escrowAddr}
                account={address}
                onCreated={() => { setRefreshKey(k => k + 1); setTab('mine'); }}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 py-8">
                <Lock size={32} className="text-gray-200" />
                <p className="text-gray-400 text-sm">Connect your wallet to create an escrow</p>
                <button onClick={() => open()} className="bg-hub-green text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-green-700 transition-colors">
                  Connect
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'mine' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest px-1">Your escrows</h2>
            <MyEscrowsPanel
              key={refreshKey}
              escrowAddr={escrowAddr}
              account={address}
              nextId={nextIdRaw}
            />
          </div>
        )}

        {tab === 'lookup' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-5">Look up escrow</h2>
            <LookupPanel escrowAddr={escrowAddr} account={address} />
          </div>
        )}
      </div>
    </div>
  );
}
