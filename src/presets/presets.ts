export type PresetDefinition = {
  id: string;
  label: string;
  path: string;
};

export const PRESETS: PresetDefinition[] = [
  { id: 'empty-field', label: 'Empty Field', path: '/presets/empty-field.json' },
  { id: 'short-far', label: 'Short + Far Auto', path: '/presets/tfbp-short-far.json' },
];
