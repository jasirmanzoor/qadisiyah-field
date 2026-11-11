# timeline_R.json: the final reel, cut from the other films' scenes with their line timings scaled to the new lengths
import json, os
S = os.path.dirname(os.path.abspath(__file__))
src = {f: {s['id']: s for s in json.load(open(os.path.join(S, f'timeline_{f}.json')))['scenes']} for f in ('teaser', 'A', 'B')}
CUT = [  # id, source film (None = reel's own), seconds, transition into it
  ('RBRAND', None, 2.8, None), ('RGLOBE', None, 7.2, 'punch'), ('R0', None, 3.0, 'glitch'), ('T1', 'teaser', 5.0, 'slice'), ('T2', 'teaser', 12.5, 'punch'),
  ('B2d', 'B', 6.8, 'flash'), ('B2e', 'B', 5.8, 'slice'), ('B3', 'B', 5.6, 'punch'), ('B4', 'B', 5.2, 'glitch'),
  ('A2', 'A', 7.0, 'slice'), ('RLEAK', None, 6.6, 'punch'), ('B6', 'B', 3.4, 'glitch'),
  ('A3', 'A', 7.4, 'flash'), ('A4', 'A', 5.0, 'slice'), ('RNET', None, 6.4, 'punch'), ('B7', 'B', 6.2, 'slice'), ('RCLOSE', None, 8.0, 'glitch'),
]
out, t = [], 0.0
for sid, f, d, tr in CUT:
    lines = []
    if f:
        o = src[f][sid]; k = d / (o['end'] - o['start'])
        lines = [{'t': round(l['t'] * k, 3), 'dur': round(l['dur'] * k, 3), 'text': l['text']} for l in o['lines']]
    sc = {'id': sid, 'start': round(t, 3), 'end': round(t + d, 3), 'lines': lines or [{'t': .2, 'dur': d - .6, 'text': ''}]}
    if tr: sc['tr'] = tr
    out.append(sc); t += d
json.dump({'total': round(t, 3), 'xf': .5, 'scenes': out}, open(os.path.join(S, 'timeline_R.json'), 'w'), indent=1)
print('reel', round(t, 2), 's,', len(out), 'scenes')
