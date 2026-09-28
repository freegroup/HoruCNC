/**
 * Help texts for every setting, shown by the (?) next to its label. `description` is HTML.
 *
 * Key scheme:  <pluginId>.<param key>   → 'terrain.maxDepth', 'terrain.meander.angle'
 * Fallback:    *.<param key>            → applies to every step with that setting
 *
 * The one rule behind all of them: dark is ink, ink is milled — darker is deeper.
 */
export const HELP = {

  // ── Source ─────────────────────────────────────────────────────────────────
  'source.deviceId': { description: `
    <p>Where the picture comes from: one of your <b>webcams</b>, or <b>Upload image</b> for a
    file from your computer.</p>
    <p class="hint">Every step works on one still picture — the snapshot or the upload — so the
    result doesn't flicker while you adjust things.</p>` },

  'source.dpi': { description: `
    <p>How many pixels the picture is worked on with. <b>More detail</b> means finer lines, but
    every step takes longer.</p>
    <p>Start with <i>High</i>; go to <i>Ultra</i> for fine line art, down to <i>Draft</i> when
    things get slow.</p>
    <p class="hint">It never goes above the picture's own resolution — that would add no detail.</p>` },

  'source.flipH': { description: `
    <p>Mirrors the picture left to right.</p>
    <p>Webcams often show a mirror image; switch this on if text or a logo reads backwards.</p>` },

  'source.physicalWidth': { description: `
    <p>How wide the picture is <b>on the workpiece</b>, in millimetres. The height follows from
    the picture's proportions.</p>
    <p>This sets the scale of everything after it — the paths, the relief and the G-code.</p>` },

  // ── Image filters ──────────────────────────────────────────────────────────
  'grayscale.invert': { description: `
    <p>Swaps light and dark.</p>
    <p>What is <b>dark gets milled</b> — and in a relief, darker is deeper. Invert when the
    wrong part comes out: e.g. a light object on a dark background, or a relief that should
    stand up instead of being sunk in.</p>` },

  'grayscale.autoLevels': { description: `
    <p>Stretches the brightness so the darkest spot becomes black and the lightest white.</p>
    <p>Helps with pale or low-contrast photos: the full depth range gets used.</p>` },

  'blackwhite.threshold': { description: `
    <p>The brightness that divides <b>black</b> from <b>white</b> (0–255).</p>
    <ul><li><b>Lower</b> — only really dark areas stay black; thin or faint lines may vanish.</li>
    <li><b>Higher</b> — more turns black; lines get thicker, shadows and noise join in.</li></ul>
    <p class="hint">Black is what gets milled.</p>` },

  'blackwhite.invert': { description: `
    <p>Swaps black and white after the threshold.</p>
    <p>Use it when the picture has <b>light lines on a dark background</b> — black is what gets
    milled.</p>` },

  'canny.threshLow': { description: `
    <p>How faint an edge may be to still count, <b>if it connects to a strong edge</b>.</p>
    <p>Lower it to close gaps in outlines; raise it when fine texture turns into lines.</p>` },

  'canny.threshHigh': { description: `
    <p>How strong an edge must be to <b>start a line</b>.</p>
    <p>Higher means fewer, only clear outlines; lower picks up more detail — and more noise.</p>
    <p class="hint">Keep it above <i>Threshold Low</i>.</p>` },

  'canny.blur': { description: `
    <p>Softens the picture before looking for edges.</p>
    <p>More blur ignores grain, texture and noise and keeps the big shapes; less blur keeps
    fine detail.</p>` },

  'crop.leftCut':   { description: `<p>Cuts this much off the <b>left</b> side of the picture, in % of its width.</p><p class="hint">Or drag the handles in the <i>Adjust</i> view.</p>` },
  'crop.rightCut':  { description: `<p>Cuts this much off the <b>right</b> side of the picture, in % of its width.</p><p class="hint">Or drag the handles in the <i>Adjust</i> view.</p>` },
  'crop.topCut':    { description: `<p>Cuts this much off the <b>top</b> of the picture, in % of its height.</p><p class="hint">Or drag the handles in the <i>Adjust</i> view.</p>` },
  'crop.bottomCut': { description: `<p>Cuts this much off the <b>bottom</b> of the picture, in % of its height.</p><p class="hint">Or drag the handles in the <i>Adjust</i> view.</p>` },

  // ── Turning the picture into paths ─────────────────────────────────────────
  'contours.minContour': { description: `
    <p>Outlines shorter than this (in pixels) are left out.</p>
    <p>Raise it to get rid of specks and dust; lower it when small details go missing.</p>` },

  'contours.depth': { description: `
    <p>How deep the outlines are cut, in millimetres.</p>
    <p class="hint">Deeper than the <i>Max stepdown</i> of the machine setup is milled in several
    passes.</p>` },

  'skeleton.minContour': { description: `
    <p>Paths shorter than this (in pixels) are left out.</p>
    <p>Raise it to drop specks and tiny strokes; lower it when short lines of the drawing go
    missing.</p>` },

  'skeleton.depth': { description: `
    <p>How deep the lines are cut, in millimetres.</p>
    <p class="hint">With a V-bit the depth also sets how wide the groove gets.</p>` },

  'skeleton.smooth': { description: `
    <p>Evens out the <b>pixel steps</b> along each line, in pixels.</p>
    <p>0 follows every pixel; higher values give calm, flowing curves but round off sharp
    corners a little.</p>` },

  // Terrain — a strategy's own settings are keyed terrain.<strategy>.<setting>;
  // *.lineStep covers the strategies without a text of their own
  'terrain.strategy': { description: `
    <p>The way the cutter moves over the picture. The depth always comes from the brightness —
    darker is deeper.</p>
    <ul><li><b>Meander</b> — parallel lines back and forth; where nothing is milled, the line stops.</li>
    <li><b>Halftone lines</b> — lines right across, never broken: darker makes them deeper, with a V-bit <b>wider</b> — a picture like an engraving.</li>
    <li><b>Cross hatch</b> — the lines once more at right angles: a smoother surface.</li>
    <li><b>Spiral</b> — one spiral from the centre out, no turning points.</li>
    <li><b>Radial</b> — spokes from the centre, like a sun.</li>
    <li><b>Plunge</b> — only dips in, dot by dot. With a V-bit: a halftone picture.</li>
    <li><b>Waterline</b> — level by level from the top down, each level cleared in rings: terraces, like a contour map.</li></ul>
    <p class="hint">Every strategy keeps its own settings.</p>` },

  'terrain.maxDepth': { description: `
    <p>How deep <b>black</b> is cut, in millimetres. Greys go in between — darker is deeper.</p>
    <p class="warn">Mind the length of your cutter and the thickness of your board.</p>` },

  '*.lineStep': { description: `
    <p>The distance between neighbouring paths, in millimetres.</p>
    <p>Smaller gives a smoother relief but a longer job. With a ball nose, about
    <b>10–20&nbsp;% of the cutter diameter</b> leaves a fine surface.</p>` },

  'terrain.threshold': { description: `
    <p>From this brightness on (0–255), nothing is cut — the surface stays untouched.</p>
    <p>Keeps a white background from being skimmed; lower it if light greys shouldn't be cut
    either.</p>` },

  'terrain.meander.angle': { description: `
    <p>The direction the scan lines run in, in degrees. 0° runs along X.</p>
    <p>Lines along the grain of the wood, or across the main shapes of the picture, often give
    the nicer surface.</p>
` },

  'terrain.halftone.angle': { description: `
    <p>The direction of the lines, in degrees. 0° runs along X, 90° along Y.</p>
    <p>Diagonal lines (around 45°) usually look best — like an engraving on a banknote.</p>` },

  'terrain.halftone.lineStep': { description: `
    <p>The distance between the lines, in millimetres.</p>
    <p>With a V-bit the darkest line is as wide as its depth allows — keep the spacing a
    little above that, so neighbouring lines don't merge.</p>` },

  'terrain.halftone.minDepth': { description: `
    <p>How deep the lines go even where the picture is white, in millimetres.</p>
    <p>A little depth keeps every line visible from edge to edge; at 0 the cutter only touches
    the surface in light areas.</p>` },

  'terrain.crosshatch.angle': { description: `
    <p>The direction of the first set of lines, in degrees; the second runs at right angles
    to it.</p>` },

  'terrain.spiral.lineStep': { description: `
    <p>The distance from one ring of the spiral to the next, in millimetres.</p>
    <p>Smaller gives a smoother relief but a longer job.</p>` },

  'terrain.radial.lineStep': { description: `
    <p>How far apart the spokes are, in millimetres, measured two thirds of the way out.</p>
    <p class="hint">Towards the centre they close in, towards the corners they spread.</p>` },

  'terrain.plunge.lineStep': { description: `
    <p>The distance between the dots, in millimetres. They sit on a honeycomb grid.</p>
    <p>With a V-bit, darker dots go deeper and so get <b>wider</b> — keep the spacing about the
    width of the darkest dot.</p>` },

  'terrain.waterline.zStep': { description: `
    <p>How much deeper each level goes, in millimetres. Level by level, from the top down,
    everything that has to go at least that deep is cleared.</p>
    <p>Smaller steps follow slopes more closely — the relief shows finer terraces.</p>` },

  'terrain.waterline.lineStep': { description: `
    <p>How far apart the rings are that clear each level, in millimetres — from the outline
    inwards, like a pocket.</p>
    <p><b>Rule of thumb:</b> 40–50&nbsp;% of the cutter diameter clears the floor without
    leaving ridges.</p>` },

  // ── Vector filters ─────────────────────────────────────────────────────────
  'joinpaths.maxGap': { description: `
    <p>Paths whose <b>ends</b> are closer than this (in mm) are joined into one.</p>
    <p>Fewer, longer paths mean fewer times lifting and plunging the cutter. Only start and end
    points count — a path that starts in the middle of another stays apart.</p>
    <p class="hint">Follow it with <i>Remove short</i> to tidy up what is left.</p>` },

  'removeshort.minPoints': { description: `
    <p>Paths with fewer points than this are removed.</p>
    <p>Gets rid of tiny bits that would only leave marks.</p>` },

  'simplify.epsilon': { description: `
    <p>How far a path may move to use <b>fewer points</b>.</p>
    <p>Straight parts get by with just their ends. Higher means smaller G-code but coarser
    curves.</p>` },

  'smooth.window': { description: `
    <p>How many neighbouring points each point is averaged with.</p>
    <p>Larger rounds off jagged edges more — and sharp corners too.</p>` },

  'smooth.passes': { description: `
    <p>How often the smoothing is repeated. Each pass makes the paths a little softer.</p>` },

  'scale.size': { description: `
    <p>The size of the paths in millimetres — <b>width × height</b> and the <b>depth</b> of the
    deepest point.</p>
    <p>With the chain on, width and height stay in proportion: type one, the other follows.
    Leave a field empty to keep the size coming in.</p>` },

  'setz.mode': { description: `
    <ul><li><b>Set</b> — every path at one depth.</li>
    <li><b>Clamp</b> — depths kept between a minimum and a maximum.</li>
    <li><b>Scale</b> — all depths scaled together, so the deepest point lands where you say.</li></ul>` },

  'setz.depth': { description: `
    <p>In mm, into the material. With <b>Set</b> every path is cut this deep; with
    <b>Scale</b> this is where the deepest point ends up — the rest in proportion.</p>` },

  'setz.minDepth': { description: `<p>Nothing is cut shallower than this, in mm.</p>` },
  'setz.maxDepth': { description: `<p>Nothing is cut deeper than this, in mm.</p>` },

  // ── Machine setup ──────────────────────────────────────────────────────────
  'gcode.tool': { description: `
    <ul><li><b>End mill</b> — flat bottom, straight walls; for pockets and cutting out.</li>
    <li><b>Ball nose</b> — round tip; for smooth reliefs.</li>
    <li><b>V-bit</b> — pointed; for engraving and lettering, deeper cuts get wider.</li>
    <li><b>Bullnose</b> — flat with rounded corners.</li></ul>` },

  'gcode.toolDiameter': { description: `
    <p>The diameter of the cutter, in millimetres — as on the shank or the packaging.</p>` },

  'gcode.veeAngle': { description: `
    <p>The angle of the V-bit's tip, e.g. 30°, 60° or 90°.</p>
    <p>A <b>smaller angle</b> gives narrower, finer grooves at the same depth.</p>` },

  'gcode.veeHeight': { description: `
    <p>How high the V-shaped cone of the bit is, in millimetres — as deep as it can cut
    <b>V-shaped</b>. Together with the angle it sets the widest groove.</p>
    <p class="warn">Don't cut deeper than this: above the cone the shank would rub.</p>` },

  'gcode.cornerRadius': { description: `
    <p>The radius of the rounded corners of a bullnose cutter, in millimetres.</p>` },

  'gcode.stepdown': { description: `
    <p>The most the cutter goes down in <b>one pass</b>, in millimetres. Deeper cuts are
    split into several passes.</p>
    <p><b>Rule of thumb:</b> about half the cutter diameter in wood, less in hard material.</p>` },

  'gcode.safeZ': { description: `
    <p>How high above the surface the cutter travels between cuts, in millimetres.</p>
    <p class="warn">Higher than any clamp or screw on the table.</p>` },

  'gcode.feed': { description: `
    <p>How fast the cutter moves sideways while cutting, in mm per minute.</p>
    <p>Too fast breaks cutters or loses steps; too slow burns the wood.</p>` },

  'gcode.plunge': { description: `
    <p>How fast the cutter goes down into the material, in mm per minute.</p>
    <p>Usually a third to half of the feed.</p>` },

  'gcode.spindle': { description: `
    <p>The spindle speed in revolutions per minute (the <code>S</code> value).</p>
    <p class="hint">Machines with a hand-set router ignore it.</p>` },
}

/** The help entry for `<pluginId>.<key>` — or the general one for `<key>` — or null. */
export function helpFor(key) {
  if (!key) return null
  return HELP[key] ?? HELP[`*.${key.split('.').pop()}`] ?? null
}
