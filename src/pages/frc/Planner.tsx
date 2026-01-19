import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FrcFieldPlanner } from '@/components/planner/FrcFieldPlanner';
import { PlannerViewport } from '@/components/planner/PlannerViewport';
import { FrcSiteHeader } from '@/components/site/FrcSiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

const FrcPlanner = () => {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches ?? false
  );
  const [isStandalone, setIsStandalone] = useState(() => {
    const displayMode = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
    const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    return displayMode || iosStandalone;
  });
  const [showInstallHint, setShowInstallHint] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(hover: none) and (pointer: coarse)');
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(event.matches);
    };
    handleChange(media);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const root = document.documentElement;
    const updateAppHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty('--app-height', `${height}px`);
    };
    updateAppHeight();
    window.addEventListener('resize', updateAppHeight);
    window.addEventListener('orientationchange', updateAppHeight);
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', updateAppHeight);
    viewport?.addEventListener('scroll', updateAppHeight);
    return () => {
      window.removeEventListener('resize', updateAppHeight);
      window.removeEventListener('orientationchange', updateAppHeight);
      viewport?.removeEventListener('resize', updateAppHeight);
      viewport?.removeEventListener('scroll', updateAppHeight);
      root.style.removeProperty('--app-height');
    };
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const checkStandalone = () => {
      const displayMode = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
      const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(displayMode || iosStandalone);
    };
    checkStandalone();
    const media = window.matchMedia?.('(display-mode: standalone)');
    media?.addEventListener('change', checkStandalone);
    window.addEventListener('visibilitychange', checkStandalone);
    return () => {
      media?.removeEventListener('change', checkStandalone);
      window.removeEventListener('visibilitychange', checkStandalone);
    };
  }, [isMobile]);

  const handleRequestFullscreen = () => {
    const element = rootRef.current;
    if (!element || !document.fullscreenEnabled || !element.requestFullscreen) return;
    element.requestFullscreen().catch(() => undefined);
  };

  return (
    <>
      <Helmet>
        <title>TheFirstBlueprint | FRC Planner</title>
        <meta
          name="description"
          content="Interactive FRC field planner for alliance strategy and robot paths."
        />
      </Helmet>
      <div
        ref={rootRef}
        className={`planner-page bg-background flex flex-col overflow-hidden ${
          isMobile ? 'planner-page-mobile' : 'h-screen'
        }`}
      >
        {!isMobile && <FrcSiteHeader />}
        <div className="flex-1 min-h-0">
          <PlannerViewport className="h-full">
            <FrcFieldPlanner className="h-full w-full" />
          </PlannerViewport>
        </div>
        {!isMobile && <SiteFooter />}
        {isMobile && !isStandalone && showInstallHint && (
          <div className="planner-install-hint" role="status" aria-live="polite">
            <span>Add to Home Screen for fullscreen.</span>
            <div className="planner-install-actions">
              <button type="button" className="planner-install-action" onClick={handleRequestFullscreen}>
                Try fullscreen
              </button>
              <button
                type="button"
                className="planner-install-dismiss"
                onClick={() => setShowInstallHint(false)}
                aria-label="Dismiss"
              >
                x
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FrcPlanner;







