import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Tag,
  Menu,
  X,
  Sun,
  Moon,
  LayoutDashboard,
  Plus,
  BarChart3,
  Sparkles,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/features', label: 'Features' },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setOpen(false);
  };

  const linkCls = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-white/15 text-white shadow-glass'
        : 'text-slate-300 hover:text-white hover:bg-white/10'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <Tag className="w-5 h-5 text-white" />
          </span>
          <span className="font-extrabold text-lg tracking-tight">
            Smart<span className="gradient-text">Price</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-colors"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-200">
                <div className="w-6 h-6 rounded-lg gradient-bg flex items-center justify-center text-white font-bold text-[11px]">
                  {(user?.name || user?.email || 'U')[0].toUpperCase()}
                </div>
                <span className="font-medium max-w-[120px] truncate">
                  {user?.name || user?.email?.split('@')[0]}
                </span>
              </div>

              <Link
                to="/add"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl gradient-bg text-white text-xs font-semibold hover:opacity-90 shadow-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Track Product
              </Link>

              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold transition-all"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl gradient-bg text-white text-xs font-semibold hover:opacity-90 shadow-lg transition-all"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="p-2 rounded-lg bg-white/10 border border-white/10"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            className="p-2 rounded-lg bg-white/10 border border-white/10"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden px-4 pb-4 space-y-1 animate-fade-in border-t border-white/10 pt-2">
          {isAuthenticated && (
            <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-200">
              <div className="w-6 h-6 rounded-lg gradient-bg flex items-center justify-center text-white font-bold text-[11px]">
                {(user?.name || user?.email || 'U')[0].toUpperCase()}
              </div>
              <span className="font-medium truncate">
                Signed in as {user?.name || user?.email}
              </span>
            </div>
          )}

          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setOpen(false)}
              className={linkCls}
            >
              <span className="block py-1">{l.label}</span>
            </NavLink>
          ))}

          {isAuthenticated ? (
            <>
              <Link
                to="/add"
                onClick={() => setOpen(false)}
                className={`flex items-center justify-center gap-1.5 mt-2 px-4 py-2.5 rounded-xl gradient-bg text-white text-sm font-semibold ${
                  location.pathname === '/add' ? 'ring-2 ring-white/40' : ''
                }`}
              >
                <Sparkles className="w-4 h-4" /> Track Product
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-1.5 mt-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </>
          ) : (
            <div className="pt-2 flex gap-2">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex-1 text-center py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setOpen(false)}
                className="flex-1 text-center py-2 rounded-xl gradient-bg text-white text-xs font-semibold"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
