import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { EvidenceMetrics, EvidencePeriod } from "./core.js";

const execFileAsync = promisify(execFile);

export interface ParsedLinkedInWorkbook {
  sourceFilename: string;
  sourceBytes: Uint8Array;
  period: EvidencePeriod | null;
  metrics: EvidenceMetrics;
  sheetNames: string[];
}

export async function parseLinkedInWorkbook(workbookPath: string): Promise<ParsedLinkedInWorkbook> {
  const absolutePath = resolve(workbookPath);
  const parserPath = resolve(dirname(fileURLToPath(import.meta.url)), "xlsx_parser.py");
  const [{ stdout }, sourceBytes] = await Promise.all([
    execFileAsync("python3", [parserPath, absolutePath], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
    }),
    readFile(absolutePath),
  ]);

  const parsed = JSON.parse(stdout) as Omit<ParsedLinkedInWorkbook, "sourceBytes">;
  return {
    ...parsed,
    sourceFilename: parsed.sourceFilename || basename(absolutePath),
    sourceBytes,
  };
}
