import { Helmet } from 'react-helmet-async';
import { FrcFieldPlanner } from '@/components/planner/FrcFieldPlanner';
import { FrcSiteHeader } from '@/components/site/FrcSiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

const FrcPlanner = () => {
  return (
    <>
      <Helmet>
        <title>TheFirstBlueprint | FRC Planner</title>
        <meta
          name="description"
          content="Interactive FRC field planner for alliance strategy and robot paths."
        />
      </Helmet>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <FrcSiteHeader />
        <div className="flex-1 min-h-0">
          <FrcFieldPlanner className="h-full" />
        </div>
        <SiteFooter />
      </div>
    </>
  );
};

export default FrcPlanner;
