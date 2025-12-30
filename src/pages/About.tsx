import { Helmet } from 'react-helmet-async';
import { SiteHeader } from '@/components/site/SiteHeader';

const CONTRIBUTORS = [
  // { name: 'ChatGPT Codex', role: 'Lead Developer' },
  { name: 'Jacob James', role: '27272 Code Lead' },
  { name: 'Prabhnoor Singh', role: '27272 Build Lead' },
];

const About = () => {
  return (
    <>
      <Helmet>
        <title>FTC DECODE Strategy Planner | About</title>
        <meta
          name="description"
          content="Learn about the team behind the FTC DECODE strategy planner."
        />
      </Helmet>
      <div className="min-h-screen bg-background field-container">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl px-6 py-10">
          <section className="panel">
            <div className="panel-header">About The Project</div>
            <p className="text-sm text-muted-foreground">
              FTC DECODE Strategy Planner is built to help teams visualize match flow,
              coordinate robot roles, and prepare strategies faster.
            </p>
          </section>

          <section className="panel mt-8">
            <div className="panel-header">Contributors</div>
            <p className="text-xs text-muted-foreground mb-4">
              Add new contributors by editing the list in this file.
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
        </main>
      </div>
    </>
  );
};

export default About;
