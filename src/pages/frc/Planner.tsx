import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FrcFieldPlanner } from '@/components/planner/FrcFieldPlanner';
import { FrcSiteHeader } from '@/components/site/FrcSiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

const FrcPlanner = () => {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches ?? false
  );
  const [showHeader, setShowHeader] = useState(true);
  const hideTimerRef = useRef<number | null>(null);

  const scheduleHide = useCallback(() => {
    if (!isMobile) return;
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setShowHeader(false);
    }, 5000);
  }, [isMobile]);

  useEffect(() => {
    const media = window.matchMedia('(hover: none) and (pointer: coarse)');
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const matches = event.matches;
      setIsMobile(matches);
      if (!matches) {
        setShowHeader(true);
      }
    };
    handleChange(media);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    scheduleHide();
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, [isMobile, scheduleHide]);

  useEffect(() => {
    if (!isMobile) return;
    const handleScroll = () => {
      if (window.scrollY <= 2) {
        if (!showHeader) {
          setShowHeader(true);
        }
        scheduleHide();
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, scheduleHide, showHeader]);

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
        {(!isMobile || showHeader) && <FrcSiteHeader />}
        <div className="flex-1 min-h-0">
          <FrcFieldPlanner className="h-full" />
        </div>
        <SiteFooter />
      </div>
    </>
  );
};

export default FrcPlanner;
