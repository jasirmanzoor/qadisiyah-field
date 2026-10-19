"""Cut the recorded excerpts into one shareable clip.
Per clip: encode the frames, slow push-in on still shots. Then: varied transitions, warm light-leak flashes on
chosen cuts, a light grade with fine grain and vignette, and a generated ambient bed with whooshes on each cut."""
import os, subprocess, math, sys
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(S, "vid"); FPS = 24; XF = .55
run = lambda *a: subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

edl = [l.split() for l in open(os.path.join(V, "edl.txt")) if l.strip()]
clips = [("card_in", None)] + [("seg_" + e[0], e[0]) for e in edl] + [("card_out", None)]
FLY = {"06", "07", "08"}                      # the drone already moves: no push-in
os.makedirs(os.path.join(V, "enc"), exist_ok=True)
durs = []
for name, sid in clips:
    if name in os.environ.get("SKIP", "").split(","): durs.append(0); continue
    src = os.path.join(V, name); n = len([f for f in os.listdir(src) if f.endswith(".jpg")])
    srcfps = 30 if name.startswith("card") else FPS
    d = n / srcfps; durs.append(d); out = os.path.join(V, "enc", name + ".mp4")
    if os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(os.path.join(src, f"f{n-1:05d}.jpg")): continue
    zoom = "" if (sid in FLY or name.startswith("card")) else \
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
    kind = "fade" if k in (1, len(clips) - 1) else KINDS[(k * 5) % len(KINDS)]
    off = t - XF; cuts.append(off)
    fl.append(f"[{last}][{k}:v]xfade=transition={kind}:duration={XF}:offset={off:.3f}[x{k}]"); last = f"x{k}"
    t = off + durs[k]
TOTAL = t
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

# sound: a warm low pad (A minor colours) breathing slowly, airy noise, and a soft whoosh on every cut
pad = "+".join(f"{a}*sin(2*PI*{f}*t)*(0.6+0.4*sin(2*PI*{r}*t))" for f, a, r in ((55, .22, .05), (110, .16, .07), (164.81, .09, .09), (220, .06, .11), (261.63, .045, .13), (329.63, .03, .06)))
fl.append(f"aevalsrc='{pad}':s=48000:d={TOTAL:.3f},lowpass=f=1400,volume=0.9[pad]")
fl.append(f"anoisesrc=color=pink:amplitude=0.05:d={TOTAL:.3f}:r=48000,lowpass=f=900,highpass=f=120[air]")
wenv = "+".join(f"exp(-pow((t-{c + XF / 2:.3f})/0.22,2))" for c in cuts)
fl.append(f"anoisesrc=color=white:amplitude=0.6:d={TOTAL:.3f}:r=48000,bandpass=f=1800:width_type=o:w=1.6,volume='0.5*({wenv})':eval=frame[wh]")
fl.append(f"[pad][air][wh]amix=inputs=3:normalize=0,afade=t=in:st=0:d=1.5,afade=t=out:st={TOTAL - 2:.3f}:d=2,aformat=channel_layouts=stereo,loudnorm=I=-18:TP=-2:LRA=9[a]")

out = os.path.join(S, "Riyadh-SubDealer-Keynote.mp4")
cmd = ["ffmpeg", "-y", "-loglevel", "error", *inp, "-filter_complex", ";".join(fl), "-map", "[v]", "-map", "[a]",
       "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-maxrate", "8M", "-bufsize", "16M", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", str(FPS),
       "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]
r = subprocess.run(cmd, stderr=subprocess.PIPE, text=True)
if r.returncode: print(r.stderr[-3000:]); sys.exit(1)
print("total", round(TOTAL, 2), "s ->", out)
