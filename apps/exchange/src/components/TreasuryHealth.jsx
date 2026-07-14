import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useReadContracts, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import {
  ADDRESSES,
  TREASURY_ABI,
  ERC20_ABI,
  PAIR_ABI,
  TOKEN_DEPLOYER_ABI,
  NFT_DEPLOYER_ABI,
} from '../contracts';

function fmtEth(wei) {
  if (wei === undefined || wei === null) return '-';
  return parseFloat(formatUnits(wei, 18)).toFixed(4);
}
function fmtToken(wei) {
  if (wei === undefined || wei === null) return '-';
  const n = parseFloat(formatUnits(wei, 18));
  return n % 1 === 0 ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function StatCard({ label, value, sub, accent }) {
  const accents = {
    green:  'border-hub-green text-hub-green',
    amber:  'border-amber-400 text-amber-500',
    sky:    'border-sky-400 text-sky-500',
    violet: 'border-violet-400 text-violet-500',
    gray:   'border-gray-300 text-gray-500',
  };
  const [border, text] = (accents[accent] ?? accents.gray).split(' ');
  return (
    <div className={`bg-white border-l-4 ${border} rounded-xl p-4 shadow-sm`}>
      <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-black ${text}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 font-medium mt-0.5">{sub}</p>}
    </div>
  );
}

const TABS = ['Treasury', 'Tokens', 'Market'];

export default function TreasuryHealth() {
  const publicClient            = usePublicClient();
  const [batchMetrics, setBatchMetrics] = useState(null);
  const [activeTab, setActiveTab]       = useState('Treasury');
  const [refreshKey, setRefreshKey]     = useState(0);

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { address: ADDRESSES.TREASURY,       abi: TREASURY_ABI,      functionName: 'accumulatedFees' }, // 0
      { address: ADDRESSES.TREASURY,       abi: TREASURY_ABI,      functionName: 'nextBatchId'     }, // 1
      { address: ADDRESSES.BEER_TOKEN,     abi: ERC20_ABI,          functionName: 'totalSupply'     }, // 2
      { address: ADDRESSES.STK_HOMESTEAD,  abi: ERC20_ABI,          functionName: 'totalSupply'     }, // 3
      { address: ADDRESSES.BEER_WETH_PAIR, abi: PAIR_ABI,           functionName: 'getReserves'     }, // 4
      { address: ADDRESSES.TOKEN_DEPLOYER, abi: TOKEN_DEPLOYER_ABI, functionName: 'totalTokens'     }, // 5
      { address: ADDRESSES.NFT_DEPLOYER,   abi: NFT_DEPLOYER_ABI,   functionName: 'totalContracts'  }, // 6
      { address: ADDRESSES.BEER_TOKEN,     abi: ERC20_ABI,           functionName: 'symbol'          }, // 7
      { address: ADDRESSES.STK_HOMESTEAD,  abi: ERC20_ABI,           functionName: 'symbol'          }, // 8
      { address: ADDRESSES.TREASURY,       abi: TREASURY_ABI,        functionName: 'floorBalance'    }, // 9
    ],
    query: { refetchInterval: 30_000 },
  });

  const fees         = data?.[0]?.result;
  const nextBatchId  = data?.[1]?.result;
  const beerSupply   = data?.[2]?.result;
  const stkSupply    = data?.[3]?.result;
  const reserves     = data?.[4]?.result;
  const totalTokens  = data?.[5]?.result;
  const totalNFTCols = data?.[6]?.result;
  const beerSymbol   = data?.[7]?.result;
  const stkSymbol    = data?.[8]?.result;
  const floor        = data?.[9]?.result;

  // r0 = BEER, r1 = WETH
  const beerSpot = reserves?.[0] && reserves[0] > 0n
    ? Number(formatUnits(reserves[1], 18)) / Number(formatUnits(reserves[0], 18))
    : null;

  useEffect(() => {
    if (!publicClient) return;
    if (!nextBatchId || nextBatchId === 0n) {
      setBatchMetrics({ totalStaked: 0n, totalClaimable: 0n, totalNFTs: 0n, totalRedeemed: 0n });
      return;
    }
    const count = Number(nextBatchId);
    const batchCalls = Array.from({ length: count }, (_, i) => ({
      address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'batches', args: [BigInt(i)],
    }));
    const claimCalls = Array.from({ length: count }, (_, i) => ({
      address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'claimableStake', args: [BigInt(i)],
    }));
    publicClient.multicall({ contracts: [...batchCalls, ...claimCalls] }).then(results => {
      const batchRes = results.slice(0, count);
      const claimRes = results.slice(count);
      let totalStaked = 0n, totalClaimable = 0n, totalNFTs = 0n, totalRedeemed = 0n;
      batchRes.forEach(r => {
        if (r.status !== 'success') return;
        const b = r.result;
        if (!b.slashed) totalStaked += b.stakedAmount;
        totalNFTs     += b.totalNFTs;
        totalRedeemed += b.redeemedCount;
      });
      claimRes.forEach(r => { if (r.status === 'success') totalClaimable += r.result; });
      setBatchMetrics({ totalStaked, totalClaimable, totalNFTs, totalRedeemed });
    });
  }, [nextBatchId, publicClient, refreshKey]);

  const handleRefresh = () => { refetch(); setRefreshKey(k => k + 1); };

  const redemptionRate = batchMetrics?.totalNFTs > 0n
    ? Math.round(Number(batchMetrics.totalRedeemed) / Number(batchMetrics.totalNFTs) * 100)
    : 0;

  const loading = isLoading || batchMetrics === null;

  return (
    <section className="mt-8 bg-white shadow-md rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-gray-900">Treasury Health</h2>
          {ADDRESSES.TREASURY && (
            <a
              href={`https://taikoscan.io/address/${ADDRESSES.TREASURY}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-hub-green transition-colors font-mono mt-0.5"
            >
              {ADDRESSES.TREASURY.slice(0, 10)}…{ADDRESSES.TREASURY.slice(-8)}
              <ExternalLink size={10} />
            </a>
          )}
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg text-gray-400 hover:text-hub-green hover:bg-gray-100 transition-all"
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-4 ${
              activeTab === tab
                ? 'border-hub-green text-hub-green bg-white'
                : 'border-transparent text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border-l-4 border-gray-100 rounded-xl p-4 shadow-sm animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
                <div className="h-6 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'Treasury' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label="Total Stake"         value={`${fmtEth(floor)} ETH`}                        sub="All producer ETH in protocol" accent="green"  />
                <StatCard label="Active Stake (TVL)"  value={`${fmtEth(batchMetrics?.totalStaked)} ETH`}    sub="Locked producer collateral"   accent="sky"    />
                <StatCard label="Claimable"           value={`${fmtEth(batchMetrics?.totalClaimable)} ETH`} sub="Ready for producer claims"    accent="violet" />
              </div>
            )}

            {activeTab === 'Tokens' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label={`${beerSymbol ?? '…'} Supply`}  value={`${fmtToken(beerSupply)} ${beerSymbol ?? '…'}`}  sub="Tokens in circulation"                              accent="amber" />
                <StatCard label={`${stkSymbol ?? '…'} Supply`}  value={`${fmtToken(stkSupply)} ${stkSymbol ?? '…'}`}   sub="Staked credentials issued"                          accent="green" />
                <StatCard label={`${beerSymbol ?? '…'} Spot`}   value={beerSpot ? `${beerSpot.toFixed(6)} ETH` : '-'}  sub={`Per ${beerSymbol ?? '…'} -live DEX price`}         accent="sky"   />
              </div>
            )}

            {activeTab === 'Market' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label="Production Lots" value={nextBatchId?.toString() ?? '0'}                sub="Total batches opened"    accent="gray"  />
                <StatCard label="NFTs Minted"     value={batchMetrics?.totalNFTs?.toString() ?? '0'}   sub="Across all lots"         accent="gray"  />
                <StatCard label="Redeemed"        value={batchMetrics?.totalRedeemed?.toString() ?? '0'} sub="Confirmed deliveries"  accent="green" />
                <StatCard label="Redemption Rate" value={`${redemptionRate}%`}                          sub="Of all minted NFTs"      accent={redemptionRate >= 50 ? 'green' : 'gray'} />
                <StatCard label="Token Types"     value={totalTokens?.toString() ?? '0'}                sub="Deployed via platform"   accent="gray"  />
                <StatCard label="NFT Collections" value={totalNFTCols?.toString() ?? '0'}               sub="Deployed via platform"   accent="gray"  />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
