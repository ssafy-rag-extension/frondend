export type FileType = {
  name: string;
  size: number | null;
  category: string | null;
  collection: 'public' | 'hebees' | null;
  currentProgress: string | null;
  currentPercent: number | null;
  totalProgress: number | null;
};
