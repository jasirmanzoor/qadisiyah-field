#!/bin/bash
# Cut the film's own scenes for the keynote's film chapters: picture only, each under the 16 MB file limit, plus a poster.
set -e; IN=$1; OUT=$2; mkdir -p "$OUT"
while read k a b; do
  ffmpeg -nostdin -hide_banner -loglevel error -y -ss $a -i "$IN" -t $(python3 -c "print(round($b-$a,3))") -an -c:v libx264 -preset slow -crf 22 -maxrate 3200k -bufsize 6400k -profile:v high -pix_fmt yuv420p -movflags +faststart "$OUT/$k.mp4"
  ffmpeg -nostdin -hide_banner -loglevel error -y -ss $(python3 -c "print($a+0.6)") -i "$IN" -frames:v 1 -vf scale=1280:-2 -q:v 4 "$OUT/$k.jpg"
  echo "$k $(stat -c %s $OUT/$k.mp4)"
done <<'CUTS'
f1 0 31.65
f2 31.65 67.85
f3 74.3 98.75
f4 98.75 119.86
f5 145.375 170.31
f6 187.79 215.83
f7 215.83 229.8
CUTS
