import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const site = path.join(root, "site");
const failures = [];
async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(name)));
    else files.push(name);
  }
  return files;
}
const files = await walk(site);
for (const filename of files) {
  const extension = path.extname(filename);
  if (extension === ".js") {
    const result = spawnSync(process.execPath, ["--check", filename], {
      encoding: "utf8",
    });
    if (result.status) failures.push(result.stderr);
  }
  if (![".html", ".css"].includes(extension)) continue;
  const text = await readFile(filename, "utf8");
  const references =
    extension === ".html"
      ? [...text.matchAll(/(?:src|href)="([^"]+)"/g)].map((x) => x[1])
      : [...text.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map((x) => x[1]);
  for (const ref of references) {
    if (/^(https?:|data:|mailto:|tel:)/.test(ref) || ref === "#") continue;
    const [relative, hash] = ref.split("#");
    if (relative.startsWith("/")) {
      failures.push(`Root-relative URL breaks project Pages: ${ref}`);
      continue;
    }
    const destination = relative
      ? path.resolve(path.dirname(filename), decodeURIComponent(relative))
      : filename;
    try {
      await stat(destination);
      if (hash && path.extname(destination) === ".html") {
        const content =
          destination === filename ? text : await readFile(destination, "utf8");
        if (!content.includes(`id="${hash}"`))
          failures.push(`Missing anchor ${ref} in ${filename}`);
      }
    } catch {
      failures.push(`Missing asset ${ref} in ${filename}`);
    }
  }
}
const main = await readFile(path.join(site, "index.html"), "utf8");
if ((main.match(/<h1(?:\s|>)/g) ?? []).length !== 1)
  failures.push("Main page must have one h1");
if (!main.includes('lang="ru"')) failures.push("Russian language is required");
if (!main.includes("Красноярск")) failures.push("City must be present");
for (const module of ["assets/config.js", "assets/leads.js"]) {
  if (
    !(await readFile(path.join(site, module), "utf8")).includes("TODO(BACKEND)")
  )
    failures.push(`Missing integration marker in ${module}`);
}
if (failures.length) {
  process.stderr.write(failures.join("\n") + "\n");
  process.exitCode = 1;
} else
  process.stdout.write(
    `Static check passed: ${files.length} files, local resources and anchors, JS syntax, integration markers.\n`,
  );
