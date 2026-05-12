import React, { useState, useMemo, useEffect } from 'react';
import { Beer, Wallet, Copy, CheckCheck, ExternalLink, ShoppingBag, Archive, ArrowDownToLine } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import {
  useAccount, useBalance, useReadContract, useReadContracts,
  useWriteContract, useWaitForTransactionReceipt,
} from 'wagmi';
import { formatUnits } from 'viem';
import {
  ADDRESSES, ERC20_ABI, NFT_ABI, TREASURY_ABI, MARKETPLACE_ABI, CONTRACT_URI_ABI,
} from '../../contracts';

const IPFS_GATEWAY = 'https://cloudflare-ipfs.com/ipfs/';
function toHttp(uri) {
  if (!uri) return null;
  return uri.startsWith('ipfs://') ? IPFS_GATEWAY + uri.slice(7) : uri;
}

function fmt(addr) { return `${addr.slice(0, 6)}...${addr.slice(-4)}`; }
function fmtEth(wei)  { return parseFloat(formatUnits(wei, 18)).toFixed(4); }
function fmtBeer(wei) { const n = parseFloat(formatUnits(wei, 18)); return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2); }

// Fetches and resolves a token's metadata image from contractURI or tokenURI
function useNFTImage(tokenURI) {
  const [imgSrc, setImgSrc] = useState(null);
  useEffect(() => {
    if (!tokenURI) return;
    async function resolve() {
      try {
        const meta = await fetch(toHttp(tokenURI)).then(r => r.json());
        setImgSrc(toHttp(meta?.image) ?? null);
      } catch { }
    }
    resolve();
  }, [tokenURI]);
  return imgSrc;
}

function NFTCard({ tokenId, onRedeem, redeemPending }) {
  const { data: uri } = useReadContract({
    address: ADDRESSES.BEER_NFT,
    abi: NFT_ABI,
    functionName: 'tokenURI',
    args: [tokenId],
  });
  const imgSrc = useNFTImage(uri);

  return (
    <div className="bg-white rounded-2xl border-2 border-[#FBB117] overflow-hidden shadow-sm">
      <div className="bg-amber-50 h-36 flex items-center justify-center">
        {imgSrc
          ? <img src={imgSrc} alt={`Beer #${tokenId}`} className="w-full h-full object-cover" />
          : <Beer size={48} className="text-[#FBB117] opacity-40" />}
      </div>
      <div className="p-4">
        <p className="font-black text-gray-900 uppercase tracking-tight text-sm">Beer #{tokenId.toString()}</p>
        <button
          onClick={() => onRedeem(tokenId)}
          disabled={redeemPending}
          className="mt-3 w-full bg-gray-900 hover:bg-[#FBB117] text-white hover:text-gray-900 font-black py-2 rounded-xl text-xs uppercase tracking-widest transition-all disabled:opacity-40"
        >
          {redeemPending ? 'Confirming...' : 'Pour This Beer'}
        </button>
      </div>
    </div>
  );
}

