#!/bin/bash
# Mix narration, score and effects: voice leads; music sits ~11 dB under it and ducks further while the narrator speaks;
# v10: effects stem raised 1.5 dB and ducked lightly under the voice so the bigger sound design never covers a line.
# master to -14 LUFS integrated, true peak -1 dBTP (web and social delivery). Two-pass loudness normalisation.
cd "$(dirname "$0")/../vid"; VO=${1:-vo_af_heart}
G="[0:a]aresample=48000,pan=stereo|c0=c0|c1=c0,highpass=f=90,equalizer=f=220:t=q:w=1.2:g=-1.5,equalizer=f=3200:t=q:w=1.5:g=2.5,acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=2dB,volume=6.4dB,asplit=3[vo][key][key2];
[1:a]volume=-12.8dB[mu];[mu][key]sidechaincompress=threshold=0.02:ratio=5:attack=40:release=500:makeup=1[mud];
[2:a]volume=-1.5dB[fx0];[fx0][key2]sidechaincompress=threshold=0.03:ratio=2.5:attack=15:release=350:makeup=1[fx];[vo][mud][fx]amix=inputs=3:normalize=0,alimiter=limit=0.95:level=false"
J=$(ffmpeg -hide_banner -nostats -i $VO/voice.wav -i music10.wav -i sfx10.wav -filter_complex "$G,loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
mi=$(echo "$J" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
read II TP LRA TH OFF <<< "$mi"
ffmpeg -hide_banner -loglevel error -y -i $VO/voice.wav -i music10.wav -i sfx10.wav -filter_complex "$G,loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$II:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$TH:offset=$OFF:linear=true,aresample=48000" -c:a pcm_s24le mix10_$VO.wav
ffmpeg -hide_banner -nostats -i mix10_$VO.wav -af ebur128=peak=true -f null - 2>&1 | grep -E '^\s+(I:|LRA:|Peak:)' | tr -s ' ' | tr '\n' ' '; echo
