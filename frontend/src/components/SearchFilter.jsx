import { Search, ArrowUpDown, Store } from 'lucide-react';

export default function SearchFilter({ search, setSearch, sort, setSort, site, setSite, sites = [] }) {
  return (
    <div className="glass rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by name..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="flex gap-2 flex-col sm:flex-row">
        <div className="relative">
          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="pl-10 pr-8 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="drop">Biggest drop</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
        <div className="relative">
          <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={site}
            onChange={(e) => setSite(e.target.value)}
            className="pl-10 pr-8 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer capitalize"
          >
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
