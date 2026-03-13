import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy border-t border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <Link to="/" className="flex items-center gap-2.5 group w-fit">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 group-hover:bg-white/25 transition-colors">
                <span className="text-white font-serif text-lg leading-none select-none">"</span>
              </div>
              <span className="font-display text-lg font-bold text-white tracking-tight">Verities</span>
            </Link>
            <p className="text-sm text-white/50 leading-relaxed max-w-[200px]">
              AI-powered claim verification for writers who care about accuracy.
            </p>
            <p className="text-xs text-white/30 mt-auto pt-4">© {year} Verities</p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Product</p>
            <ul className="space-y-2.5">
              <li>
                <Link to="/check" className="text-sm text-white/60 hover:text-white transition-colors">
                  Check Facts
                </Link>
              </li>
              <li>
                <Link to="/review" className="text-sm text-white/60 hover:text-white transition-colors">
                  Review Document
                </Link>
              </li>
              <li>
                <Link to="/history" className="text-sm text-white/60 hover:text-white transition-colors">
                  History
                </Link>
              </li>
              <li>
                <Link to="/projects" className="text-sm text-white/60 hover:text-white transition-colors">
                  Projects
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Company</p>
            <ul className="space-y-2.5">
              <li>
                <Link to="/about" className="text-sm text-white/60 hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-white/60 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hello@verities.app"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
