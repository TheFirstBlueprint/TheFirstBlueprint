import { Helmet } from 'react-helmet-async';
import { FrcSiteHeader } from '@/components/site/FrcSiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

const CONTRIBUTORS = [
  { name: 'Contributor One', role: 'Strategy' },
  { name: 'Contributor Two', role: 'Design' },
];

const FrcAbout = () => {
  return (
    <>
      <Helmet>
        <title>TheFirstBlueprint | FRC About</title>
        <meta
          name="description"
          content="Learn about the team behind the FRC planning tools."
        />
      </Helmet>
      <div className="min-h-screen bg-background field-container flex flex-col">
        <FrcSiteHeader />
        <main className="mx-auto w-full max-w-5xl px-6 py-10 flex-1">
          <section className="panel">
            <div className="panel-header">About TheFirstBlueprint — FRC</div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>TheFirstBlueprint helps robotics teams plan visually and communicate clearly.</p>
              <p>FRC mode provides a field-scaled space to coordinate alliance strategy and robot roles.</p>
            </div>
          </section>

          <section className="panel mt-8">
            <div className="panel-header">Contributors</div>
            <div className="grid gap-4 md:grid-cols-2">
              {CONTRIBUTORS.map((contributor) => (
                <div
                  key={contributor.name}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <h3 className="text-base font-semibold text-foreground">{contributor.name}</h3>
                  <p className="text-xs text-muted-foreground">{contributor.role}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
};

export default FrcAbout;
