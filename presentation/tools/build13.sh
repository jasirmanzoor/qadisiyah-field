#!/bin/bash
# v13 picture and delivery: Act I re-spliced, the edit re-cut, a two-pass 3.6 Mb/s encode, both soundtracks muxed.
set -e; S="$(cd "$(dirname "$0")/.." && pwd)"; cd "$S"
python3 tools/act1v8.py
python3 tools/edit9.py
mkdir -p enc13; cd enc13
ffmpeg -hide_banner -loglevel error -y -i ../Film-v9-picture.mp4 -c:v libx264 -preset slow -b:v 3600k -pass 1 -passlogfile p13 -profile:v high -pix_fmt yuv420p -an -f mp4 /dev/null
ffmpeg -hide_banner -loglevel error -y -i ../Film-v9-picture.mp4 -c:v libx264 -preset slow -b:v 3600k -pass 2 -passlogfile p13 -profile:v high -pix_fmt yuv420p -an -movflags +faststart pic.mp4
cd "$S"; O=AutoLink-Film-Final
ffmpeg -hide_banner -loglevel error -y -i enc13/pic.mp4 -i vid/mix11_vo13_af_heart.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart AutoLink-Built-on-the-Ground-v13-narrated.mp4
ffmpeg -hide_banner -loglevel error -y -i enc13/pic.mp4 -i vid/mix11_vo9_none_l.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart AutoLink-Built-on-the-Ground-v13-music.mp4
ls -la AutoLink-Built-on-the-Ground-v13-*.mp4
