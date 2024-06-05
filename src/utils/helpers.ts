export function formatTimestamp(timestamp: string | number | Date) {
  const date = new Date(timestamp);

  const day = date.toLocaleString('en-GB', { day: '2-digit' });
  const month = date.toLocaleString('en-GB', { month: '2-digit' });
  const year = date.toLocaleString('en-GB', { year: 'numeric' });
  const hours = date.toLocaleString('en-GB', { hour: '2-digit', hour12: false });
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day}. ${month}. ${year} - ${hours}:${minutes}`;
}
