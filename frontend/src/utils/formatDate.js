export const formatDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return dateStr ?? '';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})( \d{2}:\d{2}:\d{2})?$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}${match[4] || ''}`;
  return dateStr;
};
