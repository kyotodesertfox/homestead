export default function HowItWorks({ setActiveTab }) {
    return (
        <section className="w-full max-w-5xl px-8 py-16 animate-in fade-in duration-700">
        <div className="bg-white border-b-8 border-r-8 border-stone-200 rounded-[3rem] p-12 shadow-2xl">
        <header className="mb-12 border-b border-stone-100 pb-8">
        <h2 className="text-5xl font-serif font-black text-homestead-header mb-4 italic">
        How It <span className="text-egg-yolk underline decoration-stone-200">Works</span>
        </h2>
        </header>

        {/* The Grid of Cards */}
        <div className="grid md:grid-cols-3 gap-8 mt-12">

        {[
            {
                id: 1,
                title: "Physical Claim",
                icon: "🥚",
                text: "Holding 1 $EGG token provides a digital claim on 1 real egg. Upon $EGG redemption, inventory is transferred at a Jacksonville location."
            },
            {
                id: 2,
                title: "Market Floor",
                icon: "⚓",
                text: "Every trade secures the ecosystem. A growing pool acts as a permanent anchor, mathematically defending the value of the homestead."
            },
            {
                id: 3,
                title: "Governance Token",
                icon: "🗳️",
                text: "Acquiring $EGG is optimized for entry; exiting the market carries a small penalty tax to protect the floor. Holders gain voting rights for future project upgrades."
            }
        ].map((card) => (

            <div
            key={card.id}
            className="rounded-[3rem] p-10 flex flex-col items-center text-center shadow-2xl transition-all hover:scale-[1.02] relative group"
            style={{
                border: '4px solid #D9A06F',
                backgroundColor: '#FEF3C7',
                backgroundImage: `url('https://www.transparenttextures.com/patterns/rice-paper-2.png')`,
                         backgroundBlendMode: 'multiply'
            }}
            >

            <div className="bg-[#FEF3C7] w-16 h-16 rounded-2xl flex items-center justify-center mb-10 border-2 border-[#D9A06F]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] group-hover:border-[#D9A06F] transition-colors">
            <span className="text-3xl drop-shadow-md">{card.icon}</span>
            </div>

            <h3 className="text-xl font-black uppercase tracking-[0.15em] text-[#1a1614] mb-6 italic leading-tight">
            {card.title}
            </h3>

            <p className="text-stone-700 text-smm leading-relaxed font-bold tracking-wide">
            {card.text}
            </p>

            <div className="absolute bottom-6 w-12 h-1 bg-[#D9A06F]/40 rounded-full"></div>

            </div>
        ))}

        </div>

        <div className="mt-12">
        <button onClick={() => setActiveTab('trade')} className="text-egg-yolk font-black text-xl hover:underline">
        Begin Onboarding →
        </button>
        </div>
        </div>
        </section>
    );
}
