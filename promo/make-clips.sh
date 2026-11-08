#!/usr/bin/env bash
# Découpe le showreel en clips verticaux 9:16 (1080x1920) pour TikTok / Reels / Shorts.
# Le clip (format cinéma) est centré sur un fond flou, avec un titre au-dessus
# et l'adresse du site en dessous. Le son d'origine est conservé.
#
# Usage (depuis la racine du site) :  bash promo/make-clips.sh
# Variables facultatives : SRC (fichier source), FF (chemin de ffmpeg)
#
# Pour changer un extrait : modifier les lignes « clip ... » en bas
# (nom, début en secondes, fin en secondes, titre affiché).

FF="${FF:-/c/ffmpeg/bin/ffmpeg}"
SRC="${SRC:-/c/Users/WILART/Downloads/SHOWREEL.mp4}"
FONT="C\\:/Windows/Fonts/arialbd.ttf"
URLTXT="thebackpacklab.com"

HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/clips"
mkdir -p "$OUT/.txt"
cd "$OUT" || exit 1
printf '%s' "$URLTXT" > .txt/url.txt

clip() {
  local name="$1" ss="$2" to="$3" hook="$4"
  printf '%s' "$hook" > ".txt/$name.txt"
  local fade
  fade=$(awk "BEGIN{print ($to-$ss)-0.5}")
  "$FF" -hide_banner -loglevel error -y -ss "$ss" -to "$to" -i "$SRC" \
    -filter_complex "[0:v]split=2[bg][fg];\
[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=50:15,eq=brightness=-0.34:saturation=1.1[b];\
[fg]scale=1080:-2[f];\
[b][f]overlay=0:(H-h)/2,\
drawtext=fontfile='$FONT':textfile='.txt/$name.txt':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=545:shadowcolor=black@0.6:shadowx=3:shadowy=3,\
drawtext=fontfile='$FONT':textfile='.txt/url.txt':fontcolor=0x35DC8E:fontsize=44:x=(w-text_w)/2:y=1265:shadowcolor=black@0.6:shadowx=2:shadowy=2,\
fps=25,format=yuv420p[v]" \
    -map "[v]" -map 0:a:0 -af "afade=t=in:d=0.3,afade=t=out:st=$fade:d=0.5" \
    -c:v libx264 -preset medium -crf 21 -c:a aac -b:a 160k -movflags +faststart \
    "$name.mp4" && echo "OK  $name.mp4"
}

#    nom                      début   fin    titre affiché
clip 00-showreel-complet      0       57.44  "SHOWREEL VFX"
clip 01-best-of-vfx           15.56   28.36  "Incrustation 3D & effets"
clip 02-incrustation-ecran    0       13.4   "Incrustation d'écran"
clip 03-objets-3d             28.52   37.24  "Objets 3D incrustés"
clip 04-interfaces-ecran      44.68   52.64  "Interfaces à l'écran"

ls -la "$OUT"/*.mp4
