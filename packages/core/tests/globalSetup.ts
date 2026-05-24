import { rmSync } from "node:fs";
import path from "node:path";

const TMP_DIR = path.join(import.meta.dirname, "..", "fixtures", ".tmp");

export default function setup(): void {
  rmSync(TMP_DIR, { recursive: true, force: true });
}
