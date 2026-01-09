import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import fieldShow from '@/assets/field show.png';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>TFBP | Home</title>
        <meta
          name="description"
          content="Thefirstblueprint home for FTC and FRC planning tools."
        />
      </Helmet>
      <div className="min-h-screen bg-background frontpage-shell">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 blueprint-grid" />
        <div aria-hidden="true" className="corner-brackets" />

        <main className="relative mx-auto w-full max-w-6xl px-6 py-12">
          <header className="mb-10">
            <p className="font-mono text-xs uppercase tracking-[0.36em] text-muted-foreground">
              Robotics command center
            </p>
            <h1 className="mt-3 font-title text-4xl tracking-[0.18em] text-foreground">
              TheFirstBlueprint
            </h1>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">
              Build smarter match plans in minutes.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Choose your league, drop in a modular field image, and start organizing strategy with
              clean, flexible layouts.
            </p>
          </header>

          <section className="relative">
            <div aria-hidden="true" className="hero-radial" />
            <div className="relative z-10 grid gap-6 lg:grid-cols-2">
              <Link
                to="/planner"
                className="command-card group min-h-[360px] p-6"
              >
                <div className="card-media card-media--blue" aria-hidden="true">
                  <img
                    src={fieldShow}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-70"
                    draggable={false}
                  />
                  <div className="absolute right-6 top-6 rounded-lg border border-border/60 bg-background/30 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
                    Module slot
                  </div>
                </div>
                <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      FTC planning
                    </p>
                    <h3 className="mt-2 text-3xl font-semibold text-foreground">
                      FTC planning
                    </h3>
                  </div>
                  <div className="command-card__panel p-4">
                    <p className="text-sm text-muted-foreground">
                      Map robot paths, annotate strategy cycles, and export your setup for match day.
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    <span>Enter planner</span>
                    <span className="text-alliance-blue">Open</span>
                  </div>
                </div>
              </Link>

              <div className="command-card command-card--locked min-h-[360px] p-6">
                <div className="card-media card-media--red" aria-hidden="true">
                  <div className="absolute right-6 top-6 rounded-lg border border-border/60 bg-background/30 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
                    Module slot
                  </div>
                </div>
                <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      FRC planning
                    </p>
                    <h3 className="mt-2 text-3xl font-semibold text-foreground">
                      FRC planning (coming soon)
                    </h3>
                  </div>
                  <div className="command-card__panel p-4">
                    <p className="text-sm text-muted-foreground">
                      The FRC command deck is in design. More modules arrive soon.
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    <span>Stay tuned</span>
                    <span className="text-muted-foreground">Locked</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="panel">
              <div className="panel-header">Contact</div>
              <h3 className="text-xl font-semibold text-foreground">Feedback</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Use the forms below to share feedback or report a bug.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <a
                  className="tool-button active w-full text-sm"
                  href="https://docs.google.com/forms/d/e/1FAIpQLScuZw-Olh9r-3xb1CchwMov8MTVGyKRlQKF0YCC_CXBm581Zg/viewform?usp=dialog"
                  rel="noreferrer"
                  target="_blank"
                >
                  Feedback form
                </a>
                <a
                  className="tool-button active w-full text-sm"
                  href="https://docs.google.com/forms/d/e/1FAIpQLSfjtssKj7C5Dr80AMW0kl5BnlD3t9F-cb2SVH_KBGnHuM84uw/viewform?usp=dialog"
                  rel="noreferrer"
                  target="_blank"
                >
                  Bug report form
                </a>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">Mission</div>
              <h3 className="text-xl font-semibold text-foreground">
                Enabling strategic excellence for every team, from rookie to world-class.
              </h3>
              <blockquote className="mt-6 border-l border-border pl-4 text-sm text-muted-foreground">
                "Perfect planning for our shark attack" - Sharkans 27272
              </blockquote>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default Index;
