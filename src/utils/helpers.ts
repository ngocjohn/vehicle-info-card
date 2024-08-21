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
    result += `${days} d`;
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

export function compareVersions(version1, version2) {
  // Remove the leading 'v' if present
  version1 = version1.startsWith('v') ? version1.slice(1) : version1;
  version2 = version2.startsWith('v') ? version2.slice(1) : version2;

  // Split the version into parts: major, minor, patch, and pre-release
  const parts1 = version1.split(/[\.-]/).map((part) => (isNaN(part) ? part : parseInt(part, 10)));
  const parts2 = version2.split(/[\.-]/).map((part) => (isNaN(part) ? part : parseInt(part, 10)));

  // Compare each part
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] !== undefined ? parts1[i] : typeof parts2[i] === 'string' ? '' : 0;
    const part2 = parts2[i] !== undefined ? parts2[i] : typeof parts1[i] === 'string' ? '' : 0;

    if (typeof part1 === 'number' && typeof part2 === 'number') {
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    } else {
      // Handle pre-release versions
      if (typeof part1 === 'string' && typeof part2 === 'string') {
        if (part1 > part2) return 1;
        if (part1 < part2) return -1;
      } else if (typeof part1 === 'string') {
        return -1; // Pre-release versions are considered lower
      } else if (typeof part2 === 'string') {
        return 1; // Release version is higher than pre-release
      }
    }
  }

  return 0; // Versions are equal
}
