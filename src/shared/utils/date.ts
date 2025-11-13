export const formatCreatedAt = (value?: string | null) => {
  if (!value) return '-';
  if (typeof value !== 'string') return '-';

  const cleaned = value.split('.')[0];
  const date = new Date(cleaned);

  return isNaN(date.getTime()) ? '-' : date.toLocaleString();
};
