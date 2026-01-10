import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { SiteHeader } from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { toast } from 'sonner';

const THEME_STORAGE_KEY = 'planner-theme-mode';
const KEYBINDS_STORAGE_KEY = 'planner-keybinds';
const DEFAULT_KEYBINDS = {
  select: 's',
  pen: 'p',
  eraser: 'e',
  intake: 'i',
  outtakeSingle: 'o',
  outtakeAll: 'k',
  cycle: 'l',
  rotateLeft: 'arrowleft',
  rotateRight: 'arrowright',
};

type ThemeMode = 'base' | 'dark' | 'light' | 'sharkans';
type Keybinds = typeof DEFAULT_KEYBINDS;

const normalizeThemeMode = (value: string | null): ThemeMode => {
  if (value === 'base' || value === 'dark' || value === 'light' || value === 'sharkans') return value;
  if (value === 'basic') return 'base';
  return 'dark';
};

const FtcSettings = () => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [draftThemeMode, setDraftThemeMode] = useState<ThemeMode>('dark');
  const [keybinds, setKeybinds] = useState<Keybinds>(DEFAULT_KEYBINDS);
  const [draftKeybinds, setDraftKeybinds] = useState<Keybinds>(DEFAULT_KEYBINDS);

  useEffect(() => {
    const storedTheme = normalizeThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
    setThemeMode(storedTheme);
    setDraftThemeMode(storedTheme);

    const storedKeybinds = window.localStorage.getItem(KEYBINDS_STORAGE_KEY);
    if (storedKeybinds) {
      try {
        const parsed = JSON.parse(storedKeybinds) as Partial<Keybinds>;
        const merged = { ...DEFAULT_KEYBINDS, ...parsed };
        setKeybinds(merged);
        setDraftKeybinds(merged);
      } catch {
        setKeybinds(DEFAULT_KEYBINDS);
        setDraftKeybinds(DEFAULT_KEYBINDS);
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  const handleSave = () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, draftThemeMode);
    window.localStorage.setItem(KEYBINDS_STORAGE_KEY, JSON.stringify(draftKeybinds));
    setThemeMode(draftThemeMode);
    setKeybinds(draftKeybinds);
    toast.success('Settings saved.');
  };

  return (
    <>
      <Helmet>
        <title>TheFirstBlueprint | FTC Settings</title>
        <meta
          name="description"
          content="FTC planner settings and keybind customization."
        />
      </Helmet>
      <div className="min-h-screen bg-background field-container flex flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-4xl px-6 py-10 flex-1">
          <section className="panel">
            <div className="panel-header">Settings</div>
            <div className="space-y-6">
              <div>
                <div className="panel-header">Color Mode</div>
                <select
                  value={draftThemeMode}
                  onChange={(e) => setDraftThemeMode(e.target.value as ThemeMode)}
                  className="w-full rounded-md border border-border/60 bg-background/70 px-3 py-2 text-sm text-foreground shadow-inner shadow-black/20"
                >
                  <option value="base">Base</option>
                  <option value="dark">Dark Tactical</option>
                  <option value="light">Light</option>
                  <option value="sharkans">Sharkans</option>
                </select>
              </div>

              <div>
                <div className="panel-header">Keybinds</div>
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  {(
                    [
                      ['Select Tool', 'select'],
                      ['Pen Tool', 'pen'],
                      ['Eraser Tool', 'eraser'],
                      ['Intake Toggle', 'intake'],
                      ['Outtake Single', 'outtakeSingle'],
                      ['Outtake Rapid', 'outtakeAll'],
                      ['Cycle Held Balls', 'cycle'],
                      ['Rotate Left', 'rotateLeft'],
                      ['Rotate Right', 'rotateRight'],
                    ] as Array<[string, keyof Keybinds]>
                  ).map(([label, key]) => (
                    <label key={key} className="flex flex-col gap-1">
                      <span>{label}</span>
                      <input
                        type="text"
                        value={draftKeybinds[key]}
                        onChange={(e) =>
                          setDraftKeybinds((prev) => ({
                            ...prev,
                            [key]: e.target.value.trim().toLowerCase(),
                          }))
                        }
                        className="rounded-md border border-border/60 bg-background/70 px-2 py-1 text-sm text-foreground shadow-inner shadow-black/20"
                        placeholder="Key"
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Use single keys or names like ArrowLeft/ArrowRight.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setDraftThemeMode(themeMode);
                  setDraftKeybinds(keybinds);
                }}
                className="tool-button"
                title="Reset"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                className="tool-button active"
                title="Save settings"
              >
                Save
              </button>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
};

export default FtcSettings;
