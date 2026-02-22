import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, FileText, History, LogOut, Info } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, loading, login, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkClass = (path: string) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      pathname === path || pathname.startsWith(path + "/")
        ? "bg-white/20 text-white"
        : "text-white/70 hover:text-white hover:bg-white/10"
    }`;

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "shadow-lg shadow-navy/20" : ""
      } bg-navy`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
            <span className="text-white font-serif text-lg leading-none select-none">"</span>
          </div>
          <span className="font-display text-lg font-bold text-white tracking-tight hidden sm:inline">
            Verities
          </span>
        </Link>

        {/* Nav links — consistent on every page */}
        <div className="flex items-center gap-1">
          <Link to="/check" className={linkClass("/check")}>
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Check Facts</span>
          </Link>
          <Link to="/review" className={linkClass("/review")}>
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Review</span>
          </Link>
          <Link to="/history" className={linkClass("/history")}>
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">History</span>
          </Link>
          <Link to="/about" className={linkClass("/about")}>
            <Info className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">About</span>
          </Link>
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-7 w-16 rounded-full bg-white/10 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                title="Profile & Settings"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName ?? user.email}
                    className="h-7 w-7 rounded-full object-cover border border-white/20"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white text-xs font-bold">
                    {initials}
                  </div>
                )}
                <span className="hidden md:inline max-w-[120px] truncate">
                  {user.displayName ?? user.email.split("@")[0]}
                </span>
              </Link>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-white/25 hover:border-white/30"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
