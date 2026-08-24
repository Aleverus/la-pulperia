import { mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const mapsDirectory = join(root, "public", "maps");
const finalPath = join(mapsDirectory, "siguatepeque.pmtiles");
const nextPath = join(mapsDirectory, "siguatepeque.next.pmtiles");
const source =
  process.env.PULPERIA_PMTILES_SOURCE_URL ??
  "https://data.source.coop/protomaps/openstreetmap/v4.pmtiles";

mkdirSync(mapsDirectory, { recursive: true });
rmSync(nextPath, { force: true });

const mount = `${root.replaceAll("\\", "/")}:/data`;
const result = spawnSync(
  "docker",
  [
    "run",
    "--rm",
    "-v",
    mount,
    "protomaps/go-pmtiles",
    "extract",
    source,
    "/data/public/maps/siguatepeque.next.pmtiles",
    "--bbox=-87.95,14.50,-87.70,14.72",
    "--maxzoom=15",
  ],
  { stdio: "inherit", shell: false },
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

rmSync(finalPath, { force: true });
renameSync(nextPath, finalPath);
console.log(`Mapa regional listo: ${finalPath}`);
