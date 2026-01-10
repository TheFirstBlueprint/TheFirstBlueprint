import { Helmet } from 'react-helmet-async';
import { FrcSiteHeader } from '@/components/site/FrcSiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

const FrcInstructions = () => {
  return (
    <>
      <Helmet>
        <title>TheFirstBlueprint | FRC Instructions</title>
        <meta
          name="description"
          content="FRC planner instructions and controls."
        />
      </Helmet>
      <div className="min-h-screen bg-background field-container flex flex-col">
        <FrcSiteHeader />
        <main className="mx-auto w-full max-w-4xl px-6 py-10 flex-1">
          <section className="panel">
            <div className="panel-header">FRC Planner Instructions</div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Use the field to place and move up to 6 robots (3 red, 3 blue).</p>
              <p>Draw paths and notes directly on the field to coordinate strategy.</p>
              <p>Use the sequencer to capture and review step-by-step positions.</p>
              <p>This is a planning and communication tool; it does not simulate physics.</p>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
};

export default FrcInstructions;
