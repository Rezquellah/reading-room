import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import "@/app/site.css";

export function PublicSite({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <a className="site-skip" href="#main">
        Skip to content
      </a>
      <header className="site-header site-width">
        <Link className="site-brand" href="/" aria-label="Reading Room home">
          <BookOpen size={26} strokeWidth={1.4} />
          <span>
            Reading Room<span className="brand-dot">.</span>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/about">Our story</Link>
          <Link className="site-nav-cta" href="/app">
            Open Reading Room <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
      {children}
      <footer className="site-footer site-width">
        <div>
          <Link className="site-brand" href="/">
            Reading Room.
          </Link>
          <p>A little space for a more curious mind.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="mailto:contact@rezquellah.com">
            Say hello <ArrowUpRight size={14} />
          </a>
        </nav>
        <div className="site-colophon">
          <span>© {new Date().getFullYear()} Reading Room</span>
          <span>Read deeply. Make it yours.</span>
        </div>
      </footer>
    </div>
  );
}

export function SiteCTA() {
  return (
    <section className="site-cta site-width">
      <span className="site-kicker">YOUR NEXT CHAPTER</span>
      <h2>
        Give your ideas
        <br />
        somewhere to grow.
      </h2>
      <Link className="site-button light" href="/app?auth=signup">
        Create your reading room <ArrowUpRight size={19} />
      </Link>
      <p>Start with one book. Keep what matters.</p>
    </section>
  );
}