function TreasuryNFTCard({ tokenId, priceWei, onPurchase, purchasing }) {
  const { data: uri } = useReadContract({
    address: ADDRESSES.BEER_NFT,
    abi: NFT_ABI,
    functionName: 'tokenURI',
    args: [tokenId],
  });
  const imgSrc = useNFTImage(uri);

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 hover:border-[#FBB117] overflow-hidden shadow-sm transition-all">
      <div className="bg-gray-50 h-36 flex items-center justify-center">
        {imgSrc
          ? <img src={imgSrc} alt={`Beer #${tokenId}`} className="w-full h-full object-cover" />
          : <Beer size={48} className="text-gray-300" />}
      </div>
      <div className="p-4">
        <p className="font-black text-gray-900 uppercase tracking-tight text-sm">Beer #{tokenId.toString()}</p>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{fmtEth(priceWei)} ETH</p>
        <button
          onClick={() => onPurchase(tokenId)}
          disabled={purchasing}
          className="mt-3 w-full bg-[#FBB117] hover:bg-amber-400 text-gray-900 font-black py-2 rounded-xl text-xs uppercase tracking-widest transition-all disabled:opacity-40"
        >
          {purchasing ? 'Confirming...' : 'Post Collateral'}
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { open }               = useAppKit();
  const { isConnected, address } = useAccount();
  const [copied, setCopied]    = useState(false);

  const { data: ethBalance }  = useBalance({ address, query: { enabled: !!address } });
  const { data: beerBalance } = useBalance({ address, token: ADDRESSES.BEER_TOKEN, query: { enabled: !!address } });

  // --- Your beer NFTs ---
  const { data: yourNFTCount } = useReadContract({
    address: ADDRESSES.BEER_NFT,
    abi: NFT_ABI,
    functionName: 'balanceOf',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address },
  });

  const yourNFTContracts = useMemo(() => {
    if (!yourNFTCount || yourNFTCount === 0n) return [];
    return Array.from({ length: Number(yourNFTCount) }, (_, i) => ({
      address: ADDRESSES.BEER_NFT,
      abi: NFT_ABI,
      functionName: 'tokenOfOwnerByIndex',
      args: [address, BigInt(i)],
    }));
  }, [yourNFTCount, address]);

  const { data: yourNFTData } = useReadContracts({ contracts: yourNFTContracts });
  const yourTokenIds = useMemo(() =>
    (yourNFTData ?? []).filter(r => r.status === 'success').map(r => r.result),
    [yourNFTData]
  );

  // --- Treasury available NFTs ---
  const { data: treasuryNFTCount } = useReadContract({
    address: ADDRESSES.BEER_NFT,
    abi: NFT_ABI,
    functionName: 'balanceOf',
    args: [ADDRESSES.TREASURY],
  });

  const treasuryNFTContracts = useMemo(() => {
    if (!treasuryNFTCount || treasuryNFTCount === 0n) return [];
    return Array.from({ length: Number(treasuryNFTCount) }, (_, i) => ({
      address: ADDRESSES.BEER_NFT,
      abi: NFT_ABI,
      functionName: 'tokenOfOwnerByIndex',
      args: [ADDRESSES.TREASURY, BigInt(i)],
    }));
  }, [treasuryNFTCount]);

  const { data: treasuryNFTData } = useReadContracts({ contracts: treasuryNFTContracts });
  const treasuryTokenIds = useMemo(() =>
    (treasuryNFTData ?? []).filter(r => r.status === 'success').map(r => r.result),
    [treasuryNFTData]
  );

  const { data: nftPrice } = useReadContract({
    address: ADDRESSES.TREASURY,
    abi: TREASURY_ABI,
    functionName: 'nftPrices',
    args: [ADDRESSES.BEER_NFT],
  });

  // --- Redeem flow ---
  const { data: isApprovedAll } = useReadContract({
    address: ADDRESSES.BEER_NFT,
    abi: NFT_ABI,
    functionName: 'isApprovedForAll',
    args: [address ?? '0x0000000000000000000000000000000000000000', ADDRESSES.MARKETPLACE],
    query: { enabled: !!address },
  });

  const { writeContract: writeApproveAll, data: approveAllTxHash } = useWriteContract();
  const { writeContract: writeRedeem,    data: redeemTxHash }      = useWriteContract();
  const { writeContract: writePurchase,  data: purchaseTxHash }    = useWriteContract();

  const { isLoading: approvingAll, isSuccess: approvedAll } = useWaitForTransactionReceipt({ hash: approveAllTxHash });
  const { isLoading: redeeming }                            = useWaitForTransactionReceipt({ hash: redeemTxHash });
  const { isLoading: purchasing }                           = useWaitForTransactionReceipt({ hash: purchaseTxHash });

  const [pendingRedeemId, setPendingRedeemId] = useState(null);

  const handleRedeem = (tokenId) => {
    if (!isApprovedAll && !approvedAll) {
      setPendingRedeemId(tokenId);
      writeApproveAll({
        address: ADDRESSES.BEER_NFT,
        abi: NFT_ABI,
        functionName: 'setApprovalForAll',
        args: [ADDRESSES.MARKETPLACE, true],
      });
      return;
    }
    setPendingRedeemId(tokenId);
    writeRedeem({
      address: ADDRESSES.MARKETPLACE,
      abi: MARKETPLACE_ABI,
      functionName: 'redeem',
      args: [ADDRESSES.BEER_NFT, tokenId],
    });
  };

  // After approval, trigger the pending redeem
  useEffect(() => {
    if (approvedAll && pendingRedeemId !== null) {
      writeRedeem({
        address: ADDRESSES.MARKETPLACE,
        abi: MARKETPLACE_ABI,
        functionName: 'redeem',
        args: [ADDRESSES.BEER_NFT, pendingRedeemId],
      });
    }
  }, [approvedAll, pendingRedeemId]);

  const handlePurchase = (tokenId) => {
    if (!nftPrice) return;
    writePurchase({
      address: ADDRESSES.TREASURY,
      abi: TREASURY_ABI,
      functionName: 'purchaseInventoryNFT',
      args: [ADDRESSES.BEER_NFT, tokenId],
      value: nftPrice,
    });
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center py-20 px-4">
        <div className="text-center max-w-sm">
          <Beer size={56} className="mx-auto text-[#FBB117] mb-6" />
          <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900 mb-2">Your Dashboard</h2>
          <p className="text-gray-500 font-medium mb-8 text-sm">Connect your wallet to view your beer stash, post collateral, and more.</p>
          <button
            onClick={() => open()}
            className="bg-[#FBB117] hover:bg-amber-400 text-gray-900 font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-sm shadow-lg transition-all active:scale-95"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Header */}
        <header className="border-b-8 border-[#FBB117] pb-6">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900">
            Your <span className="text-[#FBB117]">Dashboard</span>
          </h1>
        </header>

        {/* Wallet Summary */}
        <section className="bg-white rounded-3xl border-2 border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Wallet size={20} className="text-[#FBB117]" />
            <h2 className="font-black uppercase tracking-tight text-gray-900">Wallet</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 bg-gray-50 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Address</p>
              <div className="flex items-center gap-2">
                <span className="font-black text-gray-900 text-sm">{fmt(address)}</span>
                <button onClick={copyAddress} className="text-gray-400 hover:text-[#FBB117] transition-colors">
                  {copied ? <CheckCheck size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
                <a href={`https://taikoscan.io/address/${address}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#FBB117] transition-colors">
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-gray-50 rounded-2xl p-4 min-w-[120px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">ETH</p>
                <p className="font-black text-gray-900 text-lg">{ethBalance ? fmtEth(ethBalance.value) : '—'}</p>
              </div>
              <div className="bg-amber-50 rounded-2xl p-4 min-w-[120px] border border-[#FBB117]/30">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">$BEER</p>
                <p className="font-black text-gray-900 text-lg">{beerBalance ? fmtBeer(beerBalance.value) : '—'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Your Beer Stash */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Archive size={20} className="text-[#FBB117]" />
            <h2 className="font-black uppercase tracking-tight text-gray-900">Your Beer Stash</h2>
            {yourTokenIds.length > 0 && (
              <span className="ml-1 bg-[#FBB117] text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">{yourTokenIds.length}</span>
            )}
          </div>
          {yourTokenIds.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-10 text-center">
              <Beer size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No beers in your stash yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {yourTokenIds.map(tokenId => (
                <NFTCard
                  key={tokenId.toString()}
                  tokenId={tokenId}
                  onRedeem={handleRedeem}
                  redeemPending={(redeeming || approvingAll) && pendingRedeemId === tokenId}
                />
              ))}
            </div>
          )}
          {yourTokenIds.length > 0 && (
            <p className="mt-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              "Pour This Beer" burns your token and confirms pickup with the brewer.
            </p>
          )}
        </section>

        {/* Post Collateral */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ArrowDownToLine size={20} className="text-[#FBB117]" />
            <h2 className="font-black uppercase tracking-tight text-gray-900">Post Collateral</h2>
            {treasuryTokenIds.length > 0 && (
              <span className="ml-1 bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">{treasuryTokenIds.length} available</span>
            )}
          </div>
          <p className="text-xs font-medium text-gray-500 mb-4">
            Pay ETH to acquire a production slot. The ETH is permanently locked as the ecosystem's price floor.
          </p>
          {!nftPrice || nftPrice === 0n ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-10 text-center">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No inventory available right now</p>
            </div>
          ) : treasuryTokenIds.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-10 text-center">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Sold out — check back soon</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {treasuryTokenIds.map(tokenId => (
                <TreasuryNFTCard
                  key={tokenId.toString()}
                  tokenId={tokenId}
                  priceWei={nftPrice}
                  onPurchase={handlePurchase}
                  purchasing={purchasing}
                />
              ))}
            </div>
          )}
        </section>

        {/* Market Quick View */}
        <MarketQuickView />

      </div>
    </div>
  );
}

function MarketQuickView() {
  const { data: nextId } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi: MARKETPLACE_ABI,
    functionName: 'nextListingId',
  });

  const contracts = useMemo(() => {
    if (!nextId) return [];
    return Array.from({ length: Number(nextId) }, (_, i) => ({
      address: ADDRESSES.MARKETPLACE,
      abi: MARKETPLACE_ABI,
      functionName: 'getListing',
      args: [BigInt(i)],
    }));
  }, [nextId]);

  const { data: raw } = useReadContracts({ contracts });

  const listings = useMemo(() => {
    if (!raw) return [];
    return raw.map((r, i) => {
      if (r.status !== 'success') return null;
      const [nftContract, paymentToken, price, proceeds, inventoryCount, active] = r.result;
      return { id: i, price, proceeds, inventoryCount, active };
    }).filter(r => r && r.active && r.inventoryCount > 0n);
  }, [raw]);

  if (listings.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBag size={20} className="text-[#FBB117]" />
        <h2 className="font-black uppercase tracking-tight text-gray-900">On the Market</h2>
        <a href="/beer/marketplace" className="ml-auto text-[10px] font-black uppercase tracking-widest text-[#FBB117] hover:underline">
          View All →
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {listings.map(l => (
          <div key={l.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-amber-50 border-2 border-[#FBB117] flex items-center justify-center shrink-0">
              <Beer size={24} className="text-[#FBB117]" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 text-sm uppercase tracking-tight">Listing #{l.id}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{fmtBeer(l.price)} $BEER · {l.inventoryCount.toString()} left</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
