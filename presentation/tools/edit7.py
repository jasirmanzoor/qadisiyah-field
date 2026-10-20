"""Cut the recorded excerpts into one shareable clip.
Per clip: encode the frames, slow push-in on still shots. Then: varied transitions, warm light-leak flashes on
chosen cuts, a light grade with fine grain and vignette, and a generated ambient bed with whooshes on each cut."""
import os, subprocess, math, sys
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(S, "vid"); FPS = 24; XF = .55
run = lambda *a: subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

# v2: the field story wraps the data. Act I and Act III are rendered scenes; data excerpts are reused as recorded.
# v4: the globe and city excerpts give way to one calibrated globe-to-block zoom; the market-size excerpt holds on its
# derivation long enough to read; the KAFD headquarters close returns before the AutoLink end card.
# v6: excerpts re-recorded with the official logo; a pinned-map scene after the zoom; a clean KAFD finale.
# v7: field-photo opening (Slide Image), top-end cars (Slide Image), 98% and 11-of-13 on CommitGrid, one-shot KAFD.
clips = [("act1v7", "act"), ("b_seg_02", "02"), ("zoom1", "zoom"), ("pins", "pins")] + [("b_seg_" + k, k) for k in ("05", "06", "07", "08")] + [("b_seg_09h2", "09")] \
    + [("b_seg_" + k, k) for k in ("10", "11")] + [("premium", "pins"), ("indep", "pins"), ("bank", "pins")] + [("b_seg_" + k, k) for k in ("19", "20")] \
    + [("act3v6", "act"), ("kafd7", "kafd"), ("card_out2", None)]
FLY = {"06", "07", "08", "zoom", "pins", "kafd"}              # the camera already moves: no push-in
os.makedirs(os.path.join(V, "enc"), exist_ok=True)
durs = []
for name, sid in clips:
    if name in os.environ.get("SKIP", "").split(","): durs.append(0); continue
    src = os.path.join(V, name); n = len([f for f in os.listdir(src) if f.endswith(".jpg")])
    srcfps = 30 if name.startswith("card") else FPS
    d = n / srcfps; durs.append(d); out = os.path.join(V, "enc", name + ".mp4")
    if os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(os.path.join(src, f"f{n-1:05d}.jpg")): continue
    zoom = "" if (sid in FLY or sid == "act" or name.startswith("card")) else \
        f",zoompan=z='1+0.035*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps={srcfps}"
    run("ffmpeg", "-y", "-loglevel", "error", "-framerate", str(srcfps), "-i", os.path.join(src, "f%05d.jpg"),
        "-vf", f"scale=1920:1080:flags=lanczos{zoom},fps={FPS},format=yuv420p", "-c:v", "libx264", "-crf", "12", "-preset", "fast", out)
    print("encoded", name, round(d, 2))

if os.environ.get("ENC_ONLY"): sys.exit(0)
# transitions: varied, never the same twice in a row
KINDS = ["fade", "smoothleft", "zoomin", "smoothup", "circleopen", "slideleft", "fadeblack", "radial", "smoothright", "dissolve", "wipeleft", "circlecrop"]
inp, fl, last, t = [], [], "0:v", durs[0]
for k in range(len(clips)): inp += ["-i", os.path.join(V, "enc", clips[k][0] + ".mp4")]
cuts = []
for k in range(1, len(clips)):
    kind = "fadeblack" if clips[k][1] == "act" or clips[k - 1][1] == "act" else "fade" if {"zoom", "pins", "kafd"} & {clips[k][1], clips[k - 1][1]} else ("fade" if k == len(clips) - 1 else KINDS[(k * 5) % len(KINDS)])
    off = t - XF; cuts.append(off)
    fl.append(f"[{last}][{k}:v]xfade=transition={kind}:duration={XF}:offset={off:.3f}[x{k}]"); last = f"x{k}"
    t = off + durs[k]
TOTAL = t
import json
st, tt = [0], durs[0]
for k in range(1, len(clips)): st.append(round(tt - XF, 3)); tt = tt - XF + durs[k]
json.dump({"clips": [{"name": c[0], "start": s0, "dur": round(d, 3)} for c, s0, d in zip(clips, st, durs)], "total": round(TOTAL, 3), "xf": XF}, open(os.path.join(V, "timeline.json"), "w"), indent=1)
if os.environ.get("TIMELINE_ONLY"): print(round(TOTAL, 2)); sys.exit(0)
# light leaks: a warm screen-blended flare on a few cuts
leaks = [cuts[i] for i in (2, 6, 9, 13, 17) if i < len(cuts)]
leak_png = os.path.join(V, "leak.png")
if not os.path.exists(leak_png):
    from PIL import Image, ImageDraw, ImageFilter
    im = Image.new("RGB", (1920, 1080), (0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((-500, -400, 900, 800), fill=(255, 120, 30)); d.ellipse((1300, 500, 2400, 1500), fill=(255, 60, 10))
    im.filter(ImageFilter.GaussianBlur(260)).save(leak_png)
fl.append(f"movie={leak_png},loop=-1:size=1,setpts=N/{FPS}/TB,format=rgb24,trim=duration={TOTAL:.3f}[lk]")
amp = "+".join(f"0.55*exp(-pow((T-{c + XF / 2:.3f})/0.28,2))" for c in leaks) or "0"
fl.append(f"[{last}]format=rgb24[base]")
win = "+".join(f"between(t,{c + XF / 2 - .25:.3f},{c + XF / 2 + .25:.3f})" for c in leaks) or "0"
fl.append(f"[base][lk]blend=all_mode=screen:all_opacity=0.42:enable='{win}'[lit]")   # a warm flare across each chosen cut
fl.append(f"[lit]eq=contrast=1.04:saturation=1.07:gamma=0.99,unsharp=5:5:0.35,vignette=angle=PI/5.2,noise=alls=2:allf=t,"
          f"fade=t=in:st=0:d=0.6,fade=t=out:st={TOTAL - 1.0:.3f}:d=1.0,format=yuv420p[v]")

out = os.path.join(S, "Film-v7-picture.mp4")
cmd = ["ffmpeg", "-y", "-loglevel", "error", *inp, "-filter_complex", ";".join(fl), "-map", "[v]",
       "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-maxrate", "8M", "-bufsize", "16M", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", str(FPS),
       "-movflags", "+faststart", out]
r = subprocess.run(cmd, stderr=subprocess.PIPE, text=True)
if r.returncode: print(r.stderr[-3000:]); sys.exit(1)
print("total", round(TOTAL, 2), "s ->", out)
