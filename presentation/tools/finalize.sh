#!/bin/bash
# Put the mastered soundtracks on the edited picture (video stream copied untouched).
cd "$(dirname "$0")/.."
V=Riyadh-SubDealer-Keynote.mp4
ffmpeg -hide_banner -loglevel error -y -i $V -i vid/mix_vo_af_heart.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart Riyadh-SubDealer-Keynote-narrated.mp4
ffmpeg -hide_banner -loglevel error -y -i $V -i vid/mix_vo_none.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart Riyadh-SubDealer-Keynote-music.mp4
for f in Riyadh-SubDealer-Keynote-narrated.mp4 Riyadh-SubDealer-Keynote-music.mp4; do echo "$f $(du -h $f | cut -f1) $(ffprobe -v error -show_entries format=duration -of csv=p=0 $f)s $(ffmpeg -hide_banner -nostats -i $f -map 0:a -af ebur128=peak=true -f null - 2>&1 | grep -E '^\s+(I:|Peak:)' | tr -s ' ' | tr '\n' ' ')"; done
