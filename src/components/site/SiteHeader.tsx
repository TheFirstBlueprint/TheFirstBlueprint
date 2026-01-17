import { NavLink, Link } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Planner', to: '/ftc/planner' },
  { label: 'About', to: '/ftc/about' },
  { label: 'Patch Notes', to: '/ftc/patch-notes' },
];

type SiteHeaderProps = {
  showBackButton?: boolean;
  backTo?: string;
};

export const SiteHeader = ({ showBackButton = false, backTo = '/' }: SiteHeaderProps) => {
  return (
    <header className="w-full border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Link
              to={backTo}
              className="tool-button h-10 w-10"
              title="Back to home"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">TheFirstBlueprint | FTC</p>
            <h1 className="text-lg font-semibold text-foreground">FTC Strategy Planner</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Link
            to="/ftc/instructions"
            className="tool-button text-xs font-mono"
            title="Instructions"
            aria-label="Open instructions"
          >
            Instructions
          </Link>
          <Link
            to="/ftc/settings"
            className="tool-button w-10 h-10"
            title="Settings"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
};
