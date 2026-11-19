// Leonida Nights Cover Press — editor wiring.
// Owns the page state (photos, caption, layout, grade, size, and the
// per-panel crop), keeps the preview canvas live, and exports the PNG.
// Photos are read with FileReader on this machine and never uploaded.

import { SIZES, GRADES, LAYOUTS, renderCover, makeCoverCanvas } from "./cover.js";

const SAMPLE_FILES = ["samples/boulevard.jpg", "samples/rooftop.jpg", "samples/neonstreet.jpg", "samples/pier.jpg"];

const state = {
  caption: "LEONIDA NIGHTS",
  subtitle: "one more sunset on the coast",
  badge: "LEONIDA • 2026",
  layout: "hero3",
  grade: "sunset",
  size: "square",
  photos: [null, null, null, null],
  tunes: [
    { zoom: 1, ox: 0, oy: 0 },
    { zoom: 1, ox: 0, oy: 0 },
    { zoom: 1, ox: 0, oy: 0 },
    { zoom: 1, ox: 0, oy: 0 },
  ],
  selected: 0,
};

const $ = (id) => document.getElementById(id);
const preview = $("preview");
const statusEl = $("status");

function say(msg) {
  statusEl.textContent = msg;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamples() {
  for (let i = 0; i < SAMPLE_FILES.length; i++) {
    try {
      state.photos[i] = await loadImage(SAMPLE_FILES[i]);
    } catch (e) {
      // A missing sample is not fatal: the panel shows its placeholder.
    }
  }
  drawPreview();
}

function drawPreview() {
  const size = SIZES[state.size];
  preview.width = size.w;
  preview.height = size.h;
  renderCover(preview.getContext("2d"), state, size.w, size.h);
  document.querySelectorAll("#panelList button").forEach((b, i) => {
    b.classList.toggle("active", i === state.selected);
    b.textContent = `Panel ${i + 1}${state.photos[i] ? " • photo" : " • empty"}`;
  });
}

function readLocalFile(file, slot) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    loadImage(reader.result)
      .then((img) => {
        state.photos[slot] = img;
        state.tunes[slot] = { zoom: 1, ox: 0, oy: 0 };
        drawPreview();
        say(`Panel ${slot + 1} photo loaded — drag it to position, then export.`);
      })
      .catch(() => say("That file could not be read as a photo."));
  };
  reader.readAsDataURL(file);
}

function buildButtons(containerId, entries, current, onPick) {
  const box = $(containerId);
  box.innerHTML = "";
  Object.entries(entries).forEach(([key, def]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = def.name || def.label;
    b.className = key === current ? "chip active" : "chip";
    b.addEventListener("click", () => {
      onPick(key);
      buildButtons(containerId, entries, key, onPick);
      drawPreview();
    });
    box.appendChild(b);
  });
}

function refreshTuneControls() {
  const t = state.tunes[state.selected];
  $("zoom").value = t.zoom;
  $("panX").value = t.ox * 100;
  $("panY").value = t.oy * 100;
  $("zoomVal").textContent = `${Math.round(t.zoom * 100)}%`;
  $("panVal").textContent = `${Math.round(t.ox * 100)}, ${Math.round(t.oy * 100)}`;
}

