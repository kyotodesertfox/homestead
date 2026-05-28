import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    num: '01',
    title: 'First screen — confirm your wallet address',
    body: 'The first screen shows your connected wallet address as the destination. This is where your ETH will arrive on Taiko. Before clicking anything else, verify that address is yours. Enter your amount ($25 or more is a good starting point) and select your source exchange.',
  },
  {
    num: '02',
    title: 'Second screen — LayerSwap shows a deposit address',
    body: 'This is the critical step. The second screen shows a deposit address that belongs to LayerSwap — not you. It is a temporary holding address they generate just for your transaction. You are going to send your ETH HERE from your exchange.',
    warn: true,
  },
  {
    num: '03',
    title: 'Go to your exchange — withdraw to that address',
    body: 'Open your exchange (Coinbase, Binance, Kraken, etc.), go to Send or Withdraw, select ETH, and paste the LayerSwap deposit address as the destination. Do not paste your own wallet address here — paste the one LayerSwap gave you on screen two.',
    warn: true,
  },
  {
    num: '04',
    title: 'Wait about 2 minutes — you are done',
    body: 'Once your exchange processes the withdrawal, LayerSwap detects it and forwards the ETH directly to your Taiko wallet. You do not need to do anything else. Keep the tab open until your exchange confirms the send.',
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

              {/* Steps */}
              <div className="space-y-3">
                {STEPS.map(step => (
                  <div key={step.num}
                    className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${step.warn ? 'border-amber-400' : 'border-hub-green'}`}>
                    <div className="flex items-start gap-4">
                      <span className="font-black text-2xl leading-none shrink-0 text-gray-200">{step.num}</span>
                      <div>
                        <p className={`font-black uppercase tracking-tight text-sm mb-1 ${step.warn ? 'text-amber-500' : 'text-gray-900'}`}>
                          {step.title}
                        </p>
                        <p className="text-gray-500 text-sm font-medium leading-relaxed">{step.body}</p>
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
              {/* Quick reminder once they proceed */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" strokeWidth={3} />
                <div className="text-amber-700 text-sm font-medium space-y-1">
                  <p><span className="font-black">Screen 1:</span> confirm your wallet address is correct.</p>
                  <p><span className="font-black">Screen 2:</span> LayerSwap shows a deposit address — send your ETH from your exchange to THAT address, not your own wallet. Keep this tab open until your exchange confirms.</p>
                </div>
              </div>

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
