#!/bin/bash
# usage: recall.sh worker nworkers
cd "$(dirname "$0")/.."
i=0
while read id start dur; do
  if [ $((i % $2)) -eq $1 ] && [ ! -f vid/seg_$id/done ]; then
    rm -rf vid/seg_$id; mkdir -p vid/seg_$id
    node tools/rec.mjs http://127.0.0.1:8098/preview.html vid/seg_$id 1920 1080 24 $start $dur > vid/seg_$id/log.txt 2>&1 && touch vid/seg_$id/done
  fi
  i=$((i+1))
done < vid/edl.txt
