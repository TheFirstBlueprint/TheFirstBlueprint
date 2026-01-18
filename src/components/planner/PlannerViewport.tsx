import { useEffect, useState, type ReactNode } from 'react';

const MOBILE_QUERY = '(hover: none) and (pointer: coarse)';
const PORTRAIT_QUERY = `${MOBILE_QUERY} and (orientation: portrait)`;

type ViewportSize = {
  width: number;
  height: number;
};

type PlannerViewportProps = {
  children: ReactNode;
  className?: string;
};

export const PlannerViewport = ({ children, className }: PlannerViewportProps) => {
  const [isMobilePortrait, setIsMobilePortrait] = useState(
    () => window.matchMedia?.(PORTRAIT_QUERY)?.matches ?? false
  );
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia?.(MOBILE_QUERY)?.matches ?? false
  );
  const [viewport, setViewport] = useState<ViewportSize>(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const mobileMedia = window.matchMedia(MOBILE_QUERY);
    const handleMobileChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(event.matches);
    };
    handleMobileChange(mobileMedia);
    mobileMedia.addEventListener('change', handleMobileChange);
    return () => mobileMedia.removeEventListener('change', handleMobileChange);
  }, []);

  useEffect(() => {
    const portraitMedia = window.matchMedia(PORTRAIT_QUERY);
    const handlePortraitChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobilePortrait(event.matches);
    };
    handlePortraitChange(portraitMedia);
    portraitMedia.addEventListener('change', handlePortraitChange);
    return () => portraitMedia.removeEventListener('change', handlePortraitChange);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const attemptLock = async () => {
      try {
        await window.screen?.orientation?.lock?.('landscape');
      } catch {
        // Best-effort only; fallback is handled by the rotated viewport.
      }
    };
    attemptLock();
  }, [isMobile]);

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  const shouldRotate = isMobilePortrait;

  return (
    <div className={`planner-viewport ${shouldRotate ? 'planner-viewport-rotated' : ''} ${className ?? ''}`}>
      <div
        className={`planner-viewport-inner ${shouldRotate ? 'planner-viewport-inner-rotated' : ''}`}
        style={
          shouldRotate
            ? {
                width: `${viewport.height}px`,
                height: `${viewport.width}px`,
              }
            : undefined
        }
      >
        {children}
      </div>
      {isMobilePortrait && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 p-6 text-center"
          role="dialog"
          aria-modal="true"
        >
          <p className="text-lg font-semibold text-white">Please turn your phone landscape</p>
        </div>
      )}
    </div>
  );
};
