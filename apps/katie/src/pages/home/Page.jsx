import { Link } from 'react-router-dom';
import { Sparkles, Star, Clock, Award } from 'lucide-react';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-katie-dark via-katie-deep to-katie-purple py-24 px-4 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-semibold text-katie-accent mb-6 tracking-widest uppercase">
            <Sparkles size={14} />
            Licensed Esthetician
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-black mb-4 leading-tight">
            Glow On <span className="text-katie-accent">Your Terms</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 font-medium leading-relaxed mb-10 max-w-xl mx-auto">
            Professional skincare and waxing services tailored to you.
            Ten years of experience helping clients look and feel their best.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/services"
              className="bg-white text-katie-purple font-black py-3 px-8 rounded-full uppercase tracking-widest hover:bg-katie-accent transition-all shadow-lg active:scale-95 text-sm">
              View Services
            </Link>
            <Link to="/contact"
              className="border-2 border-white/40 text-white font-black py-3 px-8 rounded-full uppercase tracking-widest hover:border-white hover:bg-white/10 transition-all text-sm">
              Book Now
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-katie-soft py-8 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
          <Stat icon={<Clock size={22} className="text-katie-purple" />} value="10+" label="Years Experience" />
          <Stat icon={<Star size={22} className="text-katie-purple" />} value="5★" label="Client Rated" />
          <Stat icon={<Award size={22} className="text-katie-purple" />} value="Licensed" label="Professional" />
        </div>
      </section>

      {/* About snippet */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border-l-4 border-katie-purple shadow-xl rounded-r-2xl p-8 md:p-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Skincare That <span className="text-katie-purple">Speaks for Itself</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-4">
              With over a decade in the industry, I've built a practice around one belief: every client deserves a service
              that's personal, precise, and genuinely caring. Whether it's your first facial or your monthly wax,
              you'll always feel at home.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              I specialize in facial treatments, full-body waxing, and customized skincare routines built around
              your skin — not a one-size-fits-all approach.
            </p>
            <Link to="/about"
              className="inline-block bg-katie-purple text-white font-black py-3 px-8 rounded-full uppercase tracking-widest hover:bg-katie-deep transition-all shadow-md text-sm active:scale-95">
              About Me
            </Link>
          </div>
        </div>
      </section>

      {/* Services preview */}
      <section className="bg-katie-soft py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-gray-900 text-center mb-10">
            What I <span className="text-katie-purple">Offer</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <ServiceCard
              title="Facial Treatments"
              desc="Deep cleansing, hydrating, and anti-aging facials tailored to your skin type and goals."
            />
            <ServiceCard
              title="Waxing"
              desc="Brow, lip, full-face, and body waxing — clean results, minimal discomfort, every time."
            />
            <ServiceCard
              title="Skincare Consultations"
              desc="One-on-one sessions to build a routine that actually works for your skin, lifestyle, and budget."
            />
            <ServiceCard
              title="Custom Packages"
              desc="Bundle your favorite services into a personalized package at a price that works for you."
            />
          </div>
          <div className="text-center mt-10">
            <Link to="/services"
              className="inline-block bg-katie-purple text-white font-black py-3 px-10 rounded-full uppercase tracking-widest hover:bg-katie-deep transition-all shadow-lg text-sm active:scale-95">
              Full Service Menu
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {icon}
      <span className="text-2xl font-black text-katie-deep">{value}</span>
      <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</span>
    </div>
  );
}

function ServiceCard({ title, desc }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-katie-accent/20 hover:border-katie-purple/40 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className="bg-katie-soft rounded-lg p-2 mt-0.5 shrink-0">
          <Sparkles size={16} className="text-katie-purple" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
          <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
}
