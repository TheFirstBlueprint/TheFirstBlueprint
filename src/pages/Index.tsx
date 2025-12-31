import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { SiteHeader } from '@/components/site/SiteHeader';

const VIDEO_EMBED_URL = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
const VIDEO_LINK_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>FTC DECODE Strategy Planner | Home</title>
        <meta
          name="description"
          content="Home base for the FTC DECODE strategy planner with quick access, instructions, and updates."
        />
      </Helmet>
      <div className="min-h-screen bg-background field-container">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="panel">
              <div className="panel-header">Featured Walkthrough</div>
              <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
                <iframe
                  src={VIDEO_EMBED_URL}
                  title="FTC DECODE Strategy Planner Walkthrough"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href={VIDEO_LINK_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="tool-button"
                >
                  Open Video Link
                </a>
                <p className="text-xs text-muted-foreground">
                  Replace the URLs at the top of this file to customize the embed.
                </p>
              </div>
            </section>

            <div className="space-y-8">
              <section className="panel">
                <div className="panel-header">Quick Start</div>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li>Drop robots and balls onto the field to start building a plan.</li>
                  <li>Use the left panel tools to draw paths and annotate routes.</li>
                  <li>Click a robot to toggle intake/outtake controls and edit details.</li>
                  <li>Use keyboard shortcuts for speed, then adjust them in Settings.</li>
                  <li>Export your plan to share with your drive team.</li>
                </ol>
                <Link to="/planner" className="tool-button active mt-6 w-full justify-center">
                  Open Field Planner
                </Link>
              </section>
              <section className="panel">
                <div className="panel-header">Instructions</div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Drag robots & balls to position</li>
                  <li>Drop balls on robots to collect</li>
                  <li>Click robot for controls</li>
                  <li>Arrow keys rotate selected robot</li>
                  <li>I to toggle intake, K to shoot all balls</li>
                  <li>O to shoot one ball</li>
                  <li>L to cycle held balls</li>
                  <li>Use pen to draw paths</li>
                  <li>Export to save strategy</li>
                </ul>
              </section>
            </div>
          </div>

          <section className="panel mt-8">
            <div className="panel-header">Planner Highlights</div>
            <div className="grid gap-4 md:grid-cols-3 text-sm text-muted-foreground">
              <div>
                <h3 className="text-foreground font-semibold mb-1">Fast Strategy Drafting</h3>
                <p>Drag-and-drop robots, balls, and drawings with snap-safe mechanics.</p>
              </div>
              <div>
                <h3 className="text-foreground font-semibold mb-1">Match Prep Ready</h3>
                <p>Use the built-in timer and classifier controls to simulate match flow.</p>
              </div>
              <div>
                <h3 className="text-foreground font-semibold mb-1">Team Collaboration</h3>
                <p>Export plans as JSON to share setups between mentors and drivers.</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default Index;
