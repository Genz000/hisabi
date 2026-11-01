// Each category gets a bright colour, picked from its id so it never changes
// when the category is renamed. Values are HSL channels for use in hsl(...).

const PALETTE = [
  "4 92% 62%", // tomato
  "36 95% 52%", // mango
  "152 60% 44%", // mint
  "204 88% 56%", // sky
  "262 83% 66%", // grape
  "330 82% 62%", // pink
  "174 72% 40%", // teal
  "228 92% 66%", // periwinkle
  "20 90% 58%", // apricot
  "92 55% 45%", // lime
] as const;

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const categoryHue = (id: string) => PALETTE[hash(id) % PALETTE.length];

/** Inline style setting --cat for a category; use with the cat-* utility classes. */
export const catStyle = (id: string) => ({ "--cat": categoryHue(id) }) as React.CSSProperties;
