import type { Dealership } from './types';

export type MarketId = 'qadisiyah' | 'shifa';

export interface MarketMeta {
  id: MarketId;
  label: string;
  labelAr: string;
  area: string;
  center: { lat: number; lng: number };
  zoom: number;
  /** Words a web search should combine with a dealer name to anchor results. */
  searchAnchor: string;
  searchAnchorAr: string;
}

export const MARKETS: Record<MarketId, MarketMeta> = {
  qadisiyah: {
    id: 'qadisiyah',
    label: 'Al Qadisiyah',
    labelAr: 'القادسية',
    area: 'East Riyadh',
    center: { lat: 24.826, lng: 46.823 },
    zoom: 15,
    searchAnchor: 'Riyadh Qadisiyah',
    searchAnchorAr: 'الرياض القادسية',
  },
  shifa: {
    id: 'shifa',
    label: 'Al Shifa',
    labelAr: 'الشفا',
    area: 'South Riyadh',
    center: { lat: 24.5485, lng: 46.6825 },
    zoom: 16,
    searchAnchor: 'Riyadh Al Shifa',
    searchAnchorAr: 'الرياض الشفا',
  },
};

export const MARKET_IDS: MarketId[] = ['qadisiyah', 'shifa'];

export function isMarketId(v: unknown): v is MarketId {
  return v === 'qadisiyah' || v === 'shifa';
}

/** Records saved before markets existed are all Al Qadisiyah. */
export function marketOf(d: Pick<Dealership, 'market'>): MarketId {
  return d.market === 'shifa' ? 'shifa' : 'qadisiyah';
}

export function inMarket<T extends Pick<Dealership, 'market'>>(list: T[], market: MarketId): T[] {
  return list.filter((d) => marketOf(d) === market);
}
