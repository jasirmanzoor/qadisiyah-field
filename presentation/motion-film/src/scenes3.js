'use strict';
// The drone flight in the films: teaser T2 (compressed) and Part B's B2 (the full flight).
SC2.B2 = (lt, D, L) => {
  droneShot(lt * 13 / D);
  const t0 = ln2(L, 0);
  const sh = X.createLinearGradient(0, 0, 0, 420); sh.addColorStop(0, 'rgba(3,10,30,.55)'); sh.addColorStop(1, 'rgba(3,10,30,0)'); X.fillStyle = sh; X.fillRect(0, 0, W, 420);
  slam('SO WE WALKED IT.', { x: W / 2, y: 250, size: 120, col: C2.white, t0, tout: t0 + ldur(L, 0) * .55 });
  slam('DOOR TO DOOR. BY DAY AND AFTER DARK.', { x: W / 2, y: 250, size: 64, col: C2.white, t0: t0 + ldur(L, 0) * .55, tout: t0 + ldur(L, 0) + .2, from: 1.2 });
};
BG2.B2 = () => NOIR;
SC2.T2 = (lt, D, L) => {
  droneShot(lt * 13 / D, { label: 'DRONE · KAFD → AL QADISIYAH → AL SHIFA' });
  const t0 = ln2(L, 0);
  const sh = X.createLinearGradient(0, 0, 0, 420); sh.addColorStop(0, 'rgba(3,10,30,.55)'); sh.addColorStop(1, 'rgba(3,10,30,0)'); X.fillStyle = sh; X.fillRect(0, 0, W, 420);
  slam('SO WE WALKED IT.', { x: W / 2, y: 250, size: 120, col: C2.white, t0, tout: t0 + ldur(L, 0) * .5 });
  slam('520 SHOWROOMS. DOOR TO DOOR.', { x: W / 2, y: 250, size: 80, col: C2.white, t0: t0 + ldur(L, 0) * .5, tout: t0 + ldur(L, 0) + .15, from: 1.2 });
};
BG2.T2 = () => NOIR;
