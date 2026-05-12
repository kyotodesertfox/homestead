import React, { useState, useMemo, useEffect } from 'react';
import { Beer, ChevronLeft, ChevronRight, Wallet, X } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import {
  useAccount, useReadContract, useReadContracts,
  useWriteContract, useWaitForTransactionReceipt,
} from 'wagmi';
import { formatUnits } from 'viem';
import { ADDRESSES, MARKETPLACE_ABI, ERC20_ABI, CONTRACT_URI_ABI } from '../../contracts';

const IPFS_GATEWAY = 'https://cloudflare-ipfs.com/ipfs/';
function toHttp(uri) {
  if (!uri) return null;
  return uri.startsWith('ipfs://') ? IPFS_GATEWAY + uri.slice(7) : uri;
}

function useBeerTokenImage() {
  const { data: uri } = useReadContract({
    address: ADDRESSES.BEER_TOKEN,
    abi: CONTRACT_URI_ABI,
    functionName: 'contractURI',
  });
  const [imgSrc, setImgSrc] = useState(null);
  useEffect(() => {
    if (!uri) return;
    async function resolve() {
      try {
        let meta;
        if (uri.startsWith('data:application/json')) {
          meta = JSON.parse(atob(uri.split(',')[1]));
        } else {
          meta = await fetch(toHttp(uri)).then(r => r.json());
        }
        setImgSrc(toHttp(meta?.image) ?? null);
      } catch { }
    }
    resolve();
  }, [uri]);
  return imgSrc;
}

const LISTINGS_PER_PAGE = 8;

