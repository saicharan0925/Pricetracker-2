import { Link } from 'react-router-dom';
import { Eye, RefreshCw, Trash2, TrendingDown, TrendingUp, ExternalLink, ImageOff, Pencil } from 'lucide-react';
import { useState } from 'react';

function formatINR(n) {
  if (n == null || isNaN(Number(n))) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}

function timeAgo(date) {
  if (!date) return 'never';
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-IN');
}

export default function ProductCard({ product, onCheck, onDelete, onEdit, checking }) {
  const [imgError, setImgError] = useState(false);
  const id = product._id || product.id;
  const price = Number(product.currentPrice ?? product.price ?? 0);
  const desired = Number(product.desiredPrice ?? 0);
  const mrp = Number(product.mrp ?? product.originalPrice ?? 0);
  const dropPct = mrp && price ? Math.round(((mrp - price) / mrp) * 100) : (product.dropPercent ?? 0);
  const isDeal = desired && price && price <= desired;

  return (
    <div className="glass rounded-2xl overflow-hidden hover:bg-white/[0.14] transition-all hover:-translate-y-1 hover:shadow-glass group flex flex-col justify-between">
      <div>
        <div className="relative h-44 bg-slate-900/60 flex items-center justify-center overflow-hidden">
          {product.image && !imgError ? (
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center text-slate-500 gap-2">
              <ImageOff className="w-8 h-8" />
              <span className="text-xs">No image</span>
            </div>
          )}
          {dropPct > 0 && (
            <span className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/90 text-white shadow">
              <TrendingDown className="w-3.5 h-3.5" /> {dropPct}% off
            </span>
          )}
          {isDeal && (
            <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow animate-pulse-slow">
              DEAL HIT
            </span>
          )}
          {product.site && (
            <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md text-[11px] font-medium bg-black/60 text-slate-200 capitalize backdrop-blur">
              {product.site}
            </span>
          )}
          {product.is_demo && (
            <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/80 text-white backdrop-blur">
              Demo Showcase
            </span>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-[15px] leading-snug clamp-2 min-h-[42px]" title={product.name}>
            {product.name || 'Untitled product'}
          </h3>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-xl font-extrabold text-white">{formatINR(price)}</span>
            {mrp > price && <span className="text-sm text-slate-400 line-through mb-0.5">{formatINR(mrp)}</span>}
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            Desired: <span className="text-emerald-400 font-semibold">{formatINR(desired)}</span>
            {price > desired && desired > 0 && (
              <span className="inline-flex items-center gap-0.5 text-amber-400 ml-1">
                <TrendingUp className="w-3 h-3" /> waiting
              </span>
            )}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Checked {timeAgo(product.lastChecked || product.updatedAt)}</p>
        </div>
      </div>

      <div className="p-4 pt-0">
        <div className="flex gap-1.5">
          <Link
            to={`/product/${id}`}
            className="flex-1 flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-xs font-semibold transition-colors text-white"
          >
            <Eye className="w-3.5 h-3.5" /> View
          </Link>
          {!product.is_demo && (
            <button
              onClick={() => onEdit?.(product)}
              aria-label="Edit product"
              title="Edit product"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200 hover:text-white transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onCheck?.(id)}
            disabled={checking}
            title="Check price now"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
          </button>
          {!product.is_demo && (
            <button
              onClick={() => onDelete?.(id)}
              aria-label="Delete"
              title="Delete product"
              className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/30 border border-red-500/20 text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {product.url && (
          <a href={product.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300">
            Open store <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}


