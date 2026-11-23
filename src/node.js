// Node-only loader: reads the registry and the catalog snapshot from disk.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function loadData() {
  const registry = JSON.parse(readFileSync(join(root, 'data', 'registry.json'), 'utf8'));
  const catalog = JSON.parse(readFileSync(join(root, 'data', 'catalog.snapshot.json'), 'utf8'));
  return { registry, catalog };
}
