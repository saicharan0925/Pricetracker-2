import { Loader2 } from 'lucide-react';

export function Spinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 animate-fade-in">
      <span className="relative flex">
        <span className="absolute inline-flex h-12 w-12 rounded-full bg-indigo-500 opacity-30 animate-ping" />
        <span className="relative inline-flex h-12 w-12 rounded-full gradient-bg items-center justify-center">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </span>
      </span>
      <p className="text-sm text-slate-400 font-medium">{label}</p>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass rounded-2xl overflow-hidden">
          <div className="skeleton h-44 w-full" />
          <div className="p-4 space-y-2">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-8 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Spinner;
