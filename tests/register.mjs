// Registers the "@/..." → "src/..." alias for node:test runs (tsconfig paths are not seen by Node).
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
