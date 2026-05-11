export default function OurProcess({ setActiveTab }) {
    return (
        <section className="w-full max-w-5xl px-8 py-16 animate-in fade-in duration-700">
        <div className="bg-white border-b-8 border-r-8 border-stone-200 rounded-[3rem] p-12 shadow-2xl">

        <header className="mb-12 border-b border-stone-100 pb-8">
        <h2 className="text-5xl font-serif font-black text-homestead-header mb-4 italic">
        The <span className="text-egg-yolk underline decoration-stone-200">Process</span>
        </h2>
        <p className="text-xl text-stone-500 font-medium leading-relaxed max-w-2xl">
        Large-scale commercial operations prioritize volume. I prioritize the biological
        integrity of the flock through labor-intensive standards they cannot replicate.
        </p>
        </header>

        {/* The "Empire Standard" Card Grid */}
        <div className="grid md:grid-cols-2 gap-8 mt-12">

        {[
            {
                id: 1,
                title: "Nutritional Integrity",
                icon: "🌾",
                text: "My birds are fed a high-quality Omega-3 base diet supplemented with nutrient-dense inputs. I avoid cheap fillers standard in commercial feed."
            },
            {
                id: 2,
                title: "Circular Inputs",
                icon: "🍺",
                text: "I recycle spent grains from my own homebrewing process to create custom suet cakes, providing a high-protein, recycled food source."
            },
            {
                id: 3,
                title: "Ground Scratch",
                icon: "📍",
                text: "Every day, the flock is provided with fresh ground scratch. This encourages natural foraging behavior and keeps the birds active and engaged."
            },
            {
                id: 4,
                title: "Living Standards",
                icon: "🛡️",
                text: "By maintaining a smaller flock on a private homestead, I monitor the health of every bird, resulting in a superior, consistent product."
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
            {/* Inset Icon Container */}
            <div className="bg-[#FEF3C7] w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border-2 border-[#D9A06F]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] group-hover:border-[#D9A06F] transition-colors">
            <span className="text-3xl drop-shadow-md">{card.icon}</span>
            </div>

            <h3 className="text-xl font-black uppercase tracking-[0.15em] text-[#1a1614] mb-4 italic leading-tight">
            {card.title}
            </h3>

            <p className="text-stone-700 text-sm leading-relaxed font-bold tracking-wide">
            {card.text}
            </p>

            {/* Anchor Bar */}
            <div className="absolute bottom-6 w-12 h-1 bg-[#D9A06F]/40 rounded-full"></div>
            </div>
        ))}

        </div>

        {/* Closing Action */}
        <div className="mt-16 text-center">
        <button
        onClick={() => setActiveTab('how-it-works')}
        className="text-egg-yolk font-black text-2xl hover:text-orange-600 transition-all"
        >
        See How It Works →
        </button>
        </div>

        </div>
        </section>
    );
}
