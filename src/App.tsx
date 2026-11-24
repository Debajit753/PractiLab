import { useEffect, useState } from 'react';
import { ObservationsTab } from './components/ObservationsTab';
import { TheoryTab } from './components/TheoryTab';
import { Workbench } from './components/Workbench';
import { beeeCatalog, subjects } from './practicals/catalog';
import { Sandbox } from './sandbox/Sandbox';

function useHashRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [parts, setParts] = useState(read);
  useEffect(() => {
    const on = () => {
      setParts(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return parts;
}

function Header() {
  return (
    <header className="site-header no-print">
      <a href="#/" className="brand">
        <span className="brand-mark" aria-hidden>
          <svg viewBox="0 0 64 64" width="28" height="28">
            <rect width="64" height="64" rx="12" fill="#ffffff22" />
            <circle cx="22" cy="32" r="9" fill="#ff5a4f" />
            <circle cx="42" cy="32" r="9" fill="#111" stroke="#fff" strokeWidth="2" />
            <path d="M22 32 C 28 52, 36 52, 42 32" stroke="#ffd43b" strokeWidth="4" fill="none" />
          </svg>
        </span>
        PractiLab
      </a>
      <nav>
        <a href="#/beee">BEEE Lab</a>
        <span className="nav-soon">Networks Lab</span>
        <span className="nav-soon">CS Lab</span>
      </nav>
    </header>
  );
}

function Home() {
  return (
    <main className="page">
      <section className="hero">
        <h1>Do your lab practicals online, on kits that behave like the real thing.</h1>
        <p>
          Wire up trainer kits with patch cords, turn the knobs, flip the mains switch and read analog meters. Every reading comes
          from a real circuit simulation of exactly what you wired.
        </p>
        <a className="btn primary big" href="#/beee/kcl-kvl/workbench">
          Start with KCL and KVL
        </a>
      </section>
      <div className="grid">
        {subjects.map((s) =>
          s.ready ? (
            <a key={s.id} href={`#/${s.id}`} className="tile">
              <h2>{s.title}</h2>
              <p>{s.blurb}</p>
              <span className="tile-cta">Open lab</span>
            </a>
          ) : (
            <div key={s.id} className="tile disabled">
              <h2>{s.title}</h2>
              <p>{s.blurb}</p>
              <span className="badge">Coming soon</span>
            </div>
          ),
        )}
      </div>
    </main>
  );
}

function BeeeLab() {
  return (
    <main className="page">
      <nav className="crumbs">
        <a href="#/">Home</a> / BEEE Lab
      </nav>
      <h1>BEEE Lab</h1>
      <p className="muted">Choose a practical. Each one has theory, an interactive kit, and an observation table with results.</p>
      <div className="grid">
        {beeeCatalog.map((c) =>
          c.practical || c.href ? (
            <a key={c.id} href={c.href ?? `#/beee/${c.id}/workbench`} className="tile">
              <h2>{c.title}</h2>
              <p>{c.blurb}</p>
              <span className="tile-cta">{c.href ? 'Open sandbox' : 'Open practical'}</span>
            </a>
          ) : (
            <div key={c.id} className="tile disabled">
              <h2>{c.title}</h2>
              <p>{c.blurb}</p>
              <span className="badge">{c.phase}</span>
            </div>
          ),
        )}
      </div>
    </main>
  );
}

const TABS = [
  { id: 'theory', label: 'Theory' },
  { id: 'workbench', label: 'Workbench' },
  { id: 'observations', label: 'Observations and Result' },
];

function PracticalPage({ id, tab }: { id: string; tab: string }) {
  const item = beeeCatalog.find((c) => c.id === id);
  const practical = item?.practical;
  if (!practical) return <NotFound />;
  const active = TABS.some((t) => t.id === tab) ? tab : 'workbench';
  return (
    <main className={`page ${active === 'workbench' ? 'wide' : ''}`}>
      <nav className="crumbs no-print">
        <a href="#/">Home</a> / <a href="#/beee">BEEE Lab</a> / {item.title}
      </nav>
      <h1 className="no-print">{practical.title}</h1>
      <div className="tabs no-print" role="tablist">
        {TABS.map((t) => (
          <a
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            className={`tab ${active === t.id ? 'on' : ''}`}
            href={`#/beee/${id}/${t.id}`}
          >
            {t.label}
          </a>
        ))}
      </div>
      {active === 'theory' && <TheoryTab practical={practical} />}
      {active === 'workbench' && <Workbench practical={practical} />}
      {active === 'observations' && <ObservationsTab practical={practical} />}
    </main>
  );
}

function NotFound() {
  return (
    <main className="page">
      <h1>Page not found</h1>
      <p>
        <a href="#/">Back to home</a>
      </p>
    </main>
  );
}

export default function App() {
  const parts = useHashRoute();
  let content;
  if (parts.length === 0) content = <Home />;
  else if (parts[0] === 'beee' && parts.length === 1) content = <BeeeLab />;
  else if (parts[0] === 'beee' && parts[1] === 'sandbox')
    content = (
      <main className="page wide">
        <nav className="crumbs">
          <a href="#/">Home</a> / <a href="#/beee">BEEE Lab</a> / Sandbox
        </nav>
        <h1>Breadboard Sandbox</h1>
        <Sandbox />
      </main>
    );
  else if (parts[0] === 'beee') content = <PracticalPage id={parts[1]} tab={parts[2] ?? 'workbench'} />;
  else content = <NotFound />;
  return (
    <>
      <Header />
      {content}
    </>
  );
}
