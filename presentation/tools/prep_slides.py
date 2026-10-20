"""Full-frame 1920x1080 slides for the Slide Image sections: crop each photo to 16:9 around a focus point, upscale with
Real-ESRGAN when the crop is smaller than the frame (blended 50/50 with Lanczos so it stays natural), light grade."""
import os, sys, json, numpy as np, onnxruntime as ort
from PIL import Image, ImageEnhance
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); P = os.path.join(S, "portfolio")
o = ort.SessionOptions(); o.intra_op_num_threads = 4
sess = ort.InferenceSession(os.path.join(S, "models", "realesr-general-x4v3.onnx"), o)
def esr(im):
    x = np.asarray(im, np.float32).transpose(2, 0, 1)[None] / 255
    return Image.fromarray((np.clip(sess.run(None, {"input": x})[0][0].transpose(1, 2, 0), 0, 1) * 255 + .5).astype(np.uint8))
JOBS = json.load(open(sys.argv[1]))
os.makedirs(os.path.join(P, "slides"), exist_ok=True)
for name, src, fy, fw in JOBS:                      # fy: vertical focus 0..1, fw: crop width as a fraction of the photo
    im = Image.open(os.path.join(P, src)).convert("RGB"); W, H = im.size
    cw = W * fw; ch = cw * 9 / 16
    if ch > H: ch = H; cw = ch * 16 / 9
    cx = W / 2; cy = min(max(fy * H, ch / 2), H - ch / 2)
    c = im.crop((int(cx - cw / 2), int(cy - ch / 2), int(cx + cw / 2), int(cy + ch / 2)))
    lz = c.resize((1920, 1080), Image.LANCZOS)
    if c.width < 1900:
        small = c if c.width <= 960 else c.resize((960, 540), Image.LANCZOS)
        up = esr(small).resize((1920, 1080), Image.LANCZOS); out = Image.blend(lz, up, .5)
    else: out = lz
    out = ImageEnhance.Contrast(out).enhance(1.04); out = ImageEnhance.Color(out).enhance(1.06)
    out.save(os.path.join(P, "slides", name + ".jpg"), quality=93); print(name, c.size, flush=True)
