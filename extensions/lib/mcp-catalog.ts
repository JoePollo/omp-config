import { sortedKeys } from "./catalog-file.ts";
import { recordInput } from "./tool-args.ts";

export type Effect = "read" | "write" | "unknown";
export type SelectorEntry = { selector: string; values: Record<string, Effect> };
export type CatalogEntry = Effect | SelectorEntry;
export type Catalog = Record<string, CatalogEntry>;
export type ToolInfo = { name: string; parameters: unknown };
export type Classification = {
  effect: Effect;
  label: string;
  selector: string | null;
  value: string | null;
  unclassified: string[];
  classifiable: boolean;
};

type Selector = { name: string; values: string[] };

export function addTool(catalog: Catalog, tool: ToolInfo): void {
  const selector = toolSelector(tool.parameters);
  const current = catalog[tool.name];
  if (selector === null) catalog[tool.name] = typeof current === "string" ? current : "unknown";
  else catalog[tool.name] = selectorEntry(current, selector);
}

export function classify(catalog: Catalog, name: string, args: Record<string, unknown>): Classification {
  const entry = Object.hasOwn(catalog, name) ? catalog[name] : "unknown";
  if (typeof entry !== "string") return classifySelector(name, entry, args);
  return { effect: entry, label: name, selector: null, value: null, unclassified: [], classifiable: entry === "unknown" };
}

export function recordEffect(catalog: Catalog, name: string, effect: "read" | "write", values: string[]): void {
  const entry = catalog[name];
  if (typeof entry !== "object") catalog[name] = effect;
  else for (const value of values) entry.values[value] = effect;
}

function classifySelector(name: string, entry: SelectorEntry, args: Record<string, unknown>): Classification {
  const argument = args[entry.selector];
  const value = typeof argument === "string" && Object.hasOwn(entry.values, argument) ? argument : null;
  const effect = value === null ? "unknown" : entry.values[value];
  const selectorValues = sortedKeys(entry.values);
  const unclassified = selectorValues.filter((candidate) => entry.values[candidate] === "unknown");
  return {
    effect,
    label: `${name} ${entry.selector}=${String(argument)}`,
    selector: entry.selector,
    value,
    unclassified,
    classifiable: effect === "unknown" && value !== null,
  };
}

function selectorEntry(current: CatalogEntry | undefined, selector: Selector): SelectorEntry {
  const known = typeof current === "object" && current.selector === selector.name ? current.values : {};
  const values: Record<string, Effect> = {};
  for (const value of selector.values) values[value] = "unknown";
  return { selector: selector.name, values: { ...values, ...known } };
}

function toolSelector(parameters: unknown): Selector | null {
  const schema = recordInput(parameters);
  const properties = recordInput(schema.properties);
  const required = Array.isArray(schema.required) ? schema.required : [];
  const selectors: Selector[] = [];
  for (const name of required) {
    const values = enumValues(properties[String(name)]);
    if (values) selectors.push({ name: String(name), values });
  }
  return selectors.length === 1 ? selectors[0] : null;
}

function enumValues(property: unknown): string[] | null {
  const schema = recordInput(property);
  if (schema.type !== "string" || !Array.isArray(schema.enum)) return null;
  const values = schema.enum.filter((value) => typeof value === "string");
  return values.length > 0 && values.length === schema.enum.length ? values : null;
}
