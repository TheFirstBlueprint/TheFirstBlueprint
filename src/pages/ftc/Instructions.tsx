import { Helmet } from 'react-helmet-async';
import { SiteHeader } from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

const FtcInstructions = () => {
  return (
    <>
      <Helmet>
        <title>TheFirstBlueprint | FTC Info</title>
        <meta
          name="description"
          content="FTC planner info and controls."
        />
      </Helmet>
      <div className="min-h-screen bg-background field-container flex flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-4xl px-6 py-10 flex-1">
          <section className="panel">
            <div className="panel-header">FTC Planner Info</div>
            <p className="text-sm text-muted-foreground">
              Welcome to TheFirstBlueprint FTC planner. Here are the core controls and workflow tips.
            </p>
            <div className="mt-4 grid gap-1 text-xs font-mono uppercase tracking-wide text-muted-foreground">
              <span>I - intake</span>
              <span>K - shoot all</span>
              <span>L - cycle balls within bot</span>
              <span>O - shoots one ball</span>
              <span>A - cycle sequencer left one step</span>
              <span>D - cycle sequencer right one step</span>
            </div>
          </section>

          <section className="panel mt-8">
            <div className="panel-header">How To Get Started</div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Start by clicking the "setup field" button on the left hand side. This sets up bots in a
                close + far zone configuration with preloads.
              </p>
              <p>
                To interact, click and drag on the robots. The left panel hosts tools for drawing,
                adding balls, motif controls, and save/load.
              </p>
              <p>
                Draw tools treat the field as a whiteboard, so you can plan strategy directly on the
                field.
              </p>
              <p>
                Motif controls affect the point interface on the right, which updates based on the
                current motif selection.
              </p>
              <p>
                The point interface accumulates scores throughout the game and resets with the
                "reset" button.
              </p>
              <p>
                For sequencer usage, use the info hover in the sequencer panel.
              </p>
              <p>
                When finished, click "export" to save a JSON file. Use "import" to load a saved
                configuration later.
              </p>
               <p>
               If you need more clarification watch our video on youtube for more help:
              </p>
              <u>
              <a href="https://www.youtube.com/playlist?list=PLojGuoR_rIykwYhxv--06Ho8Gp25f6NE_">
               https://www.youtube.com/playlist?list=PLojGuoR_rIykwYhxv--06Ho8Gp25f6NE_
              </a>
              </u>
              <p className="text-foreground">Happy strategizing!</p>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
};

export default FtcInstructions;
