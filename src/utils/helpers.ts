import { formatDateNumeric, formatTime } from 'custom-card-helpers';
import memoizeOne from 'memoize-one';
import tinycolor from 'tinycolor2';

import { HistoryStates, VehicleCardConfig } from '../types';
import { FrontendLocaleData } from '../types/ha-frontend/data/frontend-local-data';

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

export const isDarkColor = (color: string): boolean => {
  const colorObj = tinycolor(color);
  // console.log('colorObj', colorObj);
  return colorObj.isLight();
};

const formatTimestamp = (ts: number): string => {
  const date = new Date(ts * 1000);
  return date.toLocaleString();
};

export const _getHistoryPoints = memoizeOne((config: VehicleCardConfig, history?: HistoryStates): any | undefined => {
  if (!history || !(config.map_popup_config.hours_to_show ?? 0)) {
    return undefined;
  }
  console.log('history', history);
  const paths = {};

  // Get history for the device_tracker entity
  const entityStates = history[config.device_tracker!];
  if (!entityStates) {
    return undefined;
  }
  // Filter out locations without coordinates
  const locations = entityStates.filter((loc) => loc.a.latitude && loc.a.longitude);
  if (locations.length < 2) {
    return undefined;
  }

  // Create source data for LineString and Point features
  const totalPoints = locations.length;
  const lineSegments: any[] = [];
  const pointFeatures: any[] = [];

  for (let i = 0; i < totalPoints - 1; i++) {
    const start = locations[i];
    const end = locations[i + 1];

    const gradualOpacity = 0.8;
    let opacityStep: number;
    let baseOpacity: number;

    opacityStep = gradualOpacity / (totalPoints - 2);
    baseOpacity = 1 - gradualOpacity;

    // Calculate opacity (higher at start, lower towards the end)
    const opacity = baseOpacity + i * opacityStep;

    lineSegments.push({
      type: 'Feature',
      id: `line-${i}`,
      geometry: {
        type: 'LineString',
        coordinates: [
          [start.a.longitude, start.a.latitude],
          [end.a.longitude, end.a.latitude],
        ],
      },
      properties: {
        line_id: `line-${i}`,
        order_id: i,
        opacity: opacity, // Keep 2 decimal places for smoother transition
      },
    });

    const description = `<b>${start.a.friendly_name}</b><i>${formatTimestamp(start.lu)}</i>`;

    // Create Point features for each segment
    pointFeatures.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [start.a.longitude, start.a.latitude],
      },
      properties: {
        friendly_name: start.a.friendly_name,
        last_updated: start.lu,
        description: description,
        opacity: opacity,
      },
    });
  }

  const pointSource = {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: pointFeatures,
    },
  };

  const routeSource = {
    type: 'geojson',
    data: {
      type: 'FeatureCollection', // Instead of a single LineString, we now have multiple segments
      features: lineSegments,
    },
  };

  paths['route'] = routeSource;
  paths['points'] = pointSource;

  console.log('paths', paths);
  return paths;
});

export const getInitials = (name: string): string => {
  if (!name) return ''; // Handle empty or undefined names

  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
};

export const getFormatedDateTime = (dateObj: Date, locale: FrontendLocaleData): string => {
  return `${formatDateNumeric(dateObj, locale)} ${formatTime(dateObj, locale)}`;
};

const isTemplateRegex = /{%|{{/;

export const isTemplate = (value: string): boolean => isTemplateRegex.test(value);

export const hasTemplate = (value: unknown): boolean => {
  if (!value) {
    return false;
  }
  if (typeof value === 'string') {
    return isTemplate(value);
  }
  if (typeof value === 'object') {
    const values = Array.isArray(value) ? value : Object.values(value!);
    return values.some((val) => val && hasTemplate(val));
  }
  return false;
};
