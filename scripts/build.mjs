import { createHash } from "node:crypto";
import { copyFile, cp, readFile, writeFile } from "node:fs/promises";
import { faArrowUp, faEnvelope, faBars, faChartSimple, faCube, faHandshake, faChevronDown, faChevronLeft, faChevronRight,faXmark, faUser, faUserPlus, faCircleCheck, faArrowRightFromBracket, faClock } from "@fortawesome/free-solid-svg-icons";

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
  chevron: faChevronDown,
  close: faXmark,
  user: faUser,
  userplus: faUserPlus,
  check: faCircleCheck,
  signout: faArrowRightFromBracket,
  clock: faClock,
  left: faChevronLeft,
  right: faChevronRight,
};

function renderIcon(name) {
  const definition = icons[name];
  if (!definition) throw new Error(`Unknown Font Awesome icon: ${name}`);

  const [width, height, , , pathData] = definition.icon;
  const paths = [pathData].flat().map(path => `<path d="${path}"></path>`).join("");
  return `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">${paths}</svg>`;
}

// Runs after Tailwind has written dist/style.css, so the hashes match what is served.
// Versioned URLs stop browsers pairing new HTML with a cached old stylesheet or script.
const version = async path => createHash("sha256").update(await readFile(path)).digest("hex").slice(0, 10);
const [styleVersion, scriptVersion] = await Promise.all([version("dist/style.css"), version("src/site.js")]);

const template = await readFile("src/index.html", "utf8");
const page = template
  .replaceAll(/\{\{icon:([a-z]+)\}\}/g, (_, name) => renderIcon(name))
  .replace('href="style.css"', `href="style.css?v=${styleVersion}"`)
  .replace('src="site.js"', `src="site.js?v=${scriptVersion}"`);

await Promise.all([
  writeFile("dist/index.html", page),
  cp("src/speakers", "dist/speakers", { recursive: true }),
  cp("src/partners", "dist/partners", { recursive: true }),
  copyFile("src/favicon.svg", "dist/favicon.svg"),
  copyFile("node_modules/@fortawesome/free-brands-svg-icons/LICENSE.txt", "dist/fontawesome-brands-LICENSE.txt"),
  copyFile("src/site.js", "dist/site.js"),
  copyFile("node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2", "dist/nunito.woff2"),
  copyFile("node_modules/@fontsource-variable/nunito/LICENSE", "dist/nunito-LICENSE.txt"),
  copyFile("node_modules/@fortawesome/free-solid-svg-icons/LICENSE.txt", "dist/fontawesome-LICENSE.txt"),
]);
