import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, Plus, PackageSearch, RefreshCw, Sparkles, Mail, ShieldCheck, Lock } from 'lucide-react';
import {
  getProducts,
  getStats,
  deleteProduct,
  checkPrice,
  updateProduct,
  checkAllPrices,
  seedDemoProducts,
  exportCSV,
  getEmailStatus,
} from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatsCards from '../components/StatsCards.jsx';
import SearchFilter from '../components/SearchFilter.jsx';
import ProductCard from '../components/ProductCard.jsx';
import EditProductModal from '../components/EditProductModal.jsx';
import EmailConfigModal from '../components/EmailConfigModal.jsx';
import { Spinner, SkeletonGrid } from '../components/Loader.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [site, setSite] = useState('');
  const [checkingId, setCheckingId] = useState(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [list, s, es] = await Promise.all([
        getProducts().catch(() => []),
        getStats().catch(() => null),
        getEmailStatus().catch(() => null),
      ]);
      setProducts(Array.isArray(list) ? list : list?.products ?? []);
      if (s) setStats(s);
      if (es) setEmailStatus(es);
    } catch (err) {
      toast.error(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [user]);

  const sites = useMemo(
    () => [...new Set(products.map((p) => p.site).filter(Boolean))],
    [products]
  );

  const filtered = useMemo(() => {
    let out = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((p) => (p.name || '').toLowerCase().includes(q));
    }
    if (site) out = out.filter((p) => p.site === site);
    const priceOf = (p) => Number(p.currentPrice ?? p.price ?? 0);
    switch (sort) {
      case 'price-asc':
        out.sort((a, b) => priceOf(a) - priceOf(b));
        break;
      case 'price-desc':
        out.sort((a, b) => priceOf(b) - priceOf(a));
        break;
      case 'name':
        out.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'drop':
        out.sort((a, b) => {
          const d = (p) => {
            const mrp = Number(p.mrp ?? p.originalPrice ?? 0);
            const pr = priceOf(p);
            return mrp && pr ? (mrp - pr) / mrp : (p.dropPercent ?? 0);
          };
          return d(b) - d(a);
        });
        break;
      default:
        out.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return out;
  }, [products, search, sort, site]);

  const handleCheck = async (id) => {
    try {
      setCheckingId(id);
      const updated = await checkPrice(id);
      setProducts((prev) =>
        prev.map((p) =>
          (p._id || p.id) === id
            ? { ...p, ...(updated || {}), lastChecked: new Date().toISOString() }
            : p
        )
      );
      toast.success('Price re-checked');
      // Refresh stats in background
      getStats().then(setStats).catch(() => {});
    } catch (err) {
      toast.error(err.message || 'Check failed');
    } finally {
      setCheckingId(null);
    }
  };

  const handleCheckAll = async () => {
    try {
      setCheckingAll(true);
      const res = await checkAllPrices();
      await fetchAll();
      toast.success(`Checked all ${res.total || products.length} products!`);
    } catch (err) {
      toast.error(err.message || 'Check all failed');
    } finally {
      setCheckingAll(false);
    }
  };

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      const res = await seedDemoProducts();
      await fetchAll();
      toast.success(res.message || 'Demo products loaded!');
    } catch (err) {
      toast.error(err.message || 'Failed to seed demo data');
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveEdit = async (id, payload) => {
    const updated = await updateProduct(id, payload);
    setProducts((prev) =>
      prev.map((p) => ((p._id || p.id) === id ? { ...p, ...updated } : p))
    );
    getStats().then(setStats).catch(() => {});
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this tracked product?')) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => (p._id || p.id) !== id));
      toast.success('Product deleted');
      getStats().then(setStats).catch(() => {});
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const handleExport = async () => {
    if (!user) {
      toast.error('Please sign in to export your tracked products');
      return;
    }
    try {
      setExporting(true);
      await exportCSV();
      toast.success('CSV exported');
    } catch (err) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold">
              Your <span className="gradient-text">Dashboard</span>
            </h1>
            {user ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" /> Private Account
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Lock className="w-3.5 h-3.5" /> Public Demo
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {user
              ? `${filtered.length} tracked item${filtered.length !== 1 ? 's' : ''} saved to your account (${user.email})`
              : `${filtered.length} sample demo item${filtered.length !== 1 ? 's' : ''} (Sign in to track privately)`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {products.length > 0 && (
            <button
              onClick={handleCheckAll}
              disabled={checkingAll}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass text-sm font-semibold hover:bg-white/20 transition-all disabled:opacity-50"
              title="Re-check prices for all products"
            >
              <RefreshCw className={`w-4 h-4 ${checkingAll ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{checkingAll ? 'Checking...' : 'Check All'}</span>
            </button>
          )}

          <button
            onClick={handleSeedDemo}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass text-sm font-semibold hover:bg-white/20 transition-all disabled:opacity-50 text-indigo-300 hover:text-white"
            title="Load popular demo items with price trends"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">{seeding ? 'Loading...' : 'Demo Data'}</span>
          </button>

          <button
            onClick={handleExport}
            disabled={exporting || !products.length}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass text-sm font-semibold hover:bg-white/20 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> {exporting ? 'Exporting...' : 'CSV'}
          </button>

          {user && (
            <button
              onClick={() => setShowEmailModal(true)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                emailStatus?.configured
                  ? 'glass text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30'
                  : 'glass text-amber-300 hover:bg-amber-500/20 border-amber-500/30'
              }`}
              title={emailStatus?.configured ? 'Email alerts active' : 'Configure SMTP for email delivery'}
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">
                {emailStatus?.configured ? 'Email: Active' : 'Email: Setup'}
              </span>
            </button>
          )}

          <Link
            to="/add"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl gradient-bg text-sm font-semibold hover:opacity-90 shadow-lg text-white"
          >
            <Plus className="w-4 h-4" /> Add
          </Link>
        </div>
      </div>

      {!user && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Track products privately</p>
              <p className="text-xs text-slate-400">
                Sign in or create a free account so only you can view, edit, and receive alerts for your tracked products.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/login"
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-1.5 rounded-xl gradient-bg text-xs font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Create Account
            </Link>
          </div>
        </div>
      )}

      {user && emailStatus && !emailStatus.configured && (
        <div className="p-4 rounded-2xl glass border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <p className="font-semibold text-amber-200">Email Alerts in Simulation Mode</p>
              <p className="text-slate-300 mt-0.5">
                Notifications are logged to the backend console. Configure SMTP in <code className="text-amber-300 font-mono">backend/.env</code> to receive real emails.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowEmailModal(true)}
            className="self-start sm:self-auto px-4 py-2 rounded-xl gradient-bg text-white text-xs font-semibold hover:opacity-90 transition-all shadow-md shrink-0"
          >
            Setup Guide &amp; Test
          </button>
        </div>
      )}

      <StatsCards stats={stats} loading={statsLoading} />

      <SearchFilter
        search={search}
        setSearch={setSearch}
        sort={sort}
        setSort={setSort}
        site={site}
        setSite={setSite}
        sites={sites}
      />

      {loading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl py-16 px-6 text-center">
          <PackageSearch className="w-12 h-12 mx-auto text-slate-500 mb-4" />
          <h3 className="font-semibold text-lg">
            {products.length === 0 ? 'No products yet' : 'No matches found'}
          </h3>
          <p className="text-sm text-slate-400 mt-1 mb-5">
            {products.length === 0
              ? 'Add your first product URL or load demo items to see live charts.'
              : 'Try a different search or filter.'}
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/add"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-bg text-sm font-semibold hover:opacity-90 text-white"
            >
              <Plus className="w-4 h-4" /> Track a Product
            </Link>
            {products.length === 0 && (
              <button
                onClick={handleSeedDemo}
                disabled={seeding}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl glass text-sm font-semibold hover:bg-white/20 text-indigo-300"
              >
                <Sparkles className="w-4 h-4" /> Load Demo Products
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <ProductCard
              key={p._id || p.id}
              product={p}
              onCheck={handleCheck}
              onEdit={setEditingProduct}
              onDelete={handleDelete}
              checking={checkingId === (p._id || p.id)}
            />
          ))}
        </div>
      )}

      {loading && <Spinner label="Loading products..." />}

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          isOpen={Boolean(editingProduct)}
          onClose={() => setEditingProduct(null)}
          onSaved={handleSaveEdit}
        />
      )}

      <EmailConfigModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        emailStatus={emailStatus}
        onRefreshStatus={async () => {
          const es = await getEmailStatus().catch(() => null);
          if (es) setEmailStatus(es);
        }}
      />
    </div>
  );
}
