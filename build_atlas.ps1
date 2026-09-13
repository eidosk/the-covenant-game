# Dev-only tool: composites the individual sprite/font PNGs into one atlas.png at fixed offsets.
# Re-run whenever a source sprite changes. Not referenced by any build step automatically —
# index.html's atlas offsets (ATLAS_* consts) must match this layout by hand.
Add-Type -AssemblyName System.Drawing

$W = 187
$H = 162
$atlas = New-Object System.Drawing.Bitmap $W, $H, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($atlas)
$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver

function Draw-Sprite($path, $x, $y) {
    $img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $path))
    $g.DrawImageUnscaled($img, $x, $y)
    $img.Dispose()
}

# shelf A (y=0..48): clouds 9-slice + the three body poses, PLUS the side view's head as two
# swappable pieces instead of baked into the body. A pixel diff of unicorn.png vs
# unicorn_skewer.png showed only the 18x18 (base) / 25x18 (skewer) head+horn region differs — an
# earlier version atlased that region as an overlay drawn on top of the normal body, but the two
# heads don't pixel-align, so the base head showed through around the skewer head's edges (visible
# "two heads" ghosting). Correct fix: cut the head out of the body entirely and draw exactly one
# head piece per frame, never both.
Draw-Sprite "clouds2.png" 0 0
$body = [System.Drawing.Bitmap]::FromFile((Resolve-Path "unicorn.png"))
$headRect = New-Object System.Drawing.Rectangle 14, 2, 18, 18
$headNormal = $body.Clone($headRect, $body.PixelFormat)
$bodyGfx = [System.Drawing.Graphics]::FromImage($body)
$bodyGfx.SetClip($headRect)
$bodyGfx.Clear([System.Drawing.Color]::Transparent)
$bodyGfx.Dispose()
$g.DrawImageUnscaled($body, 48, 0)
$body.Dispose()

# the horn is clipped out of the head/front/back sprites here and atlased once each as its own
# tiny overlay (shelf D, below) — drawn back on top only while state.hasHorn is true, so there is
# no separate horse art anywhere: horse is just "unicorn minus this overlay".
$hornSideRect = New-Object System.Drawing.Rectangle 9, 0, 9, 8   # local to the 18x18 head crop
$hornSide = $headNormal.Clone($hornSideRect, $headNormal.PixelFormat)
$hnGfx = [System.Drawing.Graphics]::FromImage($headNormal)
$hnGfx.SetClip($hornSideRect)
$hnGfx.Clear([System.Drawing.Color]::Transparent)
$hnGfx.Dispose()
$g.DrawImageUnscaled($headNormal, 144, 0)
$headNormal.Dispose()
$skewer = [System.Drawing.Bitmap]::FromFile((Resolve-Path "unicorn_skewer.png"))
$headSkewer = $skewer.Clone((New-Object System.Drawing.Rectangle 14, 2, 25, 18), $skewer.PixelFormat)
$g.DrawImageUnscaled($headSkewer, 162, 0)
$headSkewer.Dispose(); $skewer.Dispose()

# front and back need separate horn rects — the back sprite's mane starts immediately below its
# (smaller) horn shaft, so the front's taller rect would gouge a hole into it if reused there.
$hornFrontRect = New-Object System.Drawing.Rectangle 13, 0, 5, 9
$front = [System.Drawing.Bitmap]::FromFile((Resolve-Path "unicorn_front.png"))
$hornFront = $front.Clone($hornFrontRect, $front.PixelFormat)
$frontGfx = [System.Drawing.Graphics]::FromImage($front)
$frontGfx.SetClip($hornFrontRect)
$frontGfx.Clear([System.Drawing.Color]::Transparent)
$frontGfx.Dispose()
$g.DrawImageUnscaled($front, 80, 0)
$front.Dispose()

$hornBackRect = New-Object System.Drawing.Rectangle 13, 0, 4, 5
$back = [System.Drawing.Bitmap]::FromFile((Resolve-Path "unicorn_back.png"))
$hornBack = $back.Clone($hornBackRect, $back.PixelFormat)
$backGfx = [System.Drawing.Graphics]::FromImage($back)
$backGfx.SetClip($hornBackRect)
$backGfx.Clear([System.Drawing.Color]::Transparent)
$backGfx.Dispose()
$g.DrawImageUnscaled($back, 112, 0)
$back.Dispose()

# shelf B (y=48..80): the small pickups/objects and the leprechaun narrator portrait
Draw-Sprite "mm.png" 0 48
Draw-Sprite "rain_cloud.png" 32 48
Draw-Sprite "sun.png" 64 48
Draw-Sprite "leprechaun.png" 96 48

# shelf D (y=130..162): the horn pickup icon, the three horn overlay pieces captured above
# (ATLAS_HORN_SIDE/FRONT/BACK — this is the entire horse/unicorn distinction, see index.html), and
# level0's grass terrain.
Draw-Sprite "horn.png" 0 130
$g.DrawImageUnscaled($hornSide, 32, 130)
$hornSide.Dispose()
$g.DrawImageUnscaled($hornFront, 41, 130)
$hornFront.Dispose()
$g.DrawImageUnscaled($hornBack, 46, 130)
$hornBack.Dispose()
Draw-Sprite "grass.png" 128 130

$g.Dispose()   # release the Graphics surface BEFORE any direct SetPixel calls below — mixing the
                # two without disposing first left the atlas blank in that region last run.

# shelf C (y=80..130): font_0.png is 8-bit GRAYSCALE with no alpha channel (white=glyph,
# black=background), so it can't be composited normally — convert luminance to alpha instead.
$font = [System.Drawing.Bitmap]::FromFile((Resolve-Path "font_0.png"))
for ($fy = 0; $fy -lt $font.Height; $fy++) {
    for ($fx = 0; $fx -lt $font.Width; $fx++) {
        $lum = $font.GetPixel($fx, $fy).R
        if ($lum -gt 0) {
            $atlas.SetPixel($fx, 80 + $fy, [System.Drawing.Color]::FromArgb($lum, 255, 255, 255))
        }
    }
}
$font.Dispose()

$atlas.Save((Join-Path (Get-Location) "atlas.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$atlas.Dispose()
Write-Output "atlas.png written: ${W}x${H}"
