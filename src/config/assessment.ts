export type Profile = {
  position: string;
  role: string;
  teamSize: number;
  motivation: string;
};

export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};
