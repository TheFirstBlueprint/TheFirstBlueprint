import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FieldPlanner } from '@/components/planner/FieldPlanner';
import { PlannerViewport } from '@/components/planner/PlannerViewport';
import { SiteHeader } from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

const FtcPlanner = () => {
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
        <title>TheFirstBlueprint | FTC Planner</title>
        <meta
          name="description"
          content="Interactive FTC field planner for building strategies and robot paths."
        />
      </Helmet>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {!isMobile && <SiteHeader />}
        <div className="flex-1 min-h-0">
          <PlannerViewport className="h-full">
            <FieldPlanner className="h-full w-full" />
          </PlannerViewport>
        </div>
        {!isMobile && <SiteFooter />}
      </div>
    </>
  );
};

export default FtcPlanner;