function formatAddress(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatBeer(wei) {
  const n = parseFloat(formatUnits(wei, 18));
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
}

export default function MarketplacePage() {
  const { open }               = useAppKit();
  const { isConnected, address } = useAccount();

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId]   = useState(null);

  const beerImg = useBeerTokenImage();

  const { data: nextId } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi: MARKETPLACE_ABI,
    functionName: 'nextListingId',
  });

  const listingContracts = useMemo(() => {
    if (!nextId) return [];
    return Array.from({ length: Number(nextId) }, (_, i) => ({
      address: ADDRESSES.MARKETPLACE,
      abi: MARKETPLACE_ABI,
      functionName: 'getListing',
      args: [BigInt(i)],
    }));
  }, [nextId]);

  const { data: listingsRaw } = useReadContracts({ contracts: listingContracts });

  const listings = useMemo(() => {
    if (!listingsRaw) return [];
    return listingsRaw
      .map((r, i) => {
        if (r.status !== 'success') return null;
        const [nftContract, paymentToken, price, proceeds, inventoryCount, active] = r.result;
        return { id: i, nftContract, paymentToken, price, proceeds, inventoryCount, active };
      })
      .filter(Boolean);
  }, [listingsRaw]);

  const activeListings = listings.filter(l => l.active && l.inventoryCount > 0n);
  const totalPages     = Math.ceil(activeListings.length / LISTINGS_PER_PAGE);
  const pageListings   = activeListings.slice(
    (currentPage - 1) * LISTINGS_PER_PAGE,
    currentPage * LISTINGS_PER_PAGE,
  );

  const selectedListing = selectedId !== null ? listings.find(l => l.id === selectedId) : null;
  const isLoading       = nextId === undefined;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: ADDRESSES.BEER_TOKEN,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address ?? '0x0000000000000000000000000000000000000000', ADDRESSES.MARKETPLACE],
    query: { enabled: !!address && !!selectedListing },
  });
  const needsApproval = allowance !== undefined && !!selectedListing && allowance < selectedListing.price;

  const { writeContract: writeApprove, data: approveTxHash } = useWriteContract();
  const { writeContract: writeBuy,     data: buyTxHash }     = useWriteContract();

  const { isLoading: approving, isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: buying,    isSuccess: buyConfirmed }     = useWaitForTransactionReceipt({ hash: buyTxHash });

  useEffect(() => { if (approveConfirmed) refetchAllowance(); }, [approveConfirmed, refetchAllowance]);
  useEffect(() => { if (buyConfirmed) setSelectedId(null); }, [buyConfirmed]);

  const handleApprove = () => {
    if (!selectedListing) return;
    writeApprove({ address: ADDRESSES.BEER_TOKEN, abi: ERC20_ABI, functionName: 'approve', args: [ADDRESSES.MARKETPLACE, selectedListing.price] });
  };

  const handleBuy = () => {
    if (!selectedListing) return;
    writeBuy({ address: ADDRESSES.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: 'buy', args: [BigInt(selectedListing.id)] });
  };

  let modalButton;
  if (!isConnected) {
    modalButton = (
      <button onClick={() => open()} className="w-full bg-gray-900 hover:bg-[#FBB117] text-white hover:text-gray-900 font-black py-4 rounded-xl transition-all uppercase tracking-tighter text-sm">
        Connect Wallet
      </button>
    );
  } else if (!selectedListing?.active) {
    modalButton = (
      <button disabled className="w-full bg-gray-200 text-gray-400 font-black py-4 rounded-xl uppercase tracking-tighter text-sm cursor-not-allowed">
        Unavailable
      </button>
    );
  } else if (needsApproval) {
    modalButton = (
      <button onClick={handleApprove} disabled={approving} className="w-full bg-amber-500 hover:bg-amber-400 text-white font-black py-4 rounded-xl transition-all uppercase tracking-tighter text-sm disabled:opacity-50">
        {approving ? 'Approving...' : `Approve ${formatBeer(selectedListing.price)} $BEER`}
      </button>
    );
  } else {
    modalButton = (
      <button onClick={handleBuy} disabled={buying} className="w-full bg-gray-900 hover:bg-[#FBB117] text-white hover:text-gray-900 font-black py-4 rounded-xl transition-all uppercase tracking-tighter text-sm disabled:opacity-50">
        {buying ? 'Buying...' : `Buy for ${formatBeer(selectedListing?.price ?? 0n)} $BEER`}
      </button>
    );
  }

  return (
    <div className="bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">

        <header className="mb-12 border-b-8 border-[#FBB117] pb-6 flex flex-col md:flex-row justify-between items-end">
          <div className="w-full md:w-auto">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900">
              Beer <span className="text-[#FBB117]">Market</span>
            </h1>
            <p className="text-gray-600 font-bold mt-2 uppercase tracking-widest text-sm italic">
              Live Listings
            </p>
          </div>
          {totalPages > 1 && (
            <div className="text-right hidden md:block">
              <span className="text-3xl font-black text-gray-200 uppercase tracking-tighter">
                {currentPage} / {totalPages}
              </span>
            </div>
          )}
        </header>

        {isLoading ? (
          <div className="text-center py-20 bg-white rounded-3xl border-4 border-dashed border-gray-200">
            <Beer size={48} className="mx-auto text-gray-300 mb-4 animate-bounce" />
            <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest">Loading Listings...</h2>
          </div>
        ) : activeListings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-4 border-dashed border-gray-200">
            <Beer size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest">No Listings Yet</h2>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {pageListings.map((listing) => (
                <div
                  key={listing.id}
                  onClick={() => setSelectedId(listing.id)}
                  className="bg-white border-2 border-[#FBB117] rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex justify-center mb-4">
                    <div className="w-24 h-24 rounded-full border-4 border-[#FBB117] bg-amber-50 flex items-center justify-center">
                      <Beer size={40} className="text-[#FBB117]" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-gray-900 font-black uppercase tracking-tight text-base">
                      Listing #{listing.id}
                    </h3>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      {beerImg
                        ? <img src={beerImg} alt="$BEER" className="w-4 h-4 rounded-full object-cover" />
                        : <div className="w-4 h-4 rounded-full bg-amber-400" />}
                      <span className="text-xs font-black text-gray-700">{formatBeer(listing.price)} $BEER</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                      <div className="flex items-center justify-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        <Wallet size={10} />
                        {formatAddress(listing.proceeds)}
                      </div>
                      <div className="text-[9px] font-black text-green-500 uppercase tracking-widest">
                        ● Available
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 border-2 border-gray-900 rounded-lg disabled:opacity-20 hover:bg-[#FBB117] transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 font-black rounded-lg border-2 transition-all ${
                        currentPage === i + 1
                          ? 'bg-gray-900 text-[#FBB117] border-gray-900'
                          : 'bg-white text-gray-400 border-gray-200 hover:border-gray-900'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 border-2 border-gray-900 rounded-lg disabled:opacity-20 hover:bg-[#FBB117] transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedListing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-amber-50 h-56 flex items-center justify-center">
              <Beer size={80} className="text-[#FBB117] opacity-40" />
              <button
                onClick={() => setSelectedId(null)}
                className="absolute top-3 right-3 bg-white rounded-full p-1.5 shadow-md hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-gray-700" />
              </button>
            </div>

            <div className="border-t-8 border-[#FBB117] p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900">
                  Listing #{selectedListing.id}
                </h2>
                <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ml-3 mt-1 ${selectedListing.active ? 'text-green-500' : 'text-red-400'}`}>
                  {selectedListing.active ? '● Available' : '● Unavailable'}
                </span>
              </div>

              <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {beerImg
                      ? <img src={beerImg} alt="$BEER" className="w-4 h-4 rounded-full object-cover" />
                      : <div className="w-4 h-4 rounded-full bg-amber-400" />}
                    <span className="text-sm font-black text-gray-900">{formatBeer(selectedListing.price)} $BEER</span>
                  </div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Price</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Wallet size={12} className="text-[#FBB117]" />
                    <span className="text-[11px] font-black text-gray-900">{formatAddress(selectedListing.proceeds)}</span>
                  </div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Seller</div>
                </div>
              </div>

              {modalButton}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
