#!/bin/bash
# Re-finish the hand-held drive-by clips from the original iPhone HDR (HLG) files: tone-map to SDR, two-pass
# stabilisation with a fixed 6% zoom, crop the car's hood, a light contrast/colour lift and sharpen; same frame count.
cd "$(dirname "$0")/.."; U=/root/.claude/uploads/88dc8c01-5bd2-5aa6-b478-4bdfabedcbd9
TM="zscale=tin=arib-std-b67:min=bt2020nc:pin=bt2020:t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p"
G="eq=contrast=1.05:saturation=1.12:brightness=0.03,hqdn3d=1.2:1.2:2.5:2.5,unsharp=5:5:0.45"
for n in ${CLIPS:-2640 2622 2623 2629 2636 2621 2624}; do
  src=$(ls -S $U/*IMG_$n.mov | head -1); N=$(ls portfolio/bogpan/c$n | wc -l); o=portfolio/bogpan2/c$n; mkdir -p $o vid/stab
  ffmpeg -v error -y -i "$src" -vf "$TM,vidstabdetect=shakiness=6:accuracy=15:result=vid/stab/$n.trf" -f null -
  ffmpeg -v error -y -i "$src" -vf "$TM,vidstabtransform=input=vid/stab/$n.trf:smoothing=18:optzoom=0:zoom=6:interpol=bicubic,crop=iw*0.88:ih*0.88:iw*0.06:0,scale=1080:1920:flags=lanczos,$G" -frames:v $N -q:v 3 $o/f%04d.jpg
  echo c$n $N $(ls $o | wc -l)
done