function wireControls() {
  $("caption").addEventListener("input", (e) => {
    state.caption = e.target.value;
    drawPreview();
  });
  $("subtitle").addEventListener("input", (e) => {
    state.subtitle = e.target.value;
    drawPreview();
  });
  $("badge").addEventListener("input", (e) => {
    state.badge = e.target.value;
    drawPreview();
  });

  buildButtons("layoutRow", LAYOUTS, state.layout, (k) => {
    state.layout = k;
    say(`Layout: ${LAYOUTS[k].name}.`);
  });
  buildButtons("gradeRow", GRADES, state.grade, (k) => {
    state.grade = k;
    say(`Grade: ${GRADES[k].name}.`);
  });
  buildButtons("sizeRow", SIZES, state.size, (k) => {
    state.size = k;
    say(`Export size: ${SIZES[k].label}.`);
  });

  // One file picker per panel slot, plus a "same photo everywhere" shortcut.
  const pickers = $("pickers");
  for (let i = 0; i < 4; i++) {
    const label = document.createElement("label");
    label.className = "picker";
    label.textContent = `Panel ${i + 1} photo `;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", (e) => readLocalFile(e.target.files[0], i));
    label.appendChild(input);
    pickers.appendChild(label);
  }
  $("fillAll").addEventListener("click", () => {
    const first = state.photos.find(Boolean);
    if (!first) return say("Load a photo into any panel first.");
    state.photos = [first, first, first, first];
    drawPreview();
    say("One photo now fills every panel.");
  });
  $("shuffle").addEventListener("click", () => {
    state.photos.push(state.photos.shift());
    state.tunes.push(state.tunes.shift());
    drawPreview();
    say("Photos rotated across the panels.");
  });

  // Panel picker + crop sliders for the selected panel.
  const panelList = $("panelList");
  for (let i = 0; i < 4; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.addEventListener("click", () => {
      state.selected = i;
      refreshTuneControls();
      drawPreview();
    });
    panelList.appendChild(b);
  }
  $("zoom").addEventListener("input", (e) => {
    state.tunes[state.selected].zoom = Number(e.target.value);
    refreshTuneControls();
    drawPreview();
  });
  $("panX").addEventListener("input", (e) => {
    state.tunes[state.selected].ox = Number(e.target.value) / 100;
    refreshTuneControls();
    drawPreview();
  });
  $("panY").addEventListener("input", (e) => {
    state.tunes[state.selected].oy = Number(e.target.value) / 100;
    refreshTuneControls();
    drawPreview();
  });

  // Drag on the preview to pan the selected panel's photo.
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  preview.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    preview.setPointerCapture(e.pointerId);
  });
  preview.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const rect = preview.getBoundingClientRect();
    const t = state.tunes[state.selected];
    t.ox += (e.clientX - lastX) / rect.width;
    t.oy += (e.clientY - lastY) / rect.height;
    lastX = e.clientX;
    lastY = e.clientY;
    refreshTuneControls();
    drawPreview();
  });
  preview.addEventListener("pointerup", () => {
    dragging = false;
  });

  $("exportBtn").addEventListener("click", exportCover);
  $("resetBtn").addEventListener("click", () => {
    state.tunes = state.tunes.map(() => ({ zoom: 1, ox: 0, oy: 0 }));
    refreshTuneControls();
    drawPreview();
    say("Crop reset on every panel.");
  });
}

function exportCover() {
  const size = SIZES[state.size];
  const canvas = makeCoverCanvas(state, state.size);
  say(`Exporting ${size.label} PNG…`);
  canvas.toBlob((blob) => {
    if (!blob) return say("Export failed in this browser — try again.");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leonida-nights-${state.size}-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    say(`Exported ${size.label} PNG (${Math.round(blob.size / 1024)} KB). Share it anywhere.`);
  }, "image/png");
}

// Shot mode: ?shot=cover draws one cover full-frame for a screenshot,
// ?shot=editor is the normal editor. ?probe=1 exports once and writes
// the PNG byte count into the page, so the export path can be checked.
function shotMode() {
  const q = new URLSearchParams(location.search);
  if (q.get("shot") === "cover") {
    document.body.classList.add("shot-cover");
    const sizeKey = q.get("size") || state.size;
    const size = SIZES[sizeKey] || SIZES.square;
    preview.width = size.w;
    preview.height = size.h;
    preview.style.width = "100vw";
    preview.style.height = "100vh";
    renderCover(preview.getContext("2d"), state, size.w, size.h);
    if (q.get("probe") === "1") {
      const canvas = makeCoverCanvas(state, sizeKey);
      canvas.toBlob((blob) => {
        const el = document.createElement("p");
        el.id = "probe";
        el.textContent = `probe png bytes ${blob ? blob.size : 0} size ${size.w}x${size.h}`;
        document.body.appendChild(el);
      }, "image/png");
    }
    return true;
  }
  return false;
}

wireControls();
refreshTuneControls();
loadSamples().then(() => {
  if (shotMode()) return;
  drawPreview();
  say("Samples loaded. Add your own photos, pick a layout and grade, export.");
});
