import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();

export function isForbiddenShareEntry(entry) {
  const normalized = String(entry || "").replaceAll("\\", "/");
  const base = path.posix.basename(normalized);
  if (base === ".env.example") return false;
  if (base === ".env" || base.startsWith(".env.")) return true;
  if (/(^|\/)\.vercel(\/|$)/.test(normalized)) return true;
  if (/(^|\/)node_modules\//.test(normalized)) return true;
  if (/(^|\/)\.next\//.test(normalized)) return true;
  return false;
}

function listingOf(archivePath) {
  return execFileSync("unzip", ["-Z1", archivePath], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
}

export function inspectShareArchive(archivePath, { quiet = false } = {}) {
  if (!fs.existsSync(archivePath)) {
    if (!quiet) console.error(`Archive bulunamadı: ${archivePath}`);
    return { ok: false, leaked: [`missing:${archivePath}`] };
  }
  const listing = listingOf(archivePath);
  const leaked = listing.filter((name) => isForbiddenShareEntry(name));
  if (leaked.length) {
    if (!quiet) {
      console.error(`Pre-share BAŞARISIZ: ${path.relative(root, archivePath)} yasak girdi içeriyor:`);
      for (const name of leaked.slice(0, 20)) console.error(`- ${name}`);
    }
    return { ok: false, leaked };
  }
  if (!quiet) {
    console.log(`Pre-share OK: ${path.relative(root, archivePath)} (${listing.length} girdi)`);
  }
  return { ok: true, leaked: [] };
}

export function runShareArchiveSelfTest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "yenomi-preshare-"));
  try {
    const dirtyDir = path.join(tmp, "dirty");
    const cleanDir = path.join(tmp, "clean");
    fs.mkdirSync(dirtyDir);
    fs.mkdirSync(cleanDir);
    fs.writeFileSync(path.join(dirtyDir, ".env.local"), "VERCEL_OIDC_TOKEN=must-not-ship\n");
    fs.writeFileSync(path.join(dirtyDir, "README.md"), "ok\n");
    fs.writeFileSync(path.join(cleanDir, ".env.example"), "FOO=\n");
    fs.writeFileSync(path.join(cleanDir, "README.md"), "ok\n");
    const dirtyZip = path.join(tmp, "dirty.zip");
    const cleanZip = path.join(tmp, "clean.zip");
    execFileSync("zip", ["-qr", dirtyZip, "."], { cwd: dirtyDir });
    execFileSync("zip", ["-qr", cleanZip, "."], { cwd: cleanDir });
    const dirty = inspectShareArchive(dirtyZip, { quiet: true });
    const clean = inspectShareArchive(cleanZip, { quiet: true });
    if (dirty.ok) throw new Error("self-test: .env.local içeren zip geçmemeli");
    if (!dirty.leaked.some((name) => name.endsWith(".env.local"))) {
      throw new Error("self-test: .env.local kaçağı tespit edilmedi");
    }
    if (!clean.ok) throw new Error("self-test: .env.example içeren temiz zip geçmeli");
    console.log("Pre-share self-test PASS.");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function main(argv) {
  const selfTest = argv.includes("--self-test") || argv.filter((value) => !value.startsWith("--")).length === 0;
  const requireArchive = argv.includes("--require-archive");
  const archives = argv.filter((value) => !value.startsWith("--"));

  if (selfTest) runShareArchiveSelfTest();

  const toCheck = [...archives];
  if (toCheck.length === 0 && !selfTest) {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    toCheck.push(path.join(root, "release", `${pkg.name}-v${pkg.version}-source.zip`));
  }

  let failed = false;
  for (const archive of toCheck) {
    const result = inspectShareArchive(path.resolve(archive));
    if (!result.ok) failed = true;
  }
  if (requireArchive && toCheck.length === 0) {
    console.error("Pre-share BAŞARISIZ: --require-archive verildi ama zip yolu yok.");
    failed = true;
  }
  if (failed) process.exit(1);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) main(process.argv.slice(2));
