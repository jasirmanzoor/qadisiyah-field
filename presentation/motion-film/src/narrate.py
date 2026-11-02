# script.json -> voice_<film>.wav + timeline_<film>.json, with the same narrator as the earlier films (Kokoro, af_heart)
import json, os, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
S = os.path.dirname(os.path.abspath(__file__)); TTS = os.path.join(S, '..', '..', 'tts')
sc = json.load(open(os.path.join(S, 'script.json')))
k = Kokoro(os.path.join(TTS, 'kokoro-v1.0.onnx'), os.path.join(TTS, 'voices-v1.0.bin'))
SR = 24000; GAP = .5
os.makedirs(os.path.join(S, 'out'), exist_ok=True)
for film in (sys.argv[1:] or sc['films'].keys()):
    lines, scenes, t = [], [], 0.0
    for s in sc['films'][film]:
        s0 = t; lt = t + s.get('lead', .45); sl = []
        for j, text in enumerate(s['lines']):
            a, sr = k.create(text, voice=sc['voice'], speed=.95, lang='en-us')
            a = np.asarray(a, np.float32); nz = np.flatnonzero(np.abs(a) > 2e-3); a = a[max(0, nz[0] - 200): nz[-1] + 1800]
            d = len(a) / sr; lines.append((lt, a)); sl.append({'t': round(lt - s0, 3), 'dur': round(d, 3), 'text': text})
            lt += d + (GAP if j < len(s['lines']) - 1 else 0)
        t = lt + s.get('tail', .55) + s.get('pad', 0)
        if 'dur' in s: t = max(t, s0 + s['dur'])
        scenes.append({'id': s['id'], 'start': round(s0, 3), 'end': round(t, 3), 'lines': sl})
    total = t
    track = np.zeros(int(total * SR) + SR, np.float32)
    for lt, a in lines: i = int(lt * SR); track[i:i + len(a)] += a
    track = track[:int(total * SR)]
    sf.write(os.path.join(S, 'out', f'voice_{film}.wav'), track, SR)
    json.dump({'total': round(total, 3), 'scenes': scenes}, open(os.path.join(S, f'timeline_{film}.json'), 'w'), indent=1)
    print(film, 'total', round(total, 2), [(x['id'], round(x['end'] - x['start'], 2)) for x in scenes], flush=True)
