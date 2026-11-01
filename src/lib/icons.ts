import L from 'leaflet';
import { VISIT_STATUS_COLOR, type VisitStatus } from './types';

const cache = new Map<string, L.DivIcon>();

/** approximate = pin placed on the corridor, not a surveyed GPS fix (dashed white ring). */
export function statusIcon(status: VisitStatus, selected = false, approximate = false): L.DivIcon {
  const key = `${status}-${selected}-${approximate}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const color = VISIT_STATUS_COLOR[status];
  const size = selected ? 34 : 26;
  const icon = L.divIcon({
    className: 'dealership-pin',
    html: `<div style="
        width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;
        background:${color};
        transform:rotate(-45deg);
        border:2px ${approximate ? 'dashed' : 'solid'} white;${approximate ? 'opacity:.8;' : ''}
        box-shadow:0 1px 4px rgba(0,0,0,.45);
        ${selected ? 'outline:3px solid rgba(37,99,235,.55);' : ''}
      "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
  cache.set(key, icon);
  return icon;
}

export function userLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: 'user-pin',
    html: `<div style="
        width:16px;height:16px;border-radius:50%;
        background:#2563eb;border:3px solid white;
        box-shadow:0 0 0 4px rgba(37,99,235,.25);
      "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}
