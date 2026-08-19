import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const releaseName = `${packageJson.name}-v${packageJson.version}-source`;
const releaseDirectory = path.join(root, "release");
const archivePath = path.join(releaseDirectory, `${releaseName}.zip`);
const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "yenomi-release-"));
const stagingDirectory = path.join(stagingRoot, releaseName);

const excludedDirectories = new Set([
  ".git", ".next", "node_modules", "coverage", "playwright-report", "release", "test-results",
]);
const excludedFiles = new Set([
  ".DS_Store", ".env", ".env.local", "tsconfig.tsbuildinfo",
]);

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name.startsWith("._")) continue;
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    if (entry.isFile() && (excludedFiles.has(entry.name) || /^\.env\..+\.local$/.test(entry.name))) continue;

    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(sourcePath, destinationPath);
    else if (entry.isFile() && !entry.name.endsWith(".tgz")) fs.copyFileSync(sourcePath, destinationPath);
  }
}

try {
  copyDirectory(root, stagingDirectory);

  const stagedFiles = [];
  function collectFiles(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) collectFiles(absolute);
      else if (entry.isFile()) stagedFiles.push(absolute);
    }
  }
  collectFiles(stagingDirectory);
  const manifest = {
    package: packageJson.name,
    version: packageJson.version,
    fileCount: stagedFiles.length,
    uncompressedBytes: stagedFiles.reduce((total, file) => total + fs.statSync(file).size, 0),
    excludedDirectories: [...excludedDirectories].sort(),
    excludedFiles: [...excludedFiles].sort(),
  };
  fs.writeFileSync(path.join(stagingDirectory, "RELEASE_MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const hygiene = spawnSync(process.execPath, [
    path.join(root, "scripts/verify-no-secrets.mjs"),
    `--root=${stagingDirectory}`,
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (hygiene.status !== 0) process.exit(hygiene.status ?? 1);

  fs.mkdirSync(releaseDirectory, { recursive: true });
  fs.rmSync(archivePath, { force: true });

  const zip = spawnSync("zip", ["-qr", archivePath, releaseName], {
    cwd: stagingRoot,
    encoding: "utf8",
  });
  if (zip.status !== 0) {
    console.error(zip.stderr || "Release archive could not be created.");
    process.exit(zip.status ?? 1);
  }

  console.log(`Safe source package created: ${archivePath}`);
} finally {
  fs.rmSync(stagingRoot, { recursive: true, force: true });
}
