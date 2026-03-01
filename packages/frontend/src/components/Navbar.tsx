import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, FileText, History, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, loading, login, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkClass = (path: string) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
      pathname === path || pathname.startsWith(path + "/")
        ? "bg-teal/15 text-teal-light"
        : "text-white/55 hover:text-white/90 hover:bg-white/6"
    }`;

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "navbar-glass"
          : "bg-dark-base/70 backdrop-blur-sm border-b border-white/5"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/15 border border-teal/20 transition-all duration-200 group-hover:bg-teal/25 group-hover:border-teal/35">
            <span className="text-teal-light font-serif text-lg leading-none select-none">"</span>
          </div>
          <span className="font-display text-base font-bold text-white tracking-tight hidden sm:inline">
            Verities
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-0.5">
          {user ? (
            <>
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
            </>
          ) : (
            <>
              <Link to="/pricing" className={linkClass("/pricing")}>Pricing</Link>
              <Link to="/about" className={linkClass("/about")}>Contact</Link>
            </>
          )}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-7 w-16 rounded-full bg-white/8 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-1.5">
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-white/70 hover:bg-white/8 hover:text-white transition-all"
                title="Profile & Settings"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName ?? user.email}
                    className="h-7 w-7 rounded-full object-cover border border-white/15"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal/20 text-teal-light text-xs font-bold border border-teal/25">
                    {initials}
                  </div>
                )}
                <span className="hidden md:inline max-w-[100px] truncate text-white/65">
                  {user.displayName ?? user.email.split("@")[0]}
                </span>
              </Link>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-white/40 hover:bg-white/6 hover:text-white/75 transition-all"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="bg-teal text-white font-semibold text-sm py-1.5 px-5 rounded-full hover:bg-teal-light transition-all duration-150 cursor-pointer shadow-lg shadow-teal/25"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
