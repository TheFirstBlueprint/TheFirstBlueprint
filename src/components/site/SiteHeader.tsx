import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Planner', to: '/planner' },
  { label: 'Patch Notes', to: '/patch-notes' },
  { label: 'About', to: '/about' },
];

export const SiteHeader = () => {
  return (
    <header className="w-full border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">FTC Decode</p>
          <h1 className="text-lg font-semibold text-foreground">Strategy Planner</h1>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `tool-button text-xs font-mono ${isActive ? 'active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
};
