#!/bin/bash
# Re-record the deck excerpts with the official AutoLink lockup in the corner. usage: recall6.sh worker nworkers
cd "$(dirname "$0")/.."
export EXTRA_CSS=" .kbar .brand svg, .kbar .brand span { display: none !important; } .kbar .brand { display: block !important; width: 150px; height: 28px; background: url(brand/autolink-lockup.png) left center / contain no-repeat; }"
i=0
while read id start dur holds; do
  if [ $((i % $2)) -eq $1 ] && [ ! -f vid/b_seg_$id/done ]; then
    mkdir -p vid/b_seg_$id; [ "$holds" = "-" ] && holds=""
    node tools/rechold.mjs http://127.0.0.1:8098/preview.html vid/b_seg_$id 1920 1080 24 $start $dur 1 "$holds" > vid/b_seg_$id/log.txt 2>&1 && touch vid/b_seg_$id/done
  fi
  i=$((i+1))
done < vid/edl6.txt
