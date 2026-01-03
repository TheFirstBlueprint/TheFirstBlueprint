import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { SiteHeader } from '@/components/site/SiteHeader';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Thefirstblueprint | Home</title>
        <meta
          name="description"
          content="Thefirstblueprint home for FTC and FRC planning tools."
        />
      </Helmet>
      <div className="min-h-screen bg-background field-container">
        <SiteHeader />
        <main className="relative mx-auto w-full max-w-6xl px-6 py-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-24 left-[-8%] h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute top-40 right-[-6%] h-72 w-72 rounded-full bg-alliance-blue/20 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-40 w-72 rounded-full bg-white/5 blur-2xl" />
          </div>

          <header className="mb-10">
            <h1 className="font-mono text-4xl font-semibold uppercase tracking-[0.12em] text-foreground">
              Thefirstblueprint
            </h1>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">
              Build smarter match plans in minutes.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Choose your league, drop in a modular field image, and start organizing strategy with
              clean, flexible layouts.
            </p>
          </header>

          <section className="grid gap-6 lg:grid-cols-2">
            <Link
              to="/planner"
              className="group relative min-h-[360px] overflow-hidden rounded-2xl border border-border bg-card/80 p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
            >
              <div className="absolute inset-y-0 right-0 w-[55%] bg-gradient-to-br from-primary/30 via-transparent to-transparent" />
              <div className="absolute right-6 top-6 h-32 w-44 rounded-xl border border-white/10 bg-gradient-to-br from-white/15 via-white/5 to-transparent">
                <div className="flex h-full items-end justify-end p-2 text-[10px] font-mono uppercase tracking-widest text-white/50">
                  Image slot
                </div>
              </div>
              <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    FTC Planning
                  </p>
                  <h3 className="mt-2 text-3xl font-semibold text-foreground">
                    FTC Planning
                  </h3>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 backdrop-blur">
                  <p className="text-sm text-muted-foreground">
                    Map robot paths, annotate strategy cycles, and export your setup for match day.
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  <span>Enter planner</span>
                  <span className="text-primary">Open</span>
                </div>
              </div>
            </Link>

            <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-border bg-card/60 p-6">
              <div className="absolute inset-y-0 right-0 w-[55%] bg-gradient-to-br from-alliance-red/20 via-transparent to-transparent" />
              <div className="absolute right-6 top-6 h-32 w-44 rounded-xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent">
                <div className="flex h-full items-end justify-end p-2 text-[10px] font-mono uppercase tracking-widest text-white/40">
                  Image slot
                </div>
              </div>
              <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    FRC Planning
                  </p>
                  <h3 className="mt-2 text-3xl font-semibold text-foreground">
                    FRC Planning
                  </h3>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 backdrop-blur">
                  <p className="text-sm text-muted-foreground">FRC planning coming soon.</p>
                </div>
                <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  <span>Stay tuned</span>
                  <span className="text-muted-foreground">Locked</span>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-border bg-card/80 p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Contact us
              </p>
              <h3 className="mt-2 text-xl font-semibold text-foreground">Stay in the loop.</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Drop your name and email so we can keep your team updated.
              </p>
              <form className="mt-4 grid gap-3">
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Team member name"
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground"
                />
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="team@email.com"
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground"
                />
                <button type="button" className="tool-button active mt-2 w-full">
                  Contact us
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-border bg-card/70 p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Our goal
              </p>
              <h3 className="mt-2 text-xl font-semibold text-foreground">
                Helping all teams organize to maximize winability and what not.
              </h3>
              <blockquote className="mt-6 border-l border-border pl-4 text-sm text-muted-foreground">
                "Took us to Worlds." - Team so and so
              </blockquote>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default Index;
