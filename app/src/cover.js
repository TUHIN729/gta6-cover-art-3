// Leonida Nights Cover Press — cover renderer.
// Draws the whole poster on one 2D canvas: a multi-panel photo grid,
// a sunset or neon colour grade, grain, a vignette, and a bold
// hand-lettered title block. No image leaves the machine; every photo
// is drawn from an <img> or canvas the user loaded locally.

export const SIZES = {
  square: { w: 1080, h: 1080, label: "1080 × 1080" },
  portrait: { w: 1080, h: 1350, label: "1080 × 1350" },
  wide: { w: 1920, h: 1080, label: "1920 × 1080" },
};

// Five grades. Each one is a sky, a wash colour laid over the photos,
// and a title ink colour, so one caption can feel like dusk or neon.
export const GRADES = {
  sunset: {
    name: "Vice Sunset",
    sky: ["#ff7a3c", "#ff9e5e", "#ffc46b", "#7a2d63"],
    wash: "rgba(255,110,60,0.20)", washMode: "overlay",
    ink: "#fff6e8", accent: "#ffd23e",
  },
  neon: {
    name: "Neon Nights",
    sky: ["#12082b", "#3d1660", "#c22a7a", "#0b0b1e"],
    wash: "rgba(255,45,150,0.22)", washMode: "overlay",
    ink: "#ffffff", accent: "#39e6ff",
  },
  ocean: {
    name: "Ocean Teal",
    sky: ["#062a3a", "#0e6b7a", "#2fb3a3", "#ff9a5c"],
    wash: "rgba(20,180,170,0.18)", washMode: "soft-light",
    ink: "#f2fffa", accent: "#ffb347",
  },
  haze: {
    name: "Heat Haze",
    sky: ["#ffb347", "#ff7e5f", "#c94b6d", "#5b2a6e"],
    wash: "rgba(255,150,60,0.24)", washMode: "overlay",
    ink: "#fff8ec", accent: "#7ef0c1",
  },
  noir: {
    name: "Vice Noir",
    sky: ["#0d0d14", "#2b1a3d", "#7a2d63", "#120a1a"],
    wash: "rgba(190,60,180,0.20)", washMode: "overlay",
    ink: "#ffe9f6", accent: "#ff5c8a",
  },
};

// Four panel layouts. Every rect is [x, y, w, h] in fractions of the
// cover, plus a tilt in degrees for the collage feel.
export const LAYOUTS = {
  hero3: {
    name: "Hero + Three",
    panels: [
      { rect: [0.03, 0.03, 0.62, 0.62], tilt: 0 },
      { rect: [0.68, 0.03, 0.29, 0.30], tilt: 0 },
      { rect: [0.68, 0.36, 0.29, 0.29], tilt: 0 },
      { rect: [0.03, 0.68, 0.94, 0.14], tilt: 0 },
    ],
  },
  grid4: {
    name: "Four Panel Grid",
    panels: [
      { rect: [0.03, 0.03, 0.455, 0.40], tilt: 0 },
      { rect: [0.515, 0.03, 0.455, 0.40], tilt: 0 },
      { rect: [0.03, 0.46, 0.455, 0.36], tilt: 0 },
      { rect: [0.515, 0.46, 0.455, 0.36], tilt: 0 },
    ],
  },
  fullbleed: {
    name: "Full Bleed",
    panels: [{ rect: [0, 0, 1, 0.86], tilt: 0 }],
  },
  strip3: {
    name: "Tilted Strip",
    panels: [
      { rect: [0.02, 0.04, 0.30, 0.78], tilt: -2 },
      { rect: [0.35, 0.04, 0.30, 0.78], tilt: 1.5 },
      { rect: [0.68, 0.04, 0.30, 0.78], tilt: -1 },
    ],
  },
};

// A tiny seeded random so the grain is identical on every export.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function skyGradient(ctx, grade, w, h) {
  const g = ctx.createLinearGradient(0, 0, w * 0.25, h);
  grade.sky.forEach((c, i) => g.addColorStop(i / (grade.sky.length - 1), c));
  return g;
}

