# timeline_R.json: the final reel, cut from the other films' scenes with their line timings scaled to the new lengths
import json, os
S = os.path.dirname(os.path.abspath(__file__))
src = {f: {s['id']: s for s in json.load(open(os.path.join(S, f'timeline_{f}.json')))['scenes']} for f in ('teaser', 'A', 'B')}
CUT = [  # id, source film (None = reel's own), seconds, transition into it
  ('R0', None, 4.0, None), ('T1', 'teaser', 5.2, 'glitch'), ('T2', 'teaser', 14.0, 'punch'),
  ('B2d', 'B', 7.4, 'flash'), ('B2e', 'B', 6.2, 'slice'), ('B3', 'B', 6.2, 'punch'), ('B4', 'B', 5.4, 'glitch'),
  ('A2', 'A', 7.2, 'slice'), ('RLEAK', None, 6.8, 'punch'), ('B6', 'B', 3.8, 'glitch'),
  ('A3', 'A', 8.2, 'flash'), ('A4', 'A', 5.2, 'slice'), ('B7b', 'B', 6.2, 'punch'), ('B7', 'B', 6.4, 'slice'), ('RCLOSE', None, 8.0, 'glitch'),
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
