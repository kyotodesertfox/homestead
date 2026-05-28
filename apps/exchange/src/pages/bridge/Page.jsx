import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';

function UsdConverter() {
  const [ethPrice, setEthPrice] = useState(null);
  const [usd, setUsd] = useState('20');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      .then(r => r.json())
      .then(d => setEthPrice(d?.ethereum?.usd ?? null))
      .catch(() => {});
  }, []);

  const ethVal = ethPrice && usd ? (parseFloat(usd) / ethPrice).toFixed(6) : null;

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm flex items-stretch">
      <div className="flex-1 flex flex-col items-center justify-center py-4 px-6">
        <span className="text-gray-500 text-xs font-black uppercase tracking-widest mb-1">USD</span>
        <div className="flex items-center gap-1">
          <span className="text-gray-700 text-2xl font-black">$</span>
          <input
            type="number"
            min="0"
            placeholder="20"
            value={usd}
            onChange={e => setUsd(e.target.value)}
            className="w-24 text-2xl font-black text-gray-900 bg-transparent outline-none text-center placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center px-2">
        <ChevronRight size={18} className="text-gray-400" strokeWidth={3} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-4 px-6">
        <span className="text-gray-500 text-xs font-black uppercase tracking-widest mb-1">ETH</span>
        {!ethPrice ? (
          <span className="text-gray-500 text-lg font-black">…</span>
        ) : ethVal ? (
          <button
            onClick={() => {
              const copy = () => {
                const el = document.createElement('textarea');
                el.value = ethVal;
                el.style.cssText = 'position:fixed;opacity:0';
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
              };
              if (navigator.clipboard) {
                navigator.clipboard.writeText(ethVal).catch(copy);
              } else {
                copy();
              }
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex flex-col items-center group"
          >
            <span className="text-hub-green font-black text-2xl group-hover:underline">{ethVal}</span>
            <span className="text-gray-400 text-xs font-medium mt-0.5">{copied ? 'copied!' : 'tap to copy'}</span>
          </button>
        ) : (
          <span className="text-gray-600 text-lg font-black">—</span>
        )}
      </div>
    </div>
  );
}

const GATE_STEPS = [
  {
    num: '01',
    title: 'First screen — confirm your wallet address',
    body: 'The first screen shows your connected wallet address as the destination. This is where your ETH will arrive on Taiko. Before clicking anything else, verify that address is yours.',
  },
  {
    num: '02',
    title: 'Second screen — LayerSwap shows a deposit address',
    body: 'This is the critical step. The second screen shows a deposit address that belongs to LayerSwap — not you. It is a temporary holding address they generate just for your transaction. You are going to send your ETH HERE from your exchange.',
    warnText: 'Failure to send to this relay address may result in a permanent loss of funds.',
    warn: true,
  },
  {
    num: '03',
    title: 'Go to your exchange — withdraw to that address',
    body: 'Open your exchange app, go to Send or Withdraw, select ETH on the Ethereum network, and paste the LayerSwap deposit address as the destination. Do not paste your own wallet address here.',
    warn: true,
  },
  {
    num: '04',
    title: 'Wait about 2 minutes — you are done',
    body: 'Once your exchange processes the withdrawal, LayerSwap detects it and forwards the ETH directly to your Taiko wallet. Keep the tab open until your exchange confirms the send.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Select your exchange',
    body: 'Choose the exchange you are sending from — Coinbase, Binance, Kraken, or any other supported CEX.',
  },
  {
    num: '02',
    title: 'Enter the amount of ETH to transfer — tap the ETH value below to copy our $20 suggestion and paste it into the amount box',
    body: 'Type the amount of ETH you want to bridge. Use the converter above to find the ETH equivalent of your dollar amount — tap the ETH value to copy it.',
  },
  {
    num: '03',
    title: 'Click Deposit — confirm your destination wallet',
    body: 'Before proceeding, verify the destination wallet address shown on screen is yours. This is where your ETH will arrive on Taiko.',
  },
  {
    num: '04',
    title: '"Complete the swap" — copy the deposit address',
    body: 'A deposit address will appear on this screen. You must copy this address — it is where you will send your funds from your exchange. Sending to any other address while bridging may result in a permanent loss of funds.',
    warn: true,
  },
  {
    num: '05',
    title: 'Paste the deposit address into your exchange',
    body: 'Open your exchange app, go to Send or Withdraw, and paste the LayerSwap deposit address into the recipient field.',
  },
  {
    num: '06',
    title: 'Ensure the send amount matches',
    body: 'Double-check that the ETH amount you are sending matches exactly what you entered in LayerSwap.',
  },
  {
    num: '07',
    title: 'Choose Ethereum as the deposit network',
    body: 'On your exchange withdrawal screen, select Ethereum as the network. Do not use Arbitrum, Base, Optimism, or any other network — ETH on Ethereum mainnet only.',
  },
];

