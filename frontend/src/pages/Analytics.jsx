import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line,
} from 'recharts';
import { getProducts, getPriceHistory } from '../services/api.js';
import { SkeletonGrid } from '../components/Loader.jsx';

const tipStyle = {
  background: 'rgba(15,23,42,0.95)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 12,
  color: '#f1f5f9',
  fontSize: 13,
};

export default function Analytics() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const list = await getProducts();
        const arr = Array.isArray(list) ? list : list?.products ?? [];
        setProducts(arr);
        if (arr.length) setSelected(arr[0]._id || arr[0].id);
      } catch (err) {
        toast.error(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      try {
        const h = await getPriceHistory(selected, 100);
        const arr = Array.isArray(h) ? h : [];
        setTrend(
          arr.slice(-20).map((x, i) => ({
            i: i + 1,
            label: new Date(x.checkedAt || x.checked_at || x.createdAt || x.created_at || x.date || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            price: Number(x.price ?? 0),
          }))
        );
      } catch {
        setTrend([]);
      }
    })();
  }, [selected]);

  const comparison = useMemo(
    () =>
      products.slice(0, 12).map((p) => ({
        name: (p.name || 'Untitled').slice(0, 18) + ((p.name || '').length > 18 ? '…' : ''),
        full: p.name,
        current: Number(p.currentPrice ?? p.price ?? 0),
        desired: Number(p.desiredPrice ?? 0),
      })),
    [products]
  );

  const drops = useMemo(
    () =>
      products
        .map((p) => {
          const mrp = Number(p.mrp ?? p.originalPrice ?? 0);
          const pr = Number(p.currentPrice ?? p.price ?? 0);
          return { ...p, pct: mrp && pr ? Math.round(((mrp - pr) / mrp) * 100) : 0 };
        })
        .filter((p) => p.pct > 0)
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 5),
    [products]
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-extrabold mb-5">Analytics</h1>
        <SkeletonGrid count={4} />
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <BarChart3 className="w-12 h-12 mx-auto text-slate-500 mb-4" />
        <h2 className="font-bold text-lg">No data to analyze yet</h2>
        <p className="text-sm text-slate-400 mt-1 mb-5">Track some products first.</p>
        <Link to="/add" className="px-5 py-2.5 rounded-xl gradient-bg text-sm font-semibold">Track a Product</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">Price <span className="gradient-text">Analytics</span></h1>
        <p className="text-sm text-slate-400 mt-1">Compare {products.length} tracked products</p>
      </div>

      <div className="glass rounded-2xl p-4 sm:p-5">
        <h2 className="font-semibold mb-3 text-sm sm:text-base">Current vs Desired Price</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparison} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} angle={-20} textAnchor="end" interval={0} height={60} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} width={70} tickFormatter={(v) => '₹' + Number(v).toLocaleString('en-IN', { notation: 'compact' })} />
              <Tooltip contentStyle={tipStyle} formatter={(v) => '₹' + Number(v).toLocaleString('en-IN')} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="current" name="Current" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="desired" name="Desired" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-4 sm:p-5 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold text-sm sm:text-base">Price trend</h2>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-full"
            >
              {products.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {(p.name || 'Untitled').slice(0, 40)}
                </option>
              ))}
            </select>
          </div>
          <div className="h-[260px]">
            {trend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={30} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} width={70} tickFormatter={(v) => '₹' + Number(v).toLocaleString('en-IN', { notation: 'compact' })} />
                  <Tooltip contentStyle={tipStyle} formatter={(v) => ['₹' + Number(v).toLocaleString('en-IN'), 'Price']} />
                  <Line type="monotone" dataKey="price" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-16">No history for this product yet.</p>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-4 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-3">Top drops</h2>
          <div className="space-y-3">
            {drops.length === 0 && <p className="text-sm text-slate-400">No discounts detected yet.</p>}
            {drops.map((p) => (
              <Link key={p._id || p.id} to={`/product/${p._id || p.id}`} className="block p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                <p className="text-xs font-medium clamp-2">{p.name}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-sm font-bold">₹{Number(p.currentPrice ?? p.price ?? 0).toLocaleString('en-IN')}</span>
                  <span className="text-xs font-bold text-emerald-300">-{p.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400" style={{ width: `${Math.min(p.pct, 100)}%` }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
