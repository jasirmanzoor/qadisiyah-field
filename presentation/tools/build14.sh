#!/bin/bash
# v14: the flight is back. Edit, narration, score and effects re-timed, mixes, two-pass encode, both deliveries.
set -e; S="$(cd "$(dirname "$0")/.." && pwd)"; cd "$S"
python3 tools/edit14.py
python3 tools/narrate14.py
python3 tools/sound14.py
python3 tools/music14.py
cd vid
python3 -c "import soundfile as sf, numpy as np, os; a, sr = sf.read('vo14_af_heart/voice.wav'); os.makedirs('vo14_none', exist_ok=True); sf.write('vo14_none/voice.wav', np.zeros_like(a), sr)"
bash ../tools/mix14.sh vo14_af_heart
bash ../tools/mix14.sh vo14_none
# the music-only mix has no voice to lean on: bring it to the narrated version's level (-14.5 LUFS), peaks held under -1 dBTP
ffmpeg -hide_banner -loglevel error -y -i mix14_vo14_none.wav -af "loudnorm=I=-14.5:TP=-1.5:LRA=11,aresample=48000" -c:a pcm_s24le mix14_vo14_none_l.wav
cd "$S"; mkdir -p enc14; cd enc14
ffmpeg -hide_banner -loglevel error -y -i ../Film-v14-picture.mp4 -c:v libx264 -preset slow -b:v 3600k -pass 1 -passlogfile p14 -profile:v high -pix_fmt yuv420p -an -f mp4 /dev/null
ffmpeg -hide_banner -loglevel error -y -i ../Film-v14-picture.mp4 -c:v libx264 -preset slow -b:v 3600k -pass 2 -passlogfile p14 -profile:v high -pix_fmt yuv420p -an -movflags +faststart pic.mp4
cd "$S"
ffmpeg -hide_banner -loglevel error -y -i enc14/pic.mp4 -i vid/mix14_vo14_af_heart.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart AutoLink-Built-on-the-Ground-v14-narrated.mp4
ffmpeg -hide_banner -loglevel error -y -i enc14/pic.mp4 -i vid/mix14_vo14_none_l.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart AutoLink-Built-on-the-Ground-v14-music.mp4
for f in AutoLink-Built-on-the-Ground-v14-*.mp4; do echo "$f $(stat -c %s $f) $(ffprobe -v error -show_entries format=duration -of csv=p=0 $f)s $(ffmpeg -hide_banner -nostats -i $f -map 0:a -af ebur128=peak=true -f null - 2>&1 | grep -E '^\s+(I:|Peak:)' | tr -s ' ' | tr '\n' ' ')"; done
