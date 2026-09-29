import { Package, IndianRupee, ArrowDownWideNarrow, BadgePercent } from 'lucide-react';

const cards = (stats) => [
  {
    label: 'Total Products',
    value: stats?.totalProducts ?? 0,
    icon: Package,
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    label: 'Average Price',
    value: stats?.avgPrice != null ? '₹' + Number(stats.avgPrice).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '₹0',
    icon: IndianRupee,
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    label: 'Lowest Price',
    value: stats?.lowestPrice != null ? '₹' + Number(stats.lowestPrice).toLocaleString('en-IN') : '—',
    icon: ArrowDownWideNarrow,
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    label: 'Recent Drops',
    value: stats?.recentDrops ?? 0,
    icon: BadgePercent,
    gradient: 'from-amber-500 to-orange-500',
  },
];

export default function StatsCards({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass rounded-2xl p-4 sm:p-5">
            <div className="skeleton h-10 w-10 rounded-xl mb-3" />
            <div className="skeleton h-6 w-20 rounded mb-2" />
            <div className="skeleton h-4 w-24 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards(stats).map(({ label, value, icon: Icon, gradient }) => (
        <div key={label} className="glass rounded-2xl p-4 sm:p-5 hover:bg-white/[0.14] transition-colors">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg mb-3`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold truncate">{value}</p>
          <p className="text-xs sm:text-sm text-slate-400">{label}</p>
        </div>
      ))}
    </div>
  );
}
