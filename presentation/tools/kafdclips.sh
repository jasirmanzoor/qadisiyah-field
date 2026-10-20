#!/bin/bash
# KAFD footage (iPhone HDR): tone-map to SDR, gentle stabilisation, a clean light grade that keeps the towers' definition
cd "$(dirname "$0")/.."; U=/root/.claude/uploads/88dc8c01-5bd2-5aa6-b478-4bdfabedcbd9; mkdir -p vid/stab
TM="zscale=tin=arib-std-b67:min=bt2020nc:pin=bt2020:t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p"
for p in "a 76f3295f" "b cc47a363"; do set -- $p
  ffmpeg -v error -y -i $U/$2-IMG_9321.mov -vf "$TM,vidstabdetect=shakiness=5:accuracy=15:result=vid/stab/k$1.trf" -f null -
  ffmpeg -v error -y -i $U/$2-IMG_9321.mov -vf "$TM,vidstabtransform=input=vid/stab/k$1.trf:smoothing=24:optzoom=0:zoom=4:interpol=bicubic,scale=1080:1920:flags=lanczos,eq=contrast=1.04:saturation=1.08:brightness=0.02,unsharp=5:5:0.35" -q:v 2 portfolio/kafdv/$1/f%04d.jpg
  echo $1 $(ls portfolio/kafdv/$1 | wc -l)
done
