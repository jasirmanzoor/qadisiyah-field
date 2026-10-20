"""x4 upscale with realesr-general-x4v3 (ONNX), run twice for x16 when asked; usage: upscale.py in out [passes]"""
import sys, numpy as np, onnxruntime as ort
from PIL import Image
import os; s = ort.InferenceSession(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "realesr-general-x4v3.onnx"))
im = Image.open(sys.argv[1]).convert("RGB")
for _ in range(int(sys.argv[3]) if len(sys.argv) > 3 else 1):
    x = np.asarray(im, np.float32).transpose(2, 0, 1)[None] / 255.0
    y = s.run(None, {"input": x})[0][0].transpose(1, 2, 0)
    im = Image.fromarray((np.clip(y, 0, 1) * 255 + .5).astype(np.uint8))
im.save(sys.argv[2], quality=95); print(im.size)
