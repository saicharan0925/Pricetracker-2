import { Bell, LineChart, Globe, Zap, ShieldCheck, Wallet, Download, BarChart3, MailCheck } from 'lucide-react';

const all = [
  { icon: Bell, title: 'Instant Price Alerts', desc: 'Get emailed the second a tracked product dips below your desired price. No spam — only deal hits.', gradient: 'from-indigo-500 to-blue-500' },
  { icon: LineChart, title: 'Price History Charts', desc: 'Interactive Recharts timelines with desired-price overlays for every product.', gradient: 'from-purple-500 to-pink-500' },
  { icon: Globe, title: 'Multi-Site Support', desc: 'Amazon.in, Flipkart and generic e-commerce pages via smart HTML scraping.', gradient: 'from-emerald-500 to-teal-500' },
  { icon: Zap, title: 'On-Demand Re-Check', desc: 'Force a live price refresh any time, plus scheduled background checks.', gradient: 'from-amber-500 to-orange-500' },
  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Compare all products, spot the biggest drops and monthly trends at a glance.', gradient: 'from-cyan-500 to-blue-500' },
  { icon: Download, title: 'CSV Export', desc: 'One-click export of your entire watchlist for spreadsheets and records.', gradient: 'from-fuchsia-500 to-purple-500' },
  { icon: MailCheck, title: 'Deal Verification', desc: 'MRP vs current-price drop badges so fake discounts are obvious.', gradient: 'from-lime-500 to-emerald-500' },
  { icon: ShieldCheck, title: 'Secure & Private', desc: 'Helmet headers, rate limiting, validation and CORS lockdown on the API.', gradient: 'from-rose-500 to-red-500' },
  { icon: Wallet, title: 'Desired-Price Targets', desc: 'Set a target per product and watch the DEAL HIT badge light up.', gradient: 'from-violet-500 to-indigo-500' },
];

export default function Features() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Powerful <span className="gradient-text">features</span></h1>
        <p className="text-slate-400 mt-3 text-sm sm:text-base">Everything SmartPrice Tracker does to help you buy at the lowest price.</p>
      </div>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {all.map(({ icon: Icon, title, desc, gradient }) => (
          <div key={title} className="glass rounded-2xl p-6 hover:bg-white/[0.14] hover:-translate-y-1 transition-all">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg mb-4`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
