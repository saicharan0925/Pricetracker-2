import { Link } from 'react-router-dom';
import { Tag, Github, Twitter, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/80 backdrop-blur-xl mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Tag className="w-4 h-4 text-white" />
            </span>
            <span className="font-extrabold">Smart<span className="gradient-text">Price</span> Tracker</span>
          </div>
          <p className="text-sm text-slate-400 max-w-sm">
            Track prices across Amazon, Flipkart and more. Get instant alerts when prices drop below your desired price.
          </p>
          <div className="flex gap-2 mt-4">
            {[Github, Twitter, Mail].map((Icon, i) => (
              <a key={i} href="#" aria-label="social" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-colors">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3 text-slate-200">Product</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link to="/features" className="hover:text-white">Features</Link></li>
            <li><Link to="/dashboard" className="hover:text-white">Dashboard</Link></li>
            <li><Link to="/analytics" className="hover:text-white">Analytics</Link></li>
            <li><Link to="/add" className="hover:text-white">Track Product</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3 text-slate-200">Resources</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><a href="#" className="hover:text-white">Documentation</a></li>
            <li><a href="#" className="hover:text-white">API Status</a></li>
            <li><a href="#" className="hover:text-white">Privacy</a></li>
            <li><a href="#" className="hover:text-white">Terms</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} SmartPrice Tracker. Built with React + Tailwind.
      </div>
    </footer>
  );
}
