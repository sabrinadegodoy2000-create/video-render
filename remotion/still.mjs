/**
 * Renderiza UM frame (PNG) de uma composição.
 *   node still.mjs --composition F1Broadcast --output out.png --frame 1340 --props props.json
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const get = (k, d) => {
  const i = args.indexOf(k);
  return i !== -1 ? args[i + 1] : d;
};

const compositionId = get("--composition", "F1Broadcast");
const output = path.resolve(get("--output", "still.png"));
const frame = parseInt(get("--frame", "0"), 10);
const propsFile = get("--props", null);

const inputProps = propsFile ? JSON.parse(fs.readFileSync(propsFile, "utf-8")) : {};

async function main() {
  console.log("[STILL] Empacotando bundle...");
  const serveUrl = await bundle({ entryPoint: path.resolve(__dirname, "src/index.ts"), webpackOverride: (c) => c });

  console.log(`[STILL] Selecionando composição "${compositionId}"...`);
  const composition = await selectComposition({ serveUrl, id: compositionId, inputProps });

  console.log(`[STILL] Renderizando frame ${frame}...`);
  await renderStill({
    composition,
    serveUrl,
    output,
    frame,
    inputProps,
    chromiumOptions: { args: ["--no-sandbox", "--disable-setuid-sandbox"] },
  });
  console.log(`[STILL] Pronto → ${output}`);
}

main().catch((e) => {
  console.error("[STILL] Erro:", e);
  process.exit(1);
});
