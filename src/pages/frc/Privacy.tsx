import { Helmet } from 'react-helmet-async';
import { FrcSiteHeader } from '@/components/site/FrcSiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

const FrcPrivacy = () => {
  return (
    <>
      <Helmet>
        <title>TheFirstBlueprint | FRC Privacy</title>
        <meta
          name="description"
          content="FRC planning privacy policy."
        />
      </Helmet>
      <div className="min-h-screen bg-background field-container flex flex-col">
        <FrcSiteHeader />
        <main className="mx-auto w-full max-w-4xl px-6 py-10 flex-1">
          <section className="panel">
            <div className="panel-header">Privacy Policy</div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                TheFirstBlueprint respects your privacy. This policy describes how standard website data is collected
                and used while you access FRC planning tools.
              </p>
              <p>
                <span className="text-foreground">Information We Collect</span><br />
                We may collect basic technical information such as browser type, device information, and usage patterns.
                If you submit feedback or bug reports, we may collect the information you provide.
              </p>
              <p>
                <span className="text-foreground">How We Use Information</span><br />
                Data is used to improve performance, understand usage, and maintain the planning tools. We do not sell
                personal information.
              </p>
              <p>
                <span className="text-foreground">Cookies and Analytics</span><br />
                We may use cookies or similar technologies for basic analytics and site functionality.
              </p>
              <p>
                <span className="text-foreground">Third-Party Services</span><br />
                Links to external services are provided for convenience. Their privacy practices are governed by their own policies.
              </p>
              <p>
                <span className="text-foreground">Updates</span><br />
                This policy may be updated as the website evolves. Continued use constitutes acceptance of the updated policy.
              </p>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
};

export default FrcPrivacy;
