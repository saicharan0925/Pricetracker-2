import { Link } from 'react-router-dom';
import { Ghost, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center animate-fade-in">
      <div className="w-20 h-20 mx-auto rounded-3xl gradient-bg flex items-center justify-center shadow-xl animate-float">
        <Ghost className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-6xl font-extrabold mt-6 gradient-text">404</h1>
      <p className="text-slate-400 mt-2">This page slipped through the price cracks.</p>
      <Link to="/" className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-2xl gradient-bg font-semibold text-sm hover:opacity-90 shadow-xl">
        <Home className="w-4 h-4" /> Back Home
      </Link>
    </div>
  );
}
