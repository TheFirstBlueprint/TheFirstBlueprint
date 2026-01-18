import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import fieldShow from '@/assets/field show.png';
import SiteFooter from '@/components/site/SiteFooter';

const Index = () => {
  const navigate = useNavigate();
  const [frcGateOpen, setFrcGateOpen] = useState(false);
  const [frcPasscode, setFrcPasscode] = useState('');
  const [frcPasscodeError, setFrcPasscodeError] = useState(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);

  const handleFrcGateOpen = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setFrcPasscode('');
    setFrcPasscodeError(false);
    setFrcGateOpen(true);
  };

  const handleFrcGateClose = () => {
    setFrcGateOpen(false);
    setFrcPasscode('');
    setFrcPasscodeError(false);
  };

  const handleFrcGateSubmit = () => {
    if (frcPasscode === 'PBJ27272') {
      setFrcGateOpen(false);
      setFrcPasscode('');
      setFrcPasscodeError(false);
      navigate('/frc/planner');
      return;
    }
    setFrcPasscodeError(true);
  };

  useEffect(() => {
    const media = window.matchMedia('(hover: none) and (pointer: coarse) and (orientation: portrait)');
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobilePortrait(event.matches);
    };
    handleChange(media);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return (
    <>
      <Helmet>
        <title>TFBP | Home</title>
        <meta
          name="description"
          content="Thefirstblueprint home for FTC and FRC planning tools."
        />
      </Helmet>
      <div className="min-h-screen bg-background frontpage-shell flex flex-col">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 blueprint-grid" />
        <div aria-hidden="true" className="corner-brackets" />

        <main className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12 flex-1">
          <header className="mb-8 sm:mb-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] sm:tracking-[0.36em] text-muted-foreground">
                  Robotics command center
                </p>
                <h1 className="mt-3 font-title text-3xl sm:text-4xl tracking-[0.12em] sm:tracking-[0.18em] text-foreground">
                  TheFirstBlueprint
                </h1>
                <h2 className="mt-3 text-xl sm:text-2xl font-semibold text-foreground">
                  Visual strategy planning for competitive robotics alliances.
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                  Build strategies. Share plans. Win together.
                </p>
              </div>
            </div>
          </header>

          <section className="relative">
            <div aria-hidden="true" className="hero-radial" />
            <div className="relative z-10 grid gap-6 lg:grid-cols-2">
              <Link
                to="/ftc/planner"
                className="command-card group min-h-[300px] sm:min-h-[360px] p-5 sm:p-6"
              >
                <div className="card-media card-media--blue" aria-hidden="true">
                  <img
                    src={fieldShow}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-70"
                    draggable={false}
                  />
                </div>
                <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      FTC planning
                    </p>
                    <h3 className="mt-2 text-2xl sm:text-3xl font-semibold text-foreground">
                      FTC Planning
                    </h3>
                  </div>
                  <div className="command-card__panel p-3 sm:p-4">
                    <p className="text-sm text-muted-foreground">
                      Plan field scenarios, motifs, sequences, and alliance coordination.
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    <span>Enter planner</span>
                    <span className="text-alliance-blue">Open</span>
                  </div>
                </div>
              </Link>

              <Link
                to="/frc/planner"
                className="command-card group min-h-[300px] sm:min-h-[360px] p-5 sm:p-6"
                onClick={handleFrcGateOpen}
              >
                <div className="card-media card-media--red" aria-hidden="true">
                </div>
                <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      Work in progress
                    </p>
                    <h3 className="mt-2 text-2xl sm:text-3xl font-semibold text-foreground">
                      FRC Planning
                    </h3>
                  </div>
                  <div className="command-card__panel p-3 sm:p-4">
                    <p className="text-sm text-muted-foreground">
                      Plan match strategy, robot roles, and autonomous paths visually.
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    <span>Enter planner</span>
                    <span className="text-alliance-red">Open</span>
                  </div>
                </div>
              </Link>
            </div>
          </section>

          <section className="mt-10 sm:mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.8fr_0.9fr]">
            <div className="panel">
              <div className="panel-header">Contact</div>
              <h3 className="text-xl font-semibold text-foreground">Feedback</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Use the forms below to share feedback or report a bug.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <a
                  className="tool-button active w-full text-sm"
                  href="https://docs.google.com/forms/d/e/1FAIpQLScuZw-Olh9r-3xb1CchwMov8MTVGyKRlQKF0YCC_CXBm581Zg/viewform?usp=dialog"
                  rel="noreferrer"
                  target="_blank"
                >
                  Feedback form
                </a>
                <a
                  className="tool-button active w-full text-sm"
                  href="https://docs.google.com/forms/d/e/1FAIpQLSfjtssKj7C5Dr80AMW0kl5BnlD3t9F-cb2SVH_KBGnHuM84uw/viewform?usp=dialog"
                  rel="noreferrer"
                  target="_blank"
                >
                  Bug report form
                </a>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">Video Links</div>
              <h3 className="text-xl font-semibold text-foreground">YouTube</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Quick access to team walkthroughs and planner demos.
              </p>
              <div className="mt-4 grid gap-3">
                <a
                  className="tool-button active w-full text-sm"
                  href="https://youtube.com/playlist?list=PLojGuoR_rIykwYhxv--06Ho8Gp25f6NE_&si=mipGd1CvgHWlPYs9"
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    play_circle
                  </span>
                  FTC videos
                </a>
                <a
                  className="tool-button active w-full text-sm"
                  href="https://www.youtube.com"
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    play_circle
                  </span>
                  FRC videos
                </a>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">Mission</div>
              <h3 className="text-xl font-semibold text-foreground">
                Enabling strategic excellence for every team, from rookie to world-class.
              </h3>
              <blockquote className="mt-6 border-l border-border pl-4 text-sm text-muted-foreground">
                "Perfect planning for our shark attack" - Sharkans 27272
              </blockquote>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
      {frcGateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-label="FRC access gate"
        >
          <div className="panel w-full max-w-md">
            <div className="panel-header">Access Required</div>
            <h3 className="text-xl font-semibold text-foreground">Enter passcode</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              FRC is still in development. Enter the passcode to continue.
            </p>
            <div className="mt-4 space-y-3">
              <input
                type="password"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                value={frcPasscode}
                onChange={(event) => {
                  setFrcPasscode(event.target.value);
                  if (frcPasscodeError) setFrcPasscodeError(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleFrcGateSubmit();
                  }
                }}
                placeholder="Passcode"
                autoFocus
              />
              {frcPasscodeError && (
                <div className="text-xs text-destructive">Incorrect passcode.</div>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={handleFrcGateClose} className="tool-button flex-1 text-sm">
                Cancel
              </button>
              <button onClick={handleFrcGateSubmit} className="tool-button active flex-1 text-sm">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
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

export default Index;
