import { Link, useLocation } from "react-router-dom";
import { BookOpen, Search, FileText } from "lucide-react";

export default function Navbar() {
  const { pathname } = useLocation();

  const linkClass = (path: string) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      pathname === path
        ? "bg-cerulean-wash text-cerulean"
        : "text-ink-muted hover:text-ink hover:bg-parchment"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-vellum bg-ivory/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cerulean">
            <BookOpen className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold text-ink tracking-tight">
            Verities
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link to="/check" className={linkClass("/check")}>
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Check Facts</span>
          </Link>
          <Link to="/review" className={linkClass("/review")}>
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Review Document</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
