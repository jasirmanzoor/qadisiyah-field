# timeline_R.json: the final reel, cut from the other films' scenes with their line timings scaled to the new lengths
import json, os
S = os.path.dirname(os.path.abspath(__file__))
src = {f: {s['id']: s for s in json.load(open(os.path.join(S, f'timeline_{f}.json')))['scenes']} for f in ('teaser', 'A', 'B')}
BPM = 124; BT = 60 / BPM
CUT = [  # id, source film (None = reel's own), length in beats, transition into it; every cut lands on the beat
  ('RBRAND', None, 6, None), ('RGLOBE', None, 30, 'punch'), ('R0', None, 16, 'warp'), ('T1', 'teaser', 8, 'glitch'), ('RDRONE', None, 72, 'punch'),
  ('B2d', 'B', 16, 'flash'), ('B2e', 'B', 12, 'slice'), ('B3', 'B', 12, 'glitch'), ('B4', 'B', 8, 'punch'),
  ('A2', 'A', 12, 'slice'), ('RLEAK', None, 12, 'glitch'), ('B6', 'B', 8, 'punch'),
  ('RSITE', None, 12, 'warp'), ('RSOP', None, 12, 'slice'), ('RNET', None, 12, 'warp'), ('B7', 'B', 12, 'glitch'),
  ('RFLASH', None, 12, 'flash'), ('RNEXT', None, 12, 'warp'), ('RCLOSE', None, 12, 'flash'),
]
out, t = [], 0.0
for sid, f, nb, tr in CUT:
    d = nb * BT
    lines = []
    if f:
        o = src[f][sid]; k = d / (o['end'] - o['start'])
        lines = [{'t': round(l['t'] * k, 3), 'dur': round(l['dur'] * k, 3), 'text': l['text']} for l in o['lines']]
    sc = {'id': sid, 'start': round(t, 3), 'end': round(t + d, 3), 'lines': lines or [{'t': .2, 'dur': d - .6, 'text': ''}]}
    if tr: sc['tr'] = tr
    out.append(sc); t += d
st = {sc['id']: sc['start'] for sc in out}; en = {sc['id']: sc['end'] for sc in out}
drums = [[st['R0'], en['B4'], 'full'], [st['A2'], en['RLEAK'], 'half'], [st['RSITE'], en['RFLASH'], 'full'], [st['RNEXT'], en['RNEXT'], 'half']]
drops = [st['R0'], st['RSITE'], st['RNET'], round(st['RCLOSE'] + 6 * BT, 3)]
json.dump({'total': round(t, 3), 'xf': .5, 'bpm': BPM, 'closeBeats': 6, 'intro': st['RGLOBE'], 'close': st['RCLOSE'], 'drums': drums, 'drops': drops, 'scenes': out}, open(os.path.join(S, 'timeline_R.json'), 'w'), indent=1)
print('reel', round(t, 2), 's,', len(out), 'scenes')
