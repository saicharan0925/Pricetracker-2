import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Link2, Tag, IndianRupee, Mail, Loader2, Sparkles, UserCheck, Lock } from 'lucide-react';
import { createProduct } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AddProduct() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '',
    url: '',
    desiredPrice: '',
    currentPrice: '',
    originalPrice: '',
    email: user?.email || '',
  });

  useEffect(() => {
    if (user?.email && !form.email) {
      setForm((f) => ({ ...f, email: user.email }));
    }
  }, [user]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      e.name = 'Name must be at least 2 characters';
    }
    try {
      const u = new URL(form.url.trim());
      if (!['http:', 'https:'].includes(u.protocol)) e.url = 'URL must start with http(s)';
    } catch {
      e.url = 'Enter a valid product URL';
    }
    if (!form.desiredPrice || Number(form.desiredPrice) <= 0) {
      e.desiredPrice = 'Enter a valid desired target price';
    }
    if (form.currentPrice && Number(form.currentPrice) <= 0) {
      e.currentPrice = 'Current price must be greater than 0';
    }
    if (form.originalPrice && Number(form.originalPrice) <= 0) {
      e.originalPrice = 'Original price must be greater than 0';
    }
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      e.email = 'Enter a valid email (required for price alerts)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        name: form.name.trim(),
        url: form.url.trim(),
        desiredPrice: Number(form.desiredPrice),
        email: form.email.trim(),
        currentPrice: form.currentPrice !== '' ? Number(form.currentPrice) : undefined,
        originalPrice: form.originalPrice !== '' ? Number(form.originalPrice) : undefined,
      };
      await createProduct(payload);
      toast.success('Product added — tracking started!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Failed to add product');
    } finally {
      setSubmitting(false);
    }
  };

  const field =
    'w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all';

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 animate-fade-in text-center">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
        <div className="glass rounded-3xl p-8 sm:p-10 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            Sign In to <span className="gradient-text">Track Products</span>
          </h2>
          <p className="text-sm text-slate-400 mt-2.5 max-w-sm mx-auto leading-relaxed">
            Your tracking list, custom price targets, and email alerts are strictly private. Sign in or create an account to start tracking.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/login?redirect=/add"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register?redirect=/add"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl gradient-bg text-sm font-semibold text-white hover:opacity-90 shadow-lg"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>
      <div className="glass rounded-3xl p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold">
          Track a new <span className="gradient-text">product</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1.5">
          Paste the store link, set your target price — we auto-scrape live prices and alert you on drops.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label className="text-sm font-medium text-slate-300">Product name *</label>
            <div className="relative mt-1.5">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Sony WH-1000XM5 Headphones"
                className={field}
              />
            </div>
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">Product URL *</label>
            <div className="relative mt-1.5">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={form.url}
                onChange={set('url')}
                placeholder="https://www.amazon.in/... or https://www.flipkart.com/..."
                inputMode="url"
                className={field}
              />
            </div>
            {errors.url && <p className="text-xs text-red-400 mt-1">{errors.url}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300">Desired target price (₹) *</label>
              <div className="relative mt-1.5">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                <input
                  value={form.desiredPrice}
                  onChange={set('desiredPrice')}
                  placeholder="e.g. 24999"
                  type="number"
                  min="1"
                  step="any"
                  className={field}
                />
              </div>
              {errors.desiredPrice && <p className="text-xs text-red-400 mt-1">{errors.desiredPrice}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">Alert email *</label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={form.email}
                  onChange={set('email')}
                  placeholder="you@example.com"
                  type="email"
                  className={field}
                />
              </div>
              {user?.email && (
                <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> Auto-filled for {user.name} ({user.email})
                </p>
              )}
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300">
                Current price (₹) <span className="text-xs text-slate-500 font-normal">(optional, auto-scraped)</span>
              </label>
              <div className="relative mt-1.5">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={form.currentPrice}
                  onChange={set('currentPrice')}
                  placeholder="Leave empty to scrape live"
                  type="number"
                  min="0"
                  step="any"
                  className={field}
                />
              </div>
              {errors.currentPrice && <p className="text-xs text-red-400 mt-1">{errors.currentPrice}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Original MRP (₹) <span className="text-xs text-slate-500 font-normal">(optional)</span>
              </label>
              <div className="relative mt-1.5">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={form.originalPrice}
                  onChange={set('originalPrice')}
                  placeholder="e.g. 29999"
                  type="number"
                  min="0"
                  step="any"
                  className={field}
                />
              </div>
              {errors.originalPrice && <p className="text-xs text-red-400 mt-1">{errors.originalPrice}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl gradient-bg font-semibold text-sm hover:opacity-90 shadow-xl transition-all disabled:opacity-60 text-white"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {submitting ? 'Adding & Scraping...' : 'Start Tracking'}
          </button>
        </form>
      </div>
    </div>
  );
}
