import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FieldPlanner } from '@/components/planner/FieldPlanner';
import { SiteHeader } from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

const Planner = () => {
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);

  useEffect(() => {
    const portraitMedia = window.matchMedia('(hover: none) and (pointer: coarse) and (orientation: portrait)');
    const handlePortraitChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobilePortrait(event.matches);
    };
    handlePortraitChange(portraitMedia);
    portraitMedia.addEventListener('change', handlePortraitChange);
    return () => {
      portraitMedia.removeEventListener('change', handlePortraitChange);
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Thefirstblueprint | Field Planner</title>
        <meta
          name="description"
          content="Interactive FTC DECODE field planner for building strategies and robot paths."
        />
      </Helmet>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <SiteHeader />
        <div className="flex-1 min-h-0">
          <FieldPlanner className="h-full" />
        </div>
        <SiteFooter />
      </div>
      {isMobilePortrait && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6 text-center"
          role="dialog"
          aria-modal="true"
        >
          <p className="text-lg font-semibold text-white">
            Please rotate your phone to landscape mode.
          </p>
        </div>
      )}
    </>
  );
};

export default Planner;
