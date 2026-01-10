import { Helmet } from 'react-helmet-async';
import { FrcSiteHeader } from '@/components/site/FrcSiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

const FrcTerms = () => {
  return (
    <>
      <Helmet>
        <title>TheFirstBlueprint | FRC Terms</title>
        <meta
          name="description"
          content="FRC planning terms of service."
        />
      </Helmet>
      <div className="min-h-screen bg-background field-container flex flex-col">
        <FrcSiteHeader />
        <main className="mx-auto w-full max-w-4xl px-6 py-10 flex-1">
          <section className="panel">
            <div className="panel-header">Terms Of Service</div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p><span className="text-foreground">Purpose of the Website</span><br />
                TheFirstBlueprint FRC planning tools are provided for strategy visualization and team communication.
                The tools are for educational and competitive planning purposes only.
              </p>
              <p><span className="text-foreground">Acceptable Use</span><br />
                Use the website for lawful purposes only and do not disrupt or misuse services.
                You may not attempt to reverse engineer, overload, or exploit any part of the site.
              </p>
              <p><span className="text-foreground">Content and Assets</span><br />
                Field images, diagrams, and reference materials may be sourced from publicly available resources.
                Original site design and tools remain the property of TheFirstBlueprint unless stated otherwise.
              </p>
              <p><span className="text-foreground">User Submissions</span><br />
                If you submit feedback or bug reports, you grant permission for that information to be used to improve the site.
                You are responsible for your submissions.
              </p>
              <p><span className="text-foreground">Availability and Changes</span><br />
                The website is provided "as is" and may be modified or taken offline at any time without notice.
              </p>
              <p><span className="text-foreground">No Warranties</span><br />
                We do not guarantee error-free or uninterrupted service. Use the tools at your own discretion.
              </p>
              <p><span className="text-foreground">Limitation of Liability</span><br />
                TheFirstBlueprint is not responsible for losses or outcomes resulting from use of the planning tools.
              </p>
              <p><span className="text-foreground">Third-Party Links</span><br />
                Links to external services are provided for convenience. We are not responsible for their content or policies.
              </p>
              <p><span className="text-foreground">Privacy</span><br />
                Use of the website is also governed by the Privacy Policy, which explains how standard website data is collected and used.
              </p>
              <p><span className="text-foreground">Updates to These Terms</span><br />
                These Terms of Use may be updated as the website evolves. Continued use constitutes acceptance of the revised terms.
              </p>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
};

export default FrcTerms;
