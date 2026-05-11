import React, { useState, useMemo } from 'react';
import { Wallet, ArrowDown, Info, RefreshCw, Beer, Gem } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';

export default function ExchangePage() {
    // Hooks must be inside the component function
    const { open } = useAppKit();
    const { isConnected, address } = useAccount();

    const [amount, setAmount] = useState('');
    const [isEthToBeer, setIsEthToBeer] = useState(true);

    const EXCHANGE_RATE = 5000;

    const calculatedOutput = useMemo(() => {
        if (!amount || isNaN(amount)) return "0.00";
        const val = parseFloat(amount);
        return isEthToBeer
        ? (val * EXCHANGE_RATE).toFixed(2)
        : (val / EXCHANGE_RATE).toFixed(6);
    }, [amount, isEthToBeer]);

    const handleSwapDirection = () => {
        setIsEthToBeer(!isEthToBeer);
        setAmount('');
    };

    const handleSwapAction = () => {
        if (!isConnected) {
            open(); // Opens Taiko-configured modal
        } else {
            console.log("Ready to swap on Taiko Mainnet for address:", address);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen py-12 px-4">
        <div className="max-w-6xl mx-auto">
        <header className="mb-12 border-b-8 border-[#FBB117] pb-6 flex flex-col md:flex-row justify-between items-end">
        <div className="w-full md:w-auto">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900">
        BEER <span className="text-[#FBB117]">Exchange</span>
        </h1>
        <p className="text-gray-600 font-bold mt-2 uppercase tracking-widest text-sm italic">
        Redeem Beer Rewards
        </p>
        </div>
        </header>

        <div className="max-w-2xl mx-auto">
        <section className="bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-xl relative overflow-visible">
        <div className="absolute -top-6 -right-6 w-16 h-16 animate-pulse opacity-20">
        <RefreshCw className="w-full h-full text-[#FBB117]" />
        </div>

        <div className="flex flex-col gap-2">
        {/* Input Section */}
        <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl">
        <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-black uppercase tracking-widest text-gray-400">You Deposit</span>
        <span className="text-xs text-gray-500 font-bold flex items-center gap-1">
        <Wallet size={12} />
        {isConnected ? `${address.slice(0,6)}...` : 'Balance: 0.00'}
        </span>
        </div>
        <div className="flex justify-between items-center">
        <input
        type="number"
        placeholder="0.0"
        className="bg-transparent text-3xl font-black text-gray-900 outline-none w-full"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        />
        <div className="bg-white px-4 py-2 rounded-xl flex items-center gap-3 border-2 border-gray-100 shadow-sm min-w-[110px] justify-center">
        {isEthToBeer ? (
            <Gem className="w-5 h-5 text-[#FBB117] drop-shadow-[0_0_3px_rgba(251,177,23,0.4)]" />
        ) : (
            <Beer className="w-5 h-5 text-orange-600" />
        )}
        <span className="font-black text-gray-900 text-sm">
        {isEthToBeer ? '$ETH' : '$BEER'}
        </span>
        </div>
        </div>
        </div>

        {/* Switch Direction Button */}
        <div className="flex justify-center -my-4 z-10">
        <button
        onClick={handleSwapDirection}
        className="bg-white border-2 border-gray-100 p-2 rounded-xl text-[#FBB117] shadow-md hover:bg-gray-50 transition-colors group"
        >
        <ArrowDown size={20} strokeWidth={3} className="group-hover:rotate-180 transition-transform duration-300" />
        </button>
        </div>

        {/* Output Section */}
        <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl">
        <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-black uppercase tracking-widest text-gray-400">You Receive</span>
        </div>
        <div className="flex justify-between items-center">
        <div className={`text-3xl font-black ${amount ? 'text-gray-900' : 'text-gray-300'}`}>
        {calculatedOutput}
        </div>
        <div className="bg-white px-4 py-2 rounded-xl flex items-center gap-3 border-2 border-gray-100 shadow-sm min-w-[110px] justify-center">
        {!isEthToBeer ? (
            <Gem className="w-5 h-5 text-[#FBB117] drop-shadow-[0_0_3px_rgba(251,177,23,0.4)]" />
        ) : (
            <Beer className="w-5 h-5 text-orange-600" />
        )}
        <span className="font-black text-gray-900 text-sm">
        {!isEthToBeer ? '$ETH' : '$BEER'}
        </span>
        </div>
        </div>
        </div>

        {/* Action Button */}
        <button
        onClick={handleSwapAction}
        className="w-full mt-6 bg-gray-900 hover:bg-[#FBB117] text-white hover:text-gray-900 font-black py-5 rounded-2xl transition-all shadow-lg active:scale-[0.98] uppercase tracking-tighter text-lg"
        >
        {isConnected
            ? `Initialize ${isEthToBeer ? '$ETH' : '$BEER'} Swap`
            : 'Connect Wallet'}
            </button>
            </div>
            </section>

            <section className="mt-8 bg-white border border-gray-100 rounded-2xl p-5 flex gap-4 items-start shadow-sm">
            <div className="text-[#FBB117] mt-1 shrink-0">
            <Info size={24} strokeWidth={3} />
            </div>
            <div>
            <h4 className="text-gray-900 font-black text-sm uppercase tracking-tight">Exchange Rate</h4>
            <p className="text-gray-500 text-xs mt-1 leading-relaxed font-medium">
            Rate: 1 ETH = {EXCHANGE_RATE} BEER. Redemptions are processed instantly via the Beer Exchange.
            </p>
            </div>
            </section>
            </div>
            </div>
            </div>
    );
}
