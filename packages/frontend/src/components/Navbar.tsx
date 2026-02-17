import { Link, useLocation } from "react-router-dom";
import { BookOpen, Search, FileText, History, Info, LogIn, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, loading, login, logout } = useAuth();

  const linkClass = (path: string) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      pathname === path || pathname.startsWith(path + "/")
        ? "bg-cerulean-wash text-cerulean"
        : "text-ink-muted hover:text-ink hover:bg-parchment"
    }`;

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <nav className="sticky top-0 z-50 border-b border-vellum bg-ivory/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cerulean">
            <BookOpen className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold text-ink tracking-tight">
            Verities
          </span>
        </Link>

        {/* Nav links */}
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
            <div className="h-7 w-7 rounded-full bg-parchment animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-muted hover:bg-parchment hover:text-ink transition-colors"
                title="Profile & Settings"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName ?? user.email}
                    className="h-7 w-7 rounded-full object-cover border border-vellum"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cerulean text-white text-xs font-bold">
                    {initials}
                  </div>
                )}
                <span className="hidden md:inline max-w-[120px] truncate">
                  {user.displayName ?? user.email.split("@")[0]}
                </span>
              </Link>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-parchment hover:text-ink transition-colors"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-1.5 rounded-lg border border-vellum bg-white px-3 py-1.5 text-sm font-medium text-ink transition-all hover:border-stone hover:shadow-sm"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
