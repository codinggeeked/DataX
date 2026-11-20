import { copyFile, readFile, writeFile } from "node:fs/promises";
import { faArrowUp, faEnvelope, faBars, faChartSimple, faCube, faHandshake } from "@fortawesome/free-solid-svg-icons";

import { faLinkedinIn, faWhatsapp } from "@fortawesome/free-brands-svg-icons";

const icons = {
  up: faArrowUp,
  envelope: faEnvelope,
  linkedin: faLinkedinIn,
  whatsapp: faWhatsapp,
  bars: faBars,
  chart: faChartSimple,
  cube: faCube,
  handshake: faHandshake,
};

function renderIcon(name) {
  const definition = icons[name];
  if (!definition) throw new Error(`Unknown Font Awesome icon: ${name}`);

  const [width, height, , , pathData] = definition.icon;
  const paths = [pathData].flat().map(path => `<path d="${path}"></path>`).join("");
  return `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">${paths}</svg>`;
}

const template = await readFile("src/index.html", "utf8");
const page = template.replaceAll(/\{\{icon:([a-z]+)\}\}/g, (_, name) => renderIcon(name));

await Promise.all([
  writeFile("dist/index.html", page),
  copyFile("node_modules/@fortawesome/free-brands-svg-icons/LICENSE.txt", "dist/fontawesome-brands-LICENSE.txt"),
  copyFile("src/site.js", "dist/site.js"),
  copyFile("node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2", "dist/nunito.woff2"),
  copyFile("node_modules/@fontsource-variable/nunito/LICENSE", "dist/nunito-LICENSE.txt"),
  copyFile("node_modules/@fortawesome/free-solid-svg-icons/LICENSE.txt", "dist/fontawesome-LICENSE.txt"),
]);
