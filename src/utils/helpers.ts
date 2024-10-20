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

export function convertToMinutes(hour: string, minute: string): number {
  return Number(hour) * 60 + Number(minute);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isEmpty(input: any): boolean {
  if (Array.isArray(input)) {
    // Check if array is empty
    return input.length === 0;
  } else if (input && typeof input === 'object') {
    // Check if object is empty
    return Object.keys(input).length === 0;
  } else {
    // For other types (null, undefined, etc.), treat as not empty
    return true;
  }
}

export async function getAddressFromGoggle(lat: number, lon: number, apiKey: string) {
  console.log('getAddressFromGoggle');
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      const addressComponents = data.results[0].address_components;
      const adress = {
        streetNumber: '',
        streetName: '',
        sublocality: '',
        city: '',
      };

      addressComponents.forEach((component) => {
        if (component.types.includes('street_number')) {
          adress.streetNumber = component.long_name;
        }
        if (component.types.includes('route')) {
          adress.streetName = component.long_name;
        }
        if (component.types.includes('sublocality')) {
          adress.sublocality = component.short_name;
        }

        if (component.types.includes('locality')) {
          adress.city = component.long_name;
        }
        // Sometimes city might be under 'administrative_area_level_2' or 'administrative_area_level_1'
        if (!adress.city && component.types.includes('administrative_area_level_2')) {
          adress.city = component.short_name;
        }
        if (!adress.city && component.types.includes('administrative_area_level_1')) {
          adress.city = component.short_name;
        }
      });

      return adress;
    } else {
      throw new Error('No results found');
    }
  } catch (error) {
    console.error('Error fetching address:', error);
    return;
  }
}

export async function getAddressFromOpenStreet(lat: number, lon: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2`;
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
      // Extract address components from the response
      const address = {
        streetNumber: data.address.house_number || '', // Retrieve street number
        streetName: data.address.road || '',
        sublocality: data.address.suburb || data.address.village || '',
        city: data.address.city || data.address.town || '',
        state: data.address.state || data.address.county || '',
        country: data.address.country || '',
        postcode: data.address.postcode || '',
      };

      return address;
    } else {
      throw new Error('Failed to fetch address OpenStreetMap');
    }
  } catch (error) {
    // console.error('Error fetching address:', error);
    return;
  }
}
