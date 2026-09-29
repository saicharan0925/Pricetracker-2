import { Link } from 'react-router-dom';
import { ArrowRight, Bell, LineChart, Zap, ShieldCheck, Globe, Timer, Wallet } from 'lucide-react';

const features = [
  { icon: Bell, title: 'Instant Price Alerts', desc: 'Email alerts the moment a price drops below your target.', gradient: 'from-indigo-500 to-blue-500' },
  { icon: LineChart, title: 'Price History Charts', desc: 'Beautiful historical trends so you buy at the true lowest.', gradient: 'from-purple-500 to-pink-500' },
  { icon: Globe, title: 'Multi-Site Tracking', desc: 'Amazon, Flipkart and more — one dashboard for everything.', gradient: 'from-emerald-500 to-teal-500' },
  { icon: Zap, title: 'One-Click Refresh', desc: 'Re-check any product live with a single click.', gradient: 'from-amber-500 to-orange-500' },
  { icon: ShieldCheck, title: 'Reliable Scraping', desc: 'Robust extraction with fallbacks and error handling.', gradient: 'from-cyan-500 to-blue-500' },
  { icon: Wallet, title: 'Smart Savings', desc: 'Desired-price targets help you never overpay again.', gradient: 'from-fuchsia-500 to-purple-500' },
];

const steps = [
  { n: '01', title: 'Paste product URL', desc: 'Copy any Amazon or Flipkart link and add your desired price.' },
  { n: '02', title: 'We track it 24/7', desc: 'Automatic checks record every price movement.' },
  { n: '03', title: 'Get alerted & save', desc: 'Buy at the dip when your target price is hit.' },
];

export default function Home() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-slate-300 mb-6">
          <Timer className="w-3.5 h-3.5 text-emerald-400" /> Live price tracking for smart shoppers
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          Never overpay <br className="hidden sm:block" />
          <span className="gradient-text">again. Ever.</span>
        </h1>
        <p className="mt-5 text-slate-400 max-w-2xl mx-auto text-sm sm:text-lg">
          SmartPrice Tracker monitors prices across Amazon, Flipkart & more — and alerts you the instant they drop below your target.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/add" className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl gradient-bg font-semibold text-sm sm:text-base hover:opacity-90 shadow-xl transition-all">
            Start Tracking Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/dashboard" className="px-6 py-3 rounded-2xl glass font-semibold text-sm sm:text-base hover:bg-white/20 transition-all">
            View Dashboard
          </Link>
        </div>

        {/* Mini stats */}
        <div className="mt-10 grid grid-cols-3 gap-3 max-w-2xl mx-auto">
          {[
            ['10K+', 'Prices tracked'],
            ['₹2.4M', 'Shopper savings'],
            ['98%', 'Alert accuracy'],
          ].map(([v, l]) => (
            <div key={l} className="glass rounded-2xl py-4">
              <p className="text-lg sm:text-2xl font-extrabold gradient-text">{v}</p>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">Everything you need to <span className="gradient-text">save more</span></h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc, gradient }) => (
            <div key={title} className="glass rounded-2xl p-6 hover:bg-white/[0.14] hover:-translate-y-1 transition-all">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg mb-4`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-slate-400 mt-1.5">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">How it <span className="gradient-text">works</span></h2>
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {steps.map((s) => (
            <div key={s.n} className="gradient-border rounded-2xl p-6">
              <p className="text-4xl font-extrabold gradient-text">{s.n}</p>
              <h3 className="font-semibold mt-2">{s.title}</h3>
              <p className="text-sm text-slate-400 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/features" className="inline-flex items-center gap-2 text-sm text-indigo-300 hover:text-indigo-200 font-medium">
            Explore all features <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
