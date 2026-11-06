// Writes public/pal.svg (static: stage "sprout", mood "idle") from the Pal React component.
//   npx tsx --tsconfig scripts/tsconfig.scripts.json scripts/export-pal-svg.ts
import { writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PAL_LABEL, Pal } from "../components/pal/Pal";

const markup = renderToStaticMarkup(createElement(Pal, { mood: "idle", stage: "sprout", size: 256, animated: false }))
  // Standalone file: add the SVG namespace and an accessible title; drop runtime-only attributes.
  .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ')
  .replace(/ data-(mood|animated)="[^"]*"/g, "")
  .replace(/ class="[^"]*"/, "")
  .replace(/(<svg[^>]*>)/, `$1<title>${PAL_LABEL}</title>`);

writeFileSync("public/pal.svg", `${markup}\n`);
console.log(`Wrote public/pal.svg (${markup.length} bytes)`);