function drawPhotoCover(ctx, img, x, y, w, h, zoom, ox, oy) {
  if (!img || !img.naturalWidth) return false;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2 + ox * w;
  const dy = y + (h - dh) / 2 + oy * h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

function drawPanelFrame(ctx, x, y, w, h, grade) {
  ctx.save();
  ctx.lineWidth = Math.max(3, w * 0.008);
  ctx.strokeStyle = "#ffffff";
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = Math.max(1, w * 0.002);
  ctx.strokeStyle = grade.accent;
  ctx.strokeRect(x + w * 0.012, y + h * 0.012, w * 0.976, h * 0.976);
  ctx.restore();
}

function fitCaption(ctx, text, maxW, startPx, fontStack) {
  let px = startPx;
  ctx.font = `900 ${px}px ${fontStack}`;
  while (px > 24 && ctx.measureText(text).width > maxW) {
    px -= 4;
    ctx.font = `900 ${px}px ${fontStack}`;
  }
  return px;
}

// The title block: huge stacked caption, a script-style subtitle,
// a ribbon badge and a five-star heat meter.
function drawTitleBlock(ctx, state, grade, w, h, zone) {
  const { x, y, w: zw, h: zh } = zone;
  const caption = (state.caption || "LEONIDA NIGHTS").toUpperCase();
  const sub = state.subtitle || "one more sunset on the coast";
  const stack = "'Arial Black', 'Archivo Black', Impact, sans-serif";
  const pad = zw * 0.03;

  ctx.save();
  ctx.textBaseline = "alphabetic";

  // Measure the ribbon badge first, then fit the caption into the
  // width that is left, so a long title never runs underneath it.
  const badge = state.badge || "LEONIDA • 2026";
  const badgePx = Math.max(14, Math.round(zh * 0.11));
  ctx.font = `800 ${badgePx}px ${stack}`;
  const bw = ctx.measureText(badge).width + badgePx * 2.4;
  const bx = x + zw - pad - bw;
  const by = y + zh * 0.06;
  const bh = badgePx * 1.9;

  const capPx = fitCaption(ctx, caption, zw - pad * 2 - bw - pad, Math.round(zh * 0.52), stack);
  ctx.font = `900 ${capPx}px ${stack}`;
  ctx.textAlign = "left";
  // Hard offset shadow, then the ink, then a thin accent underline.
  ctx.fillStyle = "rgba(20,6,20,0.85)";
  ctx.fillText(caption, x + pad + capPx * 0.06, y + zh * 0.50);
  ctx.fillStyle = grade.ink;
  ctx.fillText(caption, x + pad, y + zh * 0.46);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(x + pad, y + zh * 0.54, Math.min(zw - pad * 2, capPx * 0.5), Math.max(3, zh * 0.03));

  const subPx = Math.max(18, Math.round(zh * 0.16));
  ctx.font = `italic 700 ${subPx}px Georgia, 'Times New Roman', serif`;
  ctx.fillStyle = grade.accent;
  ctx.fillText(sub, x + pad, y + zh * 0.72);

  // Ribbon badge, top right of the title zone.
  ctx.fillStyle = grade.accent;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + bw, by);
  ctx.lineTo(bx + bw - bh * 0.4, by + bh / 2);
  ctx.lineTo(bx + bw, by + bh);
  ctx.lineTo(bx, by + bh);
  ctx.lineTo(bx + bh * 0.4, by + bh / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1c0a1c";
  ctx.textAlign = "center";
  ctx.fillText(badge, bx + bw / 2 + bh * 0.12, by + bh * 0.68);
  ctx.restore();

  // Heat meter: five small stars under the subtitle.
  const starR = Math.max(7, zh * 0.055);
  const cy = y + zh * 0.86;
  ctx.save();
  ctx.fillStyle = grade.accent;
  for (let i = 0; i < 5; i++) {
    const cx = x + pad + i * starR * 2.6 + starR;
    star(ctx, cx, cy, starR, starR * 0.45);
  }
  ctx.restore();
}

function star(ctx, cx, cy, rOuter, rInner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function grainAndVignette(ctx, w, h, seed) {
  const rnd = seeded(seed);
  ctx.save();
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 2600; i++) {
    const v = rnd() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(rnd() * w, rnd() * h, 1.6, 1.6);
  }
  ctx.restore();
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(10,0,16,0.42)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

// Renders state.photos (array of images, one per panel slot), the
// caption, subtitle, badge, layout and grade onto ctx at W x H.
export function renderCover(ctx, state, W, H) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero3;

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = skyGradient(ctx, grade, W, H);
  ctx.fillRect(0, 0, W, H);

  // Title zone sits at the bottom for the panel layouts, and over the
  // photo for full bleed, where a dark band keeps the letters legible.
  const titleH = state.layout === "fullbleed" ? H * 0.24 : H * 0.15;
  const titleZone = { x: 0, y: H - titleH, w: W, h: titleH };
  if (state.layout === "fullbleed") {
    const band = ctx.createLinearGradient(0, H - titleH * 1.6, 0, H);
    band.addColorStop(0, "rgba(10,2,18,0)");
    band.addColorStop(1, "rgba(10,2,18,0.88)");
    ctx.fillStyle = band;
    ctx.fillRect(0, H - titleH * 1.6, W, titleH * 1.6);
  }

  layout.panels.forEach((panel, i) => {
    const [fx, fy, fw, fh] = panel.rect;
    const px = fx * W;
    const py = fy * H;
    const pw = fw * W;
    const ph = fh * H;
    const photo = state.photos[i] || state.photos[0];
    const tune = (state.tunes && state.tunes[i]) || { zoom: 1, ox: 0, oy: 0 };
    ctx.save();
    if (panel.tilt) {
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate((panel.tilt * Math.PI) / 180);
      ctx.translate(-pw / 2, -ph / 2);
    } else {
      ctx.translate(px, py);
    }
    const shown = drawPhotoCover(ctx, photo, 0, 0, pw, ph, tune.zoom, tune.ox, tune.oy);
    if (!shown) {
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(0, 0, pw, ph);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = `700 ${Math.max(16, pw * 0.045)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("DROP A PHOTO HERE", pw / 2, ph / 2);
    }
    // Sunset wash over every panel so the photos share one grade.
    ctx.globalCompositeOperation = grade.washMode;
    ctx.fillStyle = grade.wash;
    ctx.fillRect(0, 0, pw, ph);
    ctx.globalCompositeOperation = "source-over";
    if (state.layout !== "fullbleed") drawPanelFrame(ctx, 0, 0, pw, ph, grade);
    ctx.restore();
  });

  drawTitleBlock(ctx, state, grade, W, H, titleZone);
  grainAndVignette(ctx, W, H, 20261119);
  ctx.restore();
}

// Builds a fresh canvas at the requested post size and renders the
// cover onto it, so export and preview share one code path.
export function makeCoverCanvas(state, sizeKey) {
  const size = SIZES[sizeKey] || SIZES.square;
  const canvas = document.createElement("canvas");
  canvas.width = size.w;
  canvas.height = size.h;
  renderCover(canvas.getContext("2d"), state, size.w, size.h);
  return canvas;
}
