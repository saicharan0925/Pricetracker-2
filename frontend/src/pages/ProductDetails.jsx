import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  ExternalLink,
  TrendingDown,
  Target,
  History,
  Pencil,
} from 'lucide-react';
import { getProduct, getPriceHistory, checkPrice, deleteProduct, updateProduct } from '../services/api.js';
import PriceChart from '../components/PriceChart.jsx';
import EditProductModal from '../components/EditProductModal.jsx';
import { Spinner } from '../components/Loader.jsx';

const inr = (n) => (n == null || isNaN(Number(n)) ? '—' : '₹' + Number(n).toLocaleString('en-IN'));

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [p, h] = await Promise.all([
          getProduct(id),
          getPriceHistory(id, 100).catch(() => []),
        ]);
        setProduct(p);
        setHistory(Array.isArray(h) ? h : h?.history ?? []);
      } catch (err) {
        toast.error(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSaveEdit = async (productId, payload) => {
    const updated = await updateProduct(productId, payload);
    setProduct((p) => ({ ...p, ...updated }));
    const h = await getPriceHistory(productId, 100).catch(() => []);
    setHistory(Array.isArray(h) ? h : h?.history ?? []);
  };

  const handleCheck = async () => {
    try {
      setChecking(true);
      const updated = await checkPrice(id);
      if (updated && typeof updated === 'object') setProduct((p) => ({ ...p, ...updated }));
      const h = await getPriceHistory(id, 100).catch(() => []);
      setHistory(Array.isArray(h) ? h : h?.history ?? []);
      toast.success('Price updated');
    } catch (err) {
      toast.error(err.message || 'Check failed');
    } finally {
      setChecking(false);
    }
  };


  const handleDelete = async () => {
    if (!window.confirm('Delete this product permanently?')) return;
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-10"><Spinner label="Loading product..." /></div>;
  if (!product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center glass rounded-3xl mt-10">
        <h2 className="text-xl font-bold">Private or Unavailable Product</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
          This product is private to its owner or does not exist. Please sign in to access your personal tracked products.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/dashboard" className="px-4 py-2 rounded-xl glass text-xs font-semibold text-slate-200 hover:text-white">
            ← Back to dashboard
          </Link>
          <Link to="/login" className="px-4 py-2 rounded-xl gradient-bg text-xs font-semibold text-white hover:opacity-90">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const price = Number(product.currentPrice ?? product.price ?? 0);
  const mrp = Number(product.mrp ?? product.originalPrice ?? 0);
  const desired = Number(product.desiredPrice ?? 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in space-y-5">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      {product.is_demo && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-200">
          <span>💡 <strong>Demo Showcase:</strong> This is a sample tracked product illustrating live charts and price history.</span>
          <Link to="/register" className="font-semibold underline hover:text-white shrink-0">
            Create an account to track your own items →
          </Link>
        </div>
      )}

      <div className="glass rounded-3xl p-5 sm:p-7">
        <div className="flex flex-col md:flex-row gap-5">
          <div className="w-full md:w-56 h-48 rounded-2xl bg-slate-900/60 overflow-hidden flex items-center justify-center shrink-0">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-slate-500 text-sm">No image</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-wider text-slate-400 capitalize">{product.site || ' tracked product'}</p>
              {product.is_demo && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Demo
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold leading-snug mt-1">{product.name}</h1>
            <div className="flex items-end gap-2 mt-3">
              <span className="text-3xl font-extrabold">{inr(price)}</span>
              {mrp > price && <span className="text-slate-400 line-through mb-1">{inr(mrp)}</span>}
              {mrp > price && (
                <span className="mb-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <TrendingDown className="w-3 h-3" /> {Math.round(((mrp - price) / mrp) * 100)}% off
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-2 inline-flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-400" /> Desired: <span className="text-emerald-300 font-semibold">{inr(desired)}</span>
              {desired && price <= desired && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-indigo-500 to-purple-500">DEAL HIT</span>}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {!product.is_demo && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass text-sm font-semibold hover:bg-white/20 transition-all text-slate-200"
                >
                  <Pencil className="w-4 h-4 text-indigo-400" /> Edit
                </button>
              )}
              <button
                onClick={handleCheck}
                disabled={checking}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl gradient-bg text-sm font-semibold hover:opacity-90 disabled:opacity-60 text-white"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} /> {checking ? 'Checking...' : 'Check Now'}
              </button>
              {product.url && (
                <a
                  href={product.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass text-sm font-semibold hover:bg-white/20"
                >
                  <ExternalLink className="w-4 h-4" /> Store
                </a>
              )}
              {!product.is_demo && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/20 text-red-300 text-sm font-semibold hover:bg-red-500/30"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-300" /> Price history ({history.length})
        </h2>
        <PriceChart data={history} desiredPrice={desired} />
      </div>

      {history.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900/90 backdrop-blur text-xs uppercase text-slate-400">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Price</th>
                  <th className="text-right px-4 py-3 font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().slice(0, 30).map((h, i, arr) => {
                  const p = Number(h.price ?? 0);
                  const prev = i + 1 < arr.length ? Number(arr[i + 1].price ?? p) : p;
                  const diff = p - prev;
                  return (
                    <tr
                      key={h.id || h._id || h.checkedAt || h.checked_at || i}
                      className="border-t border-white/5 hover:bg-white/5"
                    >
                      <td className="px-4 py-2.5 text-slate-300">
                        {new Date(
                          h.checkedAt || h.checked_at || h.createdAt || h.created_at || h.date
                        ).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">{inr(p)}</td>
                      <td
                        className={`px-4 py-2.5 text-right text-xs font-medium ${
                          diff < 0
                            ? 'text-emerald-400'
                            : diff > 0
                            ? 'text-red-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {diff === 0
                          ? '—'
                          : `${diff < 0 ? '↓' : '↑'} ₹${Math.abs(diff).toLocaleString('en-IN')}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isEditing && (
        <EditProductModal
          product={product}
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          onSaved={handleSaveEdit}
        />
      )}
    </div>
  );
}

