import { useEffect, useMemo, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';

// ---- Token Groups (sync with :root) ---------------------------------------
const allVars = {
  Brand: [
    '--color-retina',
    '--color-retina-bg',
    '--color-hebees',
    '--color-hebees-bg',
    '--color-hebees-blue',
  ],
  Gradients: ['--color-hebees-gradient'],
  Status: ['--color-success', '--color-success-bg', '--color-loading', '--color-loading-bg'],
  Neutral: [
    '--color-white',
    '--color-black',
    '--color-gray-100',
    '--color-gray-200',
    '--color-gray-300',
    '--color-gray-400',
    '--color-gray-500',
    '--color-gray-600',
    '--color-gray-700',
    '--color-gray-800',
    '--color-gray-900',
  ],
  Overlays: ['--overlay-50', '--overlay-30', '--overlay-10'],
};

type Dict = Record<string, string>;

function useResolvedVars() {
  const [values, setValues] = useState<Dict>({});
  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const next: Dict = {};
    Object.values(allVars)
      .flat()
      .forEach(v => {
        next[v] = styles.getPropertyValue(v).trim();
      });
    setValues(next);
  }, []);
  return values;
}

function Swatch({ name, value }: { name: string; value: string }) {
  const isGradient = name.includes('gradient');
  const isOverlay = name.startsWith('--overlay');
  const isMissing = !value;

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
      <div
        className="h-20 w-full"
        style={
          isGradient
            ? { background: `var(${name})` }
            : isOverlay
              ? {
                  backgroundImage:
                    'linear-gradient(45deg,#ddd 25%,transparent 25%), linear-gradient(135deg,#ddd 25%,transparent 25%), linear-gradient(45deg,transparent 75%,#ddd 75%), linear-gradient(135deg,transparent 75%,#ddd 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  position: 'relative' as const,
                }
              : { backgroundColor: `var(${name})` }
        }
      >
        {isOverlay && <div className="h-20 w-full" style={{ backgroundColor: `var(${name})` }} />}
      </div>
      <div className="p-3 text-sm">
        <div className="font-medium text-gray-900 flex items-center gap-2">
          <code className="px-2 py-0.5 rounded bg-gray-100 text-gray-800">{name}</code>
          {isMissing && <span className="text-xs text-red-600">(undefined)</span>}
        </div>
        <div className="mt-1 text-gray-600 truncate">{value || '—'}</div>
      </div>
    </div>
  );
}

function Section({ title, vars, values }: { title: string; vars: string[]; values: Dict }) {
  return (
    <section className="w-full max-w-6xl">
      <header className="flex items-end justify-between mb-3">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500">{vars.length} tokens</span>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {vars.map(v => (
          <Swatch key={v} name={v} value={values[v]} />
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [count, setCount] = useState(0);
  const values = useResolvedVars();

  const groups = useMemo(
    () =>
      Object.entries(allVars).map(([k, v]) => (
        <Section key={k} title={k} vars={v} values={values} />
      )),
    [values]
  );

  return (
    <main className="min-h-screen flex flex-col items-center gap-10 py-10 bg-[var(--color-gray-100)] text-[var(--color-gray-900)] font-sans">
      <div className="flex gap-8">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="w-16 h-16" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="w-16 h-16" alt="React logo" />
        </a>
      </div>

      <section className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-[var(--color-retina)]">Pretendard Bold</h1>
        <h2 className="text-3xl font-medium text-[var(--color-hebees)]">Pretendard Medium</h2>
        <p className="text-lg font-light text-[var(--color-gray-900)]">
          This paragraph uses <b>Pretendard Light</b> — check spacing & rendering ✨
        </p>
      </section>

      <div className="flex gap-4">
        <button
          onClick={() => setCount(c => c + 1)}
          className="px-6 py-2 rounded-lg text-white font-medium"
          style={{ background: 'var(--color-hebees-gradient)' }}
        >
          count is {count}
        </button>
        <button className="px-6 py-2 rounded-lg text-white font-medium bg-[var(--color-retina)] hover:opacity-90 transition">
          Primary
        </button>
        <button className="px-6 py-2 rounded-lg text-white font-medium bg-[var(--color-hebees)] hover:opacity-90 transition">
          Secondary
        </button>
      </div>

      <div className="w-full max-w-6xl space-y-8">{groups}</div>

      <footer className="mt-4 text-sm text-gray-500 text-center px-4">
        <p>
          Colors preview bound to <code>:root</code> tokens — edit your global CSS to see live
          updates.
        </p>
      </footer>
    </main>
  );
}
