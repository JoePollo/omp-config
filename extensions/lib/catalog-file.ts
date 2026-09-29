import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

export type CatalogSchema<T> = { assert(value: unknown): T };

export function loadCatalog<T extends object>(path: string, schema: CatalogSchema<T>): T | string {
  if (!existsSync(path)) return schema.assert({});
  try {
    return schema.assert(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function updateCatalog<T extends object>(path: string, schema: CatalogSchema<T>, change: (catalog: T) => void): string | null {
  const catalog = loadCatalog(path, schema);
  if (typeof catalog === "string") return catalog;
  const before = serializeCatalog(catalog);
  change(catalog);
  const after = serializeCatalog(catalog);
  if (after === before) return null;
  try {
    writeFileSync(`${path}.tmp`, after);
    renameSync(`${path}.tmp`, path);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function sortedKeys(record: object): string[] {
  const keys = Object.keys(record);
  keys.sort();
  return keys;
}

function serializeCatalog(catalog: object): string {
  return `${JSON.stringify(catalog, sortObjectKeys, 2)}\n`;
}

function sortObjectKeys(_key: string, value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const sorted: Record<string, unknown> = {};
  for (const key of sortedKeys(value)) sorted[key] = (value as Record<string, unknown>)[key];
  return sorted;
}
