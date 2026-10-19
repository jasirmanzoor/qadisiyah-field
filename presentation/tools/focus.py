"""Auto-crop focus for each showroom photo: where a wide strip (the sky window is ~3.2:1) holds the most detail.
Detail = gradient energy, lightly weighted toward the lower-middle where cars and signage sit."""
import sys, os, json, numpy as np
from PIL import Image
S = sys.argv[1]; D = S + "/portfolio/photos"; out = {}
for f in sorted(os.listdir(D)):
    if not f.endswith(".jpg"): continue
    im = Image.open(f"{D}/{f}").convert("L"); im.thumbnail((240, 240)); a = np.asarray(im, np.float32)
    gy, gx = np.gradient(a); e = np.hypot(gx, gy)
    h, w = e.shape; rows = e.sum(1) * (0.75 + 0.5 * np.exp(-((np.arange(h) / h - .58) ** 2) / .08))
    band = max(4, min(h, int(w / 3.2)))
    cs = np.convolve(rows, np.ones(band), "valid"); fy = (int(np.argmax(cs)) + band / 2) / h
    cols = e.sum(0); bw = max(4, int(w * .6)); cx = np.convolve(cols, np.ones(bw), "valid"); fx = (int(np.argmax(cx)) + bw / 2) / w
    out[f[:-4]] = [round(fx * 100), round(fy * 100)]
json.dump(out, open(S + "/kn/photo_focus.json", "w")); print(len(out), list(out.items())[:5])
