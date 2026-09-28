import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  GraduationCap,
  BarChart3,
  Sparkles,
  Settings as SettingsIcon,
  Scale,
  Shield,
  LogIn,
  User as UserIcon,
  FileText,
  Sun,
  Moon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import { useProgress, streakFromResults } from "../store/useProgress";
import { useSubject } from "../store/useSubject";
import { useTheme, applyTheme } from "../store/useTheme";
import { SUBJECTS, getSubject } from "../data/registry";
import { useAuth } from "../lib/auth";
import Aurora from "./reactbits/Aurora";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/module", label: "Lernmodule", icon: BookOpen },
  { to: "/karten", label: "Karteikarten", icon: Layers },
  { to: "/pruefung", label: "Prüfungsmodus", icon: GraduationCap },
  { to: "/aufgaben", label: "Aufgaben", icon: FileText },
  { to: "/statistik", label: "Statistik", icon: BarChart3 },
  { to: "/tutor", label: "KI-Tutor", icon: Sparkles },
  { to: "/einstellungen", label: "Einstellungen", icon: SettingsIcon },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const results = useProgress((s) => s.results);
  const streak = streakFromResults(results);
  const { active, setActive } = useSubject();
  const subject = getSubject(active);
  const { user, isAdmin, configured } = useAuth();
  const { theme, toggle } = useTheme();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <div className="min-h-screen text-slate-200">
      <Aurora />

      <aside className="safe-top fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-amber-100/10 bg-black/30 px-4 pb-6 backdrop-blur-xl lg:flex">
        <div className="mb-5 flex items-center gap-3 px-2">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-zhaw to-zhaw-dark shadow-glow ring-1 ring-zhaw-light/40">
            <Scale className="h-6 w-6 text-white keep-white" />
          </div>
          <div className="flex-1">
            <div className="font-display text-base font-semibold leading-tight text-white">ZHAW Trainer</div>
            <div className="text-[11px] text-slate-400">Semester 1 · WIN</div>
          </div>
          <button onClick={toggle} title="Hell / Dunkel" className="rounded-lg border border-amber-100/10 bg-white/5 p-2 text-slate-300 transition hover:border-zhaw-light/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zhaw-light/60">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <SubjectSwitcher active={active} onPick={(id) => { setActive(id); navigate("/"); }} />

        <nav className="mt-5 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const activeNav = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            const disabled = item.to === "/aufgaben" && !subject.hasTasks;
            if (disabled) return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  activeNav ? "text-white" : "text-slate-400 hover:text-slate-100"
                )}
              >
                {activeNav && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl border border-zhaw-light/30 bg-zhaw/20"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="relative h-[18px] w-[18px]" />
                <span className="relative">{item.label}</span>
              </NavLink>
            );
          })}
          {isAdmin && (
            <NavLink to="/admin" className={cn("relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium", location.pathname.startsWith("/admin") ? "text-white" : "text-amber-200/70 hover:text-amber-100")}>
              <Shield className="h-[18px] w-[18px]" /> Admin
            </NavLink>
          )}
        </nav>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-amber-100/10 bg-white/5 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Lern-Streak</span>
              <span className="font-semibold text-white">{streak} {streak === 1 ? "Tag" : "Tage"}</span>
            </div>
          </div>
          <UserBox user={user} configured={configured} />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="safe-top-sm sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-amber-100/10 bg-black/40 px-4 pb-3 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-zhaw to-zhaw-dark ring-1 ring-zhaw-light/40">
              <Scale className="h-4 w-4 text-white keep-white" />
            </div>
            <span className="font-display text-sm font-semibold text-white">ZHAW Trainer</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} title="Hell / Dunkel" className="rounded-lg border border-amber-100/10 bg-white/5 p-1.5 text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zhaw-light/60">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <span className="chip" style={{ borderColor: subject.accent + "66", color: subject.accent }}>{subject.short}</span>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16">{children}</main>
      </div>

      <MobileNav subject={subject} isAdmin={isAdmin} />
    </div>
  );
}

function SubjectSwitcher({ active, onPick }: { active: string; onPick: (id: never) => void }) {
  const [open, setOpen] = useState(false);
  const subject = getSubject(active as never);
  return (
    <div className="relative px-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-xl border border-amber-100/10 bg-white/5 px-3 py-2.5 text-left transition hover:border-zhaw-light/40 hover:bg-white/10"
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: subject.accent }} />
        <span className="flex-1 truncate text-sm font-medium text-white">{subject.name}</span>
        <span className="text-slate-500">▾</span>
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl panel-solid border border-amber-100/20 shadow-card">
          {SUBJECTS.map((s) => (
            <button
              key={s.id}
              onClick={() => { onPick(s.id as never); setOpen(false); }}
              className={cn("flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-white/10", s.id === active ? "text-white" : "text-slate-400")}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.accent }} />
              <span className="flex-1 truncate">{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserBox({ user, configured }: { user: { email?: string | null } | null; configured: boolean }) {
  const navigate = useNavigate();
  if (!configured) {
    return (
      <button onClick={() => navigate("/einstellungen")} className="w-full rounded-xl border border-amber-100/10 bg-white/5 p-3 text-left text-xs text-slate-400 hover:bg-white/10">
        <LogIn className="mb-1 h-3.5 w-3.5" /> Firebase nicht verbunden
        <div className="mt-0.5 text-[10px] text-slate-500">In Einstellungen konfigurieren</div>
      </button>
    );
  }
  if (!user) {
    return (
      <button onClick={() => navigate("/login")} className="btn-primary w-full !py-2 text-xs">
        <LogIn className="h-3.5 w-3.5" /> Anmelden
      </button>
    );
  }
  return (
    <button onClick={() => navigate("/einstellungen")} className="flex w-full items-center gap-2 rounded-xl border border-amber-100/10 bg-white/5 p-2.5 text-left hover:bg-white/10">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zhaw/40 text-[11px] text-white"><UserIcon className="h-3.5 w-3.5" /></div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-white">{user.email}</div>
        <div className="text-[10px] text-emerald-400">synchronisiert</div>
      </div>
    </button>
  );
}

function MobileNav({ subject, isAdmin }: { subject: { hasTasks: boolean }; isAdmin: boolean }) {
  const location = useLocation();
  const items = NAV.slice(0, 6).filter((n) => !(n.to === "/aufgaben" && !subject.hasTasks));
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-amber-100/10 bg-black/70 px-2 pt-2 backdrop-blur-xl lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
        return (
          <NavLink key={item.to} to={item.to} className={cn("flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[10px]", active ? "text-zhaw-light" : "text-slate-400")}>
            <Icon className="h-5 w-5" />
            {item.label.split(" ")[0]}
          </NavLink>
        );
      })}
    </nav>
  );
}
