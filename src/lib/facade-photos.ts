/** Survey facade shots, matched from the name on the board. Keyed by showroom id. */
export const FACADE_PHOTOS: Record<string, string[]> = {
  S14SBR: ["/facades/s14sbr-1.jpg", "/facades/s14sbr-2.jpg", "/facades/s14sbr-3.jpg"],
  S14WRD: ["/facades/s14wrd-1.jpg", "/facades/s14wrd-2.jpg"],
  S15ADN: ["/facades/s15adn-1.jpg"],
  S16NFY: ["/facades/s16nfy-1.jpg", "/facades/s16nfy-2.jpg"],
  S16ASM: ["/facades/s16asm-1.jpg", "/facades/s16asm-2.jpg"],
  S16KTH: ["/facades/s16kth-1.jpg", "/facades/s16kth-2.jpg"],
  S0095: ["/facades/s0095-1.jpg", "/facades/s0095-2.jpg", "/facades/s0095-3.jpg"],
  D0258: ["/facades/d0258-1.jpg", "/facades/d0258-2.jpg"],
  D0141: ["/facades/d0141-1.jpg"],
  S0068: ["/facades/s0068-1.jpg", "/facades/s0068-2.jpg", "/facades/s0068-3.jpg", "/facades/s0068-4.jpg", "/facades/s0068-5.jpg"],
  S15ATF: ["/facades/s15atf-1.jpg"],
  S15BYR: ["/facades/s15byr-1.jpg", "/facades/s15byr-2.jpg", "/facades/s15byr-3.jpg", "/facades/s15byr-4.jpg", "/facades/s15byr-5.jpg", "/facades/s15byr-6.jpg"],
  S15MWH: ["/facades/s15mwh-1.jpg", "/facades/s15mwh-2.jpg", "/facades/s15mwh-3.jpg", "/facades/s15mwh-4.jpg", "/facades/s15mwh-5.jpg"],
  S15NSM: ["/facades/s15nsm-1.jpg", "/facades/s15nsm-2.jpg"],
  S15JOD: ["/facades/s15jod-1.jpg", "/facades/s15jod-2.jpg"],
  S15AQD: ["/facades/s15aqd-1.jpg", "/facades/s15aqd-2.jpg", "/facades/s15aqd-3.jpg"],
  S15IMT: ["/facades/s15imt-1.jpg"],
  S0061: ["/facades/s0061-1.jpg", "/facades/s0061-2.jpg", "/facades/s0061-3.jpg", "/facades/s0061-4.jpg", "/facades/s0061-5.jpg"],
  S15JRW: ["/facades/s15jrw-1.jpg", "/facades/s15jrw-2.jpg", "/facades/s15jrw-3.jpg"],
  D0261: ["/facades/d0261-1.jpg", "/facades/d0261-2.jpg"],
  S13ADS: ["/facades/s13ads-1.jpg", "/facades/s13ads-2.jpg"],
  S0035: ["/facades/s0035-1.jpg"],
  S0036: ["/facades/s0036-1.jpg", "/facades/s0036-2.jpg", "/facades/s0036-3.jpg"],
  S0053: ["/facades/s0053-1.jpg"],
  S13NB2: ["/facades/s13nb2-1.jpg", "/facades/s13nb2-2.jpg", "/facades/s13nb2-3.jpg"],
};

export function facadePhotosFor(dealer: { id: string; flags?: { sdId?: string } }): { id: string; dataUrl: string }[] {
  const keys = [dealer.flags?.sdId, dealer.id].filter((key): key is string => Boolean(key));
  const urls = [...new Set(keys.flatMap((key) => FACADE_PHOTOS[key] ?? []))];
  return urls.map((url) => ({ id: url, dataUrl: url }));
}
