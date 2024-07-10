import { parse } from '@babel/core';

// Format timestamp to human readable format (dd.mm.yyyy - hh:mm)
export function formatTimestamp(timestamp: string | number | Date) {
  const date = new Date(timestamp);

  const day = date.toLocaleString('en-GB', { day: '2-digit' });
  const month = date.toLocaleString('en-GB', { month: '2-digit' });
  const year = date.toLocaleString('en-GB', { year: 'numeric' });
  const hours = date.toLocaleString('en-GB', { hour: '2-digit', hour12: false });
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day}. ${month}. ${year} - ${hours}:${minutes}`;
}

export function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function convertMinutes(totalMinutes: number) {
  const days = Math.floor(totalMinutes / 1440); // There are 1440 minutes in a day
  const hours = Math.floor((totalMinutes % 1440) / 60); // Remaining minutes divided by 60 gives hours
  const minutes = totalMinutes % 60; // Remaining minutes

  let result = '';

  if (days > 0) {
    result += `${days} day${days > 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    if (result) result += ' ';
    result += `${hours} h${hours > 1 ? 'rs' : ''}`;
  }

  if (minutes > 0) {
    if (result) result += ' ';
    result += `${minutes} min`;
  }

  return result;
}

export function convertToMinutes(hour: string, minute: string): any {
  return Number(hour) * 60 + minute;
}
