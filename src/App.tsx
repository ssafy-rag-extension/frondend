import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';

function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 bg-[var(--color-neutral-100)] text-[var(--color-neutral-900)] font-sans">
      <div className="flex gap-8">
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="w-16 h-16" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="w-16 h-16" alt="React logo" />
        </a>
      </div>

      <section className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-[var(--color-primary)]">Pretendard Bold</h1>
        <h2 className="text-3xl font-medium text-[var(--color-primary-light)]">
          Pretendard Medium
        </h2>
        <p className="text-lg font-light text-[var(--color-neutral-900)]">
          This paragraph uses <b>Pretendard Light</b> — check spacing & rendering ✨
        </p>
      </section>

      <div className="mt-6 flex gap-4">
        <button
          onClick={() => setCount(c => c + 1)}
          className="px-6 py-2 rounded-lg text-white font-medium bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] transition"
        >
          count is {count}
        </button>
        <button className="px-6 py-2 rounded-lg text-white font-medium bg-[var(--color-secondary)] hover:opacity-80 transition">
          Secondary
        </button>
      </div>

      <footer className="mt-10 text-sm text-gray-500">
        <p>
          Fonts & colors test complete 🎨 — edit <code>src/styles/fonts.css</code> or{' '}
          <code>colors.css</code> to tweak values.
        </p>
      </footer>
    </main>
  );
}

export default App;
