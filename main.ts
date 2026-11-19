// Leonida Nights Cover Press — the entry program (Node 22, stdlib only).
//
// What it does, in plain terms: it gathers the app I built (app/),
// the screenshots I took (screenshots/), and hands both to the
// make.fun dossier builder so the grader can check and judge them.
// It runs the same way twice and writes the same bytes both times.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

// The folder this file lives in is the repository root.
const repoRoot = fileURLToPath(new URL(".", import.meta.url));

// The grader gives us /output; a local run uses MAKEFUN_OUTPUT_DIR.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// Start from an empty output folder so a stale file from an earlier
// run can never sneak into the entry.
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

// The whole app, exactly as built, and the screenshots I took of it.
cpSync(join(repoRoot, "app"), join(outputDir, "app"), { recursive: true });
mkdirSync(join(outputDir, "screenshots"), { recursive: true });
if (existsSync(join(repoRoot, "screenshots"))) {
  cpSync(join(repoRoot, "screenshots"), join(outputDir, "screenshots"), {
    recursive: true,
  });
}

// The dossier is the judge's view of the entry: the app's source plus
// the screenshots, written by the kit's own library. The limits below
// are the scorer's caps from the competition rules (reference/gate.json).
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, "dossier.json"), dossier);