const WARNINGS = [
  'Screen 1 shows YOUR wallet — the destination. Screen 2 shows a LAYERSWAP address — the one you send to from your exchange. These are two different addresses.',
  'On your exchange withdrawal screen, paste the LayerSwap deposit address (screen 2). Do not paste your own wallet address.',
  'The deposit address expires in roughly 30 minutes. Send promptly after generating it.',
  'Send ETH only. Do not send USDC, USDT, or any other token to this address.',
  'Do not close the LayerSwap tab until your exchange confirms the withdrawal.',
];

export default function BridgePage() {
  const { address }   = useAccount();
  const [ready, setReady] = useState(false);

  const params = new URLSearchParams({
    fromExchange:   'COINBASE',
    to:             'TAIKO_MAINNET',
    lockTo:         'TAIKO_MAINNET',
    destAddress:    address ?? '0x0000000000000000000000000000000000000000',
    toAsset:        'ETH',
    actionButtonText: 'Deposit into Homestead',
    defaultTab:     'cex',
  });

  return (
    <div className="py-12 px-4">
      <div className="max-w-6xl mx-auto">

        <header className="mb-12 border-b-8 border-hub-green pb-6">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900">
            Bridge <span className="text-hub-green">$ETH</span>
          </h1>
          <p className="text-gray-600 font-bold mt-2 uppercase tracking-widest text-sm italic">
            Move funds to Taiko Mainnet
          </p>
        </header>

        <div className="max-w-3xl mx-auto space-y-6">

          {!ready ? (
            <>
              {/* Intro */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <p className="text-gray-700 font-medium leading-relaxed">
                  Bridging moves ETH from your exchange account onto Taiko — the network Homestead runs on.
                  The process takes about <span className="font-black text-gray-900">2 minutes</span> once your exchange processes the withdrawal.
                  Read these steps carefully before you start.
                </p>
              </div>

              {/* Gate steps */}
              <div className="space-y-3">
                {GATE_STEPS.map(step => (
                  <div key={step.num}
                    className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${step.warn ? 'border-amber-400' : 'border-hub-green'}`}>
                    <div className="flex items-start gap-4">
                      <span className="font-black text-2xl leading-none shrink-0 text-gray-200">{step.num}</span>
                      <div>
                        <p className={`font-black uppercase tracking-tight text-sm mb-1 ${step.warn ? 'text-amber-500' : 'text-gray-900'}`}>
                          {step.title}
                        </p>
                        <p className="text-gray-500 text-sm font-medium leading-relaxed">{step.body}</p>
                        {step.warnText && <p className="text-amber-600 text-sm font-black leading-relaxed mt-1">{step.warnText}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Warnings */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0" strokeWidth={3} />
                  <p className="font-black uppercase tracking-widest text-amber-600 text-xs">Before you send</p>
                </div>
                <ul className="space-y-2.5">
                  {WARNINGS.map((w, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <p className="text-amber-800 text-sm font-medium leading-snug">{w}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Proceed */}
              <button
                onClick={() => setReady(true)}
                className="w-full py-4 bg-hub-green hover:brightness-110 text-white font-black uppercase tracking-widest text-sm rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md">
                <CheckCircle2 size={16} strokeWidth={3} />
                I understand — open the bridge
                <ChevronRight size={16} strokeWidth={3} />
              </button>
            </>
          ) : (
            <>
              {/* Condensed steps */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={13} className="text-amber-500 shrink-0" strokeWidth={3} />
                  <p className="font-black uppercase tracking-widest text-amber-600 text-xs">Follow these steps</p>
                </div>
                <div className="space-y-1.5">
                  {STEPS.map(step => (
                    <div key={step.num} className="flex items-center gap-2.5">
                      <span className={`font-black text-xs shrink-0 ${step.warn ? 'text-amber-500' : 'text-amber-400'}`}>{step.num}</span>
                      <p className={`text-sm font-medium ${step.warn ? 'text-amber-800 font-black' : 'text-amber-700'}`}>{step.title}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* USD → ETH quick reference */}
              <UsdConverter />

              <div className="bg-white border-2 border-gray-100 rounded-3xl p-8 shadow-xl">
                <iframe
                  src={`https://layerswap.io/app/?${params.toString()}`}
                  width="100%"
                  height="650"
                  frameBorder="0"
                  title="Layerswap Bridge"
                  className="rounded-2xl"
                />
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
