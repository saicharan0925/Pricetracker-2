import { useState, useEffect } from 'react';
import { X, Tag, IndianRupee, Mail, Image, Link as LinkIcon, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EditProductModal({ product, isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    currentPrice: '',
    desiredPrice: '',
    originalPrice: '',
    email: '',
    image: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        currentPrice: product.currentPrice ?? product.price ?? product.current_price ?? '',
        desiredPrice: product.desiredPrice ?? product.desired_price ?? '',
        originalPrice: product.originalPrice ?? product.original_price ?? product.mrp ?? '',
        email: product.email || '',
        image: product.image ?? product.image_url ?? '',
      });
      setErrors({});
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      e.name = 'Name must be at least 2 characters';
    }
    if (!form.desiredPrice || Number(form.desiredPrice) <= 0) {
      e.desiredPrice = 'Enter a valid desired price';
    }
    if (form.currentPrice && Number(form.currentPrice) <= 0) {
      e.currentPrice = 'Enter a valid current price';
    }
    if (form.originalPrice && Number(form.originalPrice) <= 0) {
      e.originalPrice = 'Enter a valid original price / MRP';
    }
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      e.email = 'Enter a valid email address';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        desired_price: Number(form.desiredPrice),
        email: form.email.trim(),
        current_price: form.currentPrice !== '' ? Number(form.currentPrice) : null,
        original_price: form.originalPrice !== '' ? Number(form.originalPrice) : null,
        image_url: form.image.trim() || null,
      };
      await onSaved?.(product.id || product._id, payload);
      toast.success('Product updated successfully!');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const field =
    'w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className="glass rounded-3xl p-6 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-white/15 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg">
            <Tag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Edit Tracked Product</h2>
            <p className="text-xs text-slate-400">Update price targets, name, or image</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4" noValidate>
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Product Name *</label>
            <div className="relative mt-1.5">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={form.name} onChange={set('name')} placeholder="Product Name" className={field} />
            </div>
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Current Price (₹)</label>
              <div className="relative mt-1.5">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.currentPrice}
                  onChange={set('currentPrice')}
                  placeholder="e.g. 24999"
                  className={field}
                />
              </div>
              {errors.currentPrice && <p className="text-xs text-red-400 mt-1">{errors.currentPrice}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Target / Desired (₹) *</label>
              <div className="relative mt-1.5">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={form.desiredPrice}
                  onChange={set('desiredPrice')}
                  placeholder="e.g. 21999"
                  className={field}
                />
              </div>
              {errors.desiredPrice && <p className="text-xs text-red-400 mt-1">{errors.desiredPrice}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">MRP / Original (₹)</label>
              <div className="relative mt-1.5">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.originalPrice}
                  onChange={set('originalPrice')}
                  placeholder="e.g. 29999"
                  className={field}
                />
              </div>
              {errors.originalPrice && <p className="text-xs text-red-400 mt-1">{errors.originalPrice}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Alert Email *</label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="you@example.com"
                  className={field}
                />
              </div>
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Image URL (optional)</label>
            <div className="relative mt-1.5">
              <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={form.image}
                onChange={set('image')}
                placeholder="https://example.com/image.jpg"
                className={field}
              />
            </div>
            {form.image && (
              <div className="mt-2 flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10">
                <img
                  src={form.image}
                  alt="Preview"
                  className="w-12 h-12 object-cover rounded-lg bg-black/40"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="text-xs text-slate-400 truncate">Image preview active</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl glass hover:bg-white/15 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl gradient-bg text-white text-sm font-semibold hover:opacity-90 shadow-lg transition-all disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
