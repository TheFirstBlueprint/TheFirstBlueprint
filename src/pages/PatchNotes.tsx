import { Helmet } from 'react-helmet-async';
import { SiteHeader } from '@/components/site/SiteHeader';

const PATCH_NOTES = [
  {
    version: 'v0.4.0',
    date: '2025-01-10',
    entries: [
      'Added theme selector (basic/dark/light).',
      'Introduced configurable keybinds and settings panel.',
      'Updated goal hitbox geometry to match triangle boundaries.',
    ],
  },
  {
    version: 'v0.3.0',
    date: '2025-01-02',
    entries: [
      'Classifier scoring and emptying polish.',
      'Improved robot sizing and interaction feedback.',
    ],
  },
];

const PatchNotes = () => {
  return (
    <>
      <Helmet>
        <title>FTC DECODE Strategy Planner | Patch Notes</title>
        <meta
          name="description"
          content="Latest changes and updates for the FTC DECODE strategy planner."
        />
      </Helmet>
      <div className="min-h-screen bg-background field-container">
        <SiteHeader />
        <main className="mx-auto w-full max-w-4xl px-6 py-10">
          <div className="panel">
            <div className="panel-header">Patch Notes</div>
            <p className="text-sm text-muted-foreground mb-4">
              Add new entries to the list in this file to keep updates current.
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
                      <li key={entry}>• {entry}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default PatchNotes;
