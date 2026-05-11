import React, { useState } from 'react';
import { Beer, ChevronLeft, ChevronRight, FlaskConical, Wallet, Gem, X } from 'lucide-react';
// import { useReadContract } from 'wagmi';

// TODO: Replace with deployed contract address on Taiko Mainnet
const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

const MARKETPLACE_ABI = [
  {
    name: 'getListings',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'id',           type: 'uint256' },
          { name: 'seller',       type: 'address' },
          { name: 'beerName',     type: 'string'  },
          { name: 'style',        type: 'string'  },
          { name: 'quantity',     type: 'uint256' },
          { name: 'pricePerUnit', type: 'uint256' },
          { name: 'beerPrice',    type: 'uint256' },
          { name: 'image',        type: 'string'  },
          { name: 'description',  type: 'string'  },
          { name: 'isActive',     type: 'bool'    },
        ],
      },
    ],
  },
];

const PLACEHOLDER_LISTINGS = [
  { id: 1,  seller: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', beerName: 'Golden Hour Saison',   style: 'Saison',            quantity: 6,  pricePerUnit: '0.005', isActive: true,  image: null, description: 'A bright, effervescent saison brewed with Belgian yeast and a subtle citrus character. Light-bodied and dry with a peppery finish — perfect for warm days.' },
  { id: 2,  seller: '0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6', beerName: 'Midnight Stout',       style: 'Imperial Stout',    quantity: 12, pricePerUnit: '0.008', isActive: true,  image: null, description: 'A full-bodied imperial stout aged with vanilla and roasted malt. Deep notes of dark chocolate and espresso with a silky, warming finish.' },
  { id: 3,  seller: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', beerName: 'Hophead Pale Ale',     style: 'American Pale Ale', quantity: 4,  pricePerUnit: '0.004', isActive: true,  image: null, description: 'A hop-forward American pale ale bursting with citrus and pine aromas. Clean malt backbone lets the Cascade and Centennial hops shine.' },
  { id: 4,  seller: '0x53d284357ec70cE289D6D64134DfAc8E511c8a3D', beerName: 'Raspberry Wheat',      style: 'Fruit Wheat',       quantity: 8,  pricePerUnit: '0.003', isActive: false, image: null, description: 'A smooth wheat ale brewed with fresh raspberries. Tart, fruity, and refreshing — a seasonal favorite that pours a beautiful hazy pink.' },
  { id: 5,  seller: '0xFe9e8709d3215310075d67E3ed32A380CCf451C8', beerName: 'Barrel-Aged Porter',   style: 'Baltic Porter',     quantity: 3,  pricePerUnit: '0.012', isActive: true,  image: null, description: 'A robust porter aged in bourbon barrels for 6 months. Rich with notes of oak, caramel, and dark fruit with a long, warming finish.' },
  { id: 6,  seller: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', beerName: 'West Coast IPA',       style: 'IPA',               quantity: 24, pricePerUnit: '0.006', isActive: true,  image: null, description: 'A classic West Coast IPA with aggressive dry hopping. Bright citrus and tropical aromas with a clean, bitter finish.' },
  { id: 7,  seller: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', beerName: 'Hefeweizen',           style: 'German Wheat',      quantity: 6,  pricePerUnit: '0.004', isActive: true,  image: null, description: 'An authentic German-style wheat beer with characteristic banana and clove notes. Cloudy, refreshing, and easy drinking.' },
  { id: 8,  seller: '0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6', beerName: 'Oatmeal Cream Stout', style: 'Oatmeal Stout',     quantity: 0,  pricePerUnit: '0.007', isActive: false, image: null, description: 'A smooth, creamy stout brewed with flaked oats for a silky mouthfeel. Roasty chocolate notes with a soft, sweet finish.' },
  { id: 9,  seller: '0x53d284357ec70cE289D6D64134DfAc8E511c8a3D', beerName: 'Kölsch',              style: 'Kölsch',            quantity: 18, pricePerUnit: '0.003', isActive: true,  image: null, description: 'A crisp, clean Kölsch fermented cold for a lagered character. Light golden with subtle fruitiness and a dry, refreshing finish.' },
  { id: 10, seller: '0xFe9e8709d3215310075d67E3ed32A380CCf451C8', beerName: 'Dry Irish Stout',      style: 'Irish Stout',       quantity: 12, pricePerUnit: '0.004', isActive: true,  image: null, description: 'A session-strength dry stout inspired by the Dublin classics. Roasty, dry, and dangerously drinkable.' },
];

export default function MarketplacePage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedListing, setSelectedListing] = useState(null);
  const listingsPerPage = 8;

  // TODO: Uncomment when contract is deployed and remove PLACEHOLDER_LISTINGS
  // const { data: contractListings, isLoading } = useReadContract({
  //   address: CONTRACT_ADDRESS,
  //   abi: MARKETPLACE_ABI,
  //   functionName: 'getListings',
  // });
  // const listings = contractListings ?? [];

  const listings = PLACEHOLDER_LISTINGS;
  const isLoading = false;

  const totalPages = Math.ceil(listings.length / listingsPerPage);
  const currentListings = listings.slice(
    (currentPage - 1) * listingsPerPage,
    currentPage * listingsPerPage
  );

  const formatAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

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

    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    {currentListings.map((listing) => (
      <div
      key={listing.id}
      onClick={() => setSelectedListing(listing)}
      className={`bg-white border-2 rounded-xl p-6 shadow-sm hover:shadow-md transition-all relative group cursor-pointer ${listing.isActive ? 'border-[#FBB117]' : 'border-gray-200 opacity-60'}`}
      >

      <div className="flex justify-center mb-4">
      <div className="w-24 h-24 rounded-full border-4 border-[#FBB117] bg-amber-50 flex items-center justify-center overflow-hidden">
      {listing.image
        ? <img src={listing.image} alt={listing.beerName} className="w-full h-full object-cover" />
        : <Beer size={40} className="text-[#FBB117]" />
      }
      </div>
      </div>

      <div className="text-center">
      <h3 className="text-gray-900 font-black uppercase tracking-tight text-base truncate">
      {listing.beerName}
      </h3>
      <div className="flex items-center justify-center gap-1 mt-1">
      <FlaskConical size={14} className="text-[#FBB117]" />
      <span className="text-xs font-bold uppercase text-gray-500">{listing.style}</span>
      </div>
      <div className="flex items-center justify-center gap-1 mt-2">
      <Gem size={12} className="text-[#FBB117]" />
      <span className="text-xs font-black text-gray-700">1 $BEER</span>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
      <div className="flex items-center justify-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">
      <Wallet size={10} />
      {formatAddress(listing.seller)}
      </div>
      <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
      QTY: {listing.quantity}
      </div>
      <div className={`text-[9px] font-black uppercase tracking-widest ${listing.isActive ? 'text-green-500' : 'text-red-400'}`}>
      {listing.isActive ? '● Available' : '● Unavailable'}
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

    {isLoading && (
      <div className="text-center py-20 bg-white rounded-3xl border-4 border-dashed border-gray-200">
      <Beer size={48} className="mx-auto text-gray-300 mb-4 animate-bounce" />
      <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest">Loading Listings...</h2>
      </div>
    )}

    {!isLoading && listings.length === 0 && (
      <div className="text-center py-20 bg-white rounded-3xl border-4 border-dashed border-gray-200">
      <Beer size={48} className="mx-auto text-gray-300 mb-4" />
      <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest">No Listings Yet</h2>
      </div>
    )}

    </div>

    {/* Listing Modal */}
    {selectedListing && (
      <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={() => setSelectedListing(null)}
      >
      <div
      className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
      onClick={(e) => e.stopPropagation()}
      >

      {/* Image Area */}
      <div className="relative bg-amber-50 h-56 flex items-center justify-center">
      {selectedListing.image
        ? <img src={selectedListing.image} alt={selectedListing.beerName} className="w-full h-full object-cover" />
        : <Beer size={80} className="text-[#FBB117] opacity-40" />
      }
      <button
      onClick={() => setSelectedListing(null)}
      className="absolute top-3 right-3 bg-white rounded-full p-1.5 shadow-md hover:bg-gray-100 transition-colors"
      >
      <X size={18} className="text-gray-700" />
      </button>
      </div>

      {/* Content */}
      <div className="border-t-8 border-[#FBB117] p-6">
      <div className="flex justify-between items-start mb-1">
      <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 leading-tight">
      {selectedListing.beerName}
      </h2>
      <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ml-3 mt-1 ${selectedListing.isActive ? 'text-green-500' : 'text-red-400'}`}>
      {selectedListing.isActive ? '● Available' : '● Unavailable'}
      </span>
      </div>
      <div className="flex items-center gap-1 mb-4">
      <FlaskConical size={14} className="text-[#FBB117]" />
      <span className="text-xs font-bold uppercase text-gray-500">{selectedListing.style}</span>
      </div>

      <p className="text-gray-600 text-sm font-medium leading-relaxed mb-6">
      {selectedListing.description}
      </p>

      <div className="border-t border-gray-100 pt-4 grid grid-cols-3 gap-4 mb-6">
      <div className="text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
      <Gem size={12} className="text-[#FBB117]" />
      <span className="text-sm font-black text-gray-900">1 $BEER</span>
      </div>
      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Price</div>
      </div>
      <div className="text-center border-x border-gray-100">
      <div className="text-sm font-black text-gray-900 mb-1">{selectedListing.quantity}</div>
      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Available</div>
      </div>
      <div className="text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
      <Wallet size={12} className="text-[#FBB117]" />
      <span className="text-[11px] font-black text-gray-900">{formatAddress(selectedListing.seller)}</span>
      </div>
      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Seller</div>
      </div>
      </div>

      <button
      disabled={!selectedListing.isActive}
      className="w-full bg-gray-900 hover:bg-[#FBB117] text-white hover:text-gray-900 font-black py-4 rounded-xl transition-all uppercase tracking-tighter text-sm disabled:opacity-30 disabled:cursor-not-allowed"
      >
      Acquire Listing
      </button>
      </div>
      </div>
      </div>
    )}

    </div>
  );
}
