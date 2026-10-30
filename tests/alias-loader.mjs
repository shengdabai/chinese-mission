// Resolve hook for `npm test` (plain Node ESM + type stripping), so the app's TypeScript can be
// imported without a bundler:
//   "@/lib/x"        → "<repo>/src/lib/x(.ts|.tsx|/index.ts)"   (mirrors tsconfig "paths")
//   "./quota-store"  → "./quota-store.ts"                        (extensionless relative imports)
//   "next/server"    → "next/server.js"                          (Next's ESM entry needs the extension)
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const CANDIDATES = [".ts", ".tsx", ".mts", "/index.ts", "/index.tsx"];

function withExtension(base) {
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const ext of CANDIDATES) {
    const candidate = base + ext;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") return nextResolve("next/server.js", context);

  if (specifier.startsWith("@/")) {
    const found = withExtension(path.join(SRC, specifier.slice(2)));
    if (!found) throw new Error(`alias-loader: cannot resolve ${specifier}`);
    return nextResolve(pathToFileURL(found).href, context);
  }

  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier) && context.parentURL?.startsWith("file:")) {
    const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    const found = withExtension(base);
    if (found) return nextResolve(pathToFileURL(found).href, context);
  }

  return nextResolve(specifier, context);
}
