#!/bin/bash
# v15: v14 with the KAFD outro rebuilt from stills. Same length, so the v14 narration, score and effects mixes are reused as they are.
set -e; S="$(cd "$(dirname "$0")/.." && pwd)"; cd "$S"
python3 tools/edit15.py
mkdir -p enc15; cd enc15
ffmpeg -nostdin -hide_banner -loglevel error -y -i ../Film-v15-picture.mp4 -c:v libx264 -preset slow -b:v 3600k -pass 1 -passlogfile p15 -profile:v high -pix_fmt yuv420p -an -f mp4 /dev/null
ffmpeg -nostdin -hide_banner -loglevel error -y -i ../Film-v15-picture.mp4 -c:v libx264 -preset slow -b:v 3600k -pass 2 -passlogfile p15 -profile:v high -pix_fmt yuv420p -an -movflags +faststart pic.mp4
cd "$S"
ffmpeg -nostdin -hide_banner -loglevel error -y -i enc15/pic.mp4 -i vid/mix14_vo14_af_heart.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart AutoLink-Built-on-the-Ground-v15-narrated.mp4
ffmpeg -nostdin -hide_banner -loglevel error -y -i enc15/pic.mp4 -i vid/mix14_vo14_none_l.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart AutoLink-Built-on-the-Ground-v15-music.mp4
for f in AutoLink-Built-on-the-Ground-v15-*.mp4; do echo "$f $(stat -c %s $f) $(ffprobe -v error -show_entries format=duration -of csv=p=0 $f)s"; done
