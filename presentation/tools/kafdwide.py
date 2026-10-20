"""KAFD finale: one shot, full-frame. A 16:9 window from the stabilised portrait clip, upscaled with Real-ESRGAN and
blended 50/50 with Lanczos so the towers keep their definition without looking synthetic."""
import os, numpy as np, onnxruntime as ort
from PIL import Image
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); A = os.path.join(S, "portfolio", "kafdv", "a"); O = os.path.join(S, "portfolio", "kafdv", "wide")
os.makedirs(O, exist_ok=True)
o = ort.SessionOptions(); o.intra_op_num_threads = 4
s = ort.InferenceSession(os.path.join(S, "models", "realesr-general-x4v3.onnx"), o)
for k, i in enumerate(range(60, 270)):
    out = os.path.join(O, f"f{k + 1:04d}.jpg")
    if os.path.exists(out): continue
    im = Image.open(os.path.join(A, f"f{i:04d}.jpg")).convert("RGB"); W, H = im.size
    ch = W * 9 / 16; cy = .41 * H; c = im.crop((0, int(cy - ch / 2), W, int(cy + ch / 2)))
    lz = c.resize((1920, 1080), Image.LANCZOS)
    x = np.asarray(c.resize((540, 304), Image.LANCZOS), np.float32).transpose(2, 0, 1)[None] / 255
    up = Image.fromarray((np.clip(s.run(None, {"input": x})[0][0].transpose(1, 2, 0), 0, 1) * 255 + .5).astype(np.uint8)).resize((1920, 1080), Image.LANCZOS)
    Image.blend(lz, up, .5).save(out, quality=93)
print("done", len(os.listdir(O)))
