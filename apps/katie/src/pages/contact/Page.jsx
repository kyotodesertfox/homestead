import { Mail, MessageCircle, Sparkles, Clock } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-katie-soft border border-katie-accent/40 rounded-full px-4 py-1.5 text-sm font-semibold text-katie-purple mb-4 tracking-widest uppercase">
            <MessageCircle size={13} />
            Reach Out
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black text-gray-900 mb-4">
            Let's <span className="text-katie-purple">Connect</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            Ready to book, have questions about a service, or want a custom package?
            Get in touch — I'll get back to you promptly.
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid sm:grid-cols-2 gap-6 mb-12">
          <ContactCard
            icon={<Mail size={22} className="text-katie-purple" />}
            title="Email"
            detail="hello@katiewilliams.com"
            note="Best for booking inquiries"
            href="mailto:hello@katiewilliams.com"
          />
          <ContactCard
            icon={<MessageCircle size={22} className="text-katie-purple" />}
            title="Text / DM"
            detail="@katiewilliams"
            note="Quick questions welcome"
            href="#"
          />
        </div>

        {/* Hours */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-katie-soft rounded-xl p-2">
              <Clock size={20} className="text-katie-purple" />
            </div>
            <h2 className="font-display text-xl font-bold text-gray-900">Availability</h2>
          </div>
          <div className="space-y-3">
            <HourRow day="Monday – Friday" hours="By appointment" />
            <HourRow day="Saturday" hours="By appointment" />
            <HourRow day="Sunday" hours="Closed" dimmed />
          </div>
          <p className="text-gray-400 text-xs mt-6 font-medium">
            Appointments are confirmed via email or text. Same-day bookings subject to availability.
          </p>
        </div>

        {/* NFT booking teaser */}
        <div className="bg-gradient-to-br from-katie-deep to-katie-purple rounded-2xl p-8 text-white text-center shadow-xl">
          <Sparkles size={28} className="text-katie-accent mx-auto mb-4" />
          <h3 className="font-display text-2xl font-bold mb-3">On-Chain Booking Coming Soon</h3>
          <p className="text-gray-300 text-sm leading-relaxed max-w-md mx-auto">
            Soon you'll be able to purchase a service voucher directly on Homestead —
            locked on Taiko L2, redeemable when you're ready. No phone tag, no expiration pressure.
          </p>
          <p className="text-katie-accent text-xs font-bold uppercase tracking-widest mt-5">
            Homestead · Taiko L2 · Your Voucher, Your Terms
          </p>
        </div>

      </div>
    </div>
  );
}

function ContactCard({ icon, title, detail, note, href }) {
  return (
    <a href={href}
      className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-katie-accent/50 hover:shadow-md transition-all p-6 group">
      <div className="flex items-start gap-4">
        <div className="bg-katie-soft rounded-xl p-2.5 mt-0.5 shrink-0 group-hover:bg-katie-accent/20 transition-colors">
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{title}</p>
          <p className="font-bold text-gray-900 text-sm mb-1">{detail}</p>
          <p className="text-gray-400 text-xs">{note}</p>
        </div>
      </div>
    </a>
  );
}

function HourRow({ day, hours, dimmed }) {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-gray-50 ${dimmed ? 'opacity-40' : ''}`}>
      <span className="text-gray-700 font-medium text-sm">{day}</span>
      <span className="text-katie-purple font-bold text-sm">{hours}</span>
    </div>
  );
}
