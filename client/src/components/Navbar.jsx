import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="mr-4 text-lg font-semibold text-slate-900">Clinic Ops</span>
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/patients" className={linkClass}>
            Patients
          </NavLink>
          <NavLink to="/schedule" className={linkClass}>
            Schedule
          </NavLink>
          {isAdmin && (
            <NavLink to="/analytics" className={linkClass}>
              Analytics
            </NavLink>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {user.name} <span className="text-slate-400">- {user.role}</span>
          </span>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
