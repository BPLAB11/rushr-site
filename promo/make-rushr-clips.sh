#!/usr/bin/env bash
# Fabrique les clips verticaux Rushr (1080x1920, 30 i/s, sans son) à partir des scènes de
# promo/rushr-scenes.html (textes et recadrages des captures s'y modifient).
# Chaque scène est capturée en image (Edge), puis animée (léger zoom + transition) avec ffmpeg.
#
# Usage (depuis la racine du site) :  bash promo/make-rushr-clips.sh
# Variables facultatives : FF (ffmpeg), EDGE (msedge.exe)

FF="${FF:-/c/ffmpeg/bin/ffmpeg}"
EDGE="${EDGE:-/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/clips"
FR="$OUT/.frames"
mkdir -p "$FR"
HTMLURL="file:///$(cd "$HERE" && pwd -W 2>/dev/null | sed 's#\\#/#g' || echo "$HERE")/rushr-scenes.html"
T=0.4   # durée des transitions (s)

render() { # scène -> image
  "$EDGE" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --force-device-scale-factor=1 --virtual-time-budget=3000 --window-size=1080,1920 \
    --screenshot="$(cd "$FR" && pwd -W 2>/dev/null || echo "$FR")/$1.png" "$HTMLURL#$1" >/dev/null 2>&1
}

make() { # nom scène:durée scène:durée ...
  local name="$1"; shift
  local inputs=() fc="" i=0 cum=0 last="" n=$#
  for sd in "$@"; do
    local sc="${sd%%:*}" d="${sd##*:}"
    render "$sc"
    inputs+=(-loop 1 -framerate 30 -t "$d" -i "$FR/$sc.png")
    fc+="[$i:v]scale=2160:3840:flags=lanczos,zoompan=z='1+0.0005*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,setsar=1,format=yuv420p[v$i];"
    i=$((i+1))
  done
  # enchaînement avec transitions
  i=0; cum=0; last="v0"
  for sd in "$@"; do
    local d="${sd##*:}"
    if [ $i -ge 1 ]; then
      local off tr="slideup"
      [ $i -eq $((n-1)) ] && tr="fade"
      off=$(awk "BEGIN{printf \"%.2f\", $cum-$i*$T}")
      fc+="[$last][v$i]xfade=transition=$tr:duration=$T:offset=$off[x$i];"
      last="x$i"
    fi
    cum=$(awk "BEGIN{print $cum+$d}")
    i=$((i+1))
  done
  "$FF" -hide_banner -loglevel error -y "${inputs[@]}" -filter_complex "${fc%;}" -map "[$last]" \
    -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -an -movflags +faststart "$OUT/$name.mp4" \
    && echo "OK  $name.mp4"
}

#    nom                              scène:durée ...
make rushr-01-trier-ses-rushes        r1-1:2.8 r1-2:3.2 r1-3:3.2 r1-4:3.2 r1-5:3.2 r1-6:3.6
make rushr-02-rushes-en-local         r2-1:3.0 r2-2:3.4 r2-3:3.6 r2-4:3.6
make rushr-03-presets-et-structure    r3-1:2.8 r3-2:3.4 r3-3:3.4 r3-4:3.4 r3-5:3.6
make rushr-04-appel-aux-testeurs      r4-1:3.0 r4-2:3.4 r4-3:3.6

ls -la "$OUT"/rushr-*.mp4
