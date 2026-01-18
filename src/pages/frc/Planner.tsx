import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FrcFieldPlanner } from '@/components/planner/FrcFieldPlanner';
import { PlannerViewport } from '@/components/planner/PlannerViewport';
import { FrcSiteHeader } from '@/components/site/FrcSiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

const FrcPlanner = () => {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches ?? false
  );

  useEffect(() => {
    const media = window.matchMedia('(hover: none) and (pointer: coarse)');
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(event.matches);
    };
    handleChange(media);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

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
        {!isMobile && <FrcSiteHeader />}
        <div className="flex-1 min-h-0">
          <PlannerViewport className="h-full">
            <FrcFieldPlanner className="h-full w-full" />
          </PlannerViewport>
        </div>
        {!isMobile && <SiteFooter />}
      </div>
    </>
  );
};

export default FrcPlanner;
