import type { ArgumentsCamelCase } from "yargs";
import type { OptionsType } from "@/types";

export * from "./llmstxt";
export * from "./http-client";
export * from "./config";

export function getOptions(
  argv: ArgumentsCamelCase,
  pkg: {
    name: string;
    version: string;
  },
) {
  return {
    name: pkg.name,
    version: pkg.version,
    port: argv.port,
    ...argv, // Include all CLI arguments
  } as OptionsType;
}
