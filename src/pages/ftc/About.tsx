import { Helmet } from 'react-helmet-async';
import { SiteHeader } from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

const CONTRIBUTORS = [
  { name: '27272 Build Lead', role: '' },
  { name: '27272 Code Lead', role: '' },
];

const FtcAbout = () => {
  return (
    <>
      <Helmet>
        <title>TheFirstBlueprint | FTC About</title>
        <meta
          name="description"
          content="Learn about the team behind the FTC strategy planner."
        />
      </Helmet>
      <div className="min-h-screen bg-background field-container flex flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl px-6 py-10 flex-1">
          <section className="panel">
            <div className="panel-header">About The Project</div>
            <p className="text-sm text-muted-foreground">
              FTC Strategy Planner is built to help teams visualize match flow, coordinate robot roles,
              and prepare strategies faster.
            </p>
          </section>

          <section className="panel mt-8">
            <div className="panel-header">Contributors</div>
            <p className="text-xs text-muted-foreground mb-4">
              "Veni, vidi, contulit" - I came, I saw, I contributed
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {CONTRIBUTORS.map((contributor) => (
                <div
                  key={`${contributor.name}-${contributor.role}`}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <h3 className="text-base font-semibold text-foreground">{contributor.name}</h3>
                  <p className="text-xs text-muted-foreground">{contributor.role}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel mt-8">
            <div className="panel-header">Contact Us</div>
            <p className="text-sm text-muted-foreground">
              Reach out for questions, collaborations, or updates.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition hover:border-primary/60"
                rel="noreferrer"
                target="_blank"
              >
                <svg
                  className="h-5 w-5 text-foreground"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M23 7.5c0-2-1.6-3.5-3.6-3.5H4.6C2.6 4 1 5.5 1 7.5v9c0 2 1.6 3.5 3.6 3.5h14.8c2 0 3.6-1.5 3.6-3.5v-9zm-13 7.1V9.4l5.6 2.6L10 14.6z" />
                </svg>
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    YouTube
                  </p>
                  <p className="text-sm text-foreground">Coming soon!</p>
                </div>
              </a>
              <a
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition hover:border-primary/60"
                rel="noreferrer"
                target="_blank"
              >
                <svg
                  className="h-5 w-5 text-foreground"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5.2A3.8 3.8 0 1 0 12 19.8 3.8 3.8 0 0 0 12 8.2zm6-1.8a1 1 0 1 0-1 1 1 1 0 0 0 1-1zM12 10a2 2 0 1 1-2 2 2 2 0 0 1 2-2z" />
                </svg>
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Instagram
                  </p>
                  <p className="text-sm text-foreground">Coming soon!</p>
                </div>
              </a>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
};

export default FtcAbout;
