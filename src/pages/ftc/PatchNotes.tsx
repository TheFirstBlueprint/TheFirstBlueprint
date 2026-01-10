import { Helmet } from 'react-helmet-async';
import { SiteHeader } from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

const PATCH_NOTES = [
  {
    version: 'v1.37',
    date: '2026-01-06',
    entries: [
      'Quick frontend audit of the planner screen',
      'Visual hotfixes',
      'Changed arc icon'
    ],
  },
  {
    version: 'v1.36',
    date: '2026-01-06',
    entries: [
      'Huge UI/UX changes, including font and color',
      'Quick hotfixes for frontend of field',
      'Brought other pages of webiste up to date',
      'Color ideation'
    ],
  },
  {
    version: 'v1.34',
    date: '2026-01-03',
    entries: [
      'Quick hotfix for keybindings on the pc version (removed some mobile support)'
    ],
  },
  {
    version: 'v1.33',
    date: '2026-01-03',
    entries: [
      'We broke it.'
    ],
  },
  {
    version: 'v1.32',
    date: '2026-01-03',
    entries: [
      'Changed website structure - included a front page and navigation changes',
      'Created design elements for the front page (setup for frc as well)',
    ],
  },
  {
    version: 'v1.31',
    date: '2026-01-02',
    entries: [
      'Added parking logic'
    ],
  },
  {
    version: 'v1.30',
    date: '2026-01-02',
    entries: [
      'Altered overflow positioning in the human play zone (top to bottom instead of left-right)',
      'Added incremental changes for the sequencer',
      'Info hovers for sequencer + others',
    ],
  },
];

const FtcPatchNotes = () => {
  return (
    <>
      <Helmet>
        <title>TheFirstBlueprint | FTC Patch Notes</title>
        <meta
          name="description"
          content="Latest changes and updates for the FTC strategy planner."
        />
      </Helmet>
      <div className="min-h-screen bg-background field-container flex flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-4xl px-6 py-10 flex-1">
          <div className="panel">
            <div className="panel-header">Patch Notes</div>
            <p className="text-sm text-muted-foreground mb-4">
              Hey strategizers! We will continue to update this periodically with what we have been
              working on.
            </p>
            <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
              {PATCH_NOTES.map((note) => (
                <div key={note.version} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-foreground">{note.version}</h2>
                    <span className="text-xs text-muted-foreground">{note.date}</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {note.entries.map((entry) => (
                      <li key={entry}>- {entry}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    </>
  );
};

export default FtcPatchNotes;
