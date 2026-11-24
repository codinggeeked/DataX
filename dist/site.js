const intro = document.querySelector(".intro");
if (!intro) document.documentElement.classList.add("intro-done");
if (intro) {
  const canvas = intro.querySelector(".intro-rain");
  const ctx = canvas.getContext("2d");
  const size = 18;
  const rainTime = 3600;
  let columns = [];
  let width = 0;
  let height = 0;
  let start = 0;
  let last = 0;
  let raf = 0;
  let finished = false;

  const digit = () => String(Math.floor(Math.random() * 10));

  function setup() {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = "#020811";
    ctx.fillRect(0, 0, width, height);
    const rows = Math.ceil(height / size);
    columns = Array.from({ length: Math.ceil(width / size) }, () => ({
      up: Math.random() < .35,
      pos: -Math.random() * rows,
      speed: .35 + Math.random() * .65,
    }));
  }

  function draw(time) {
    if (!start) start = time;
    const elapsed = time - start;
    if (time - last >= 33) {
      last = time;
      ctx.fillStyle = "rgba(2, 8, 17, .14)";
      ctx.fillRect(0, 0, width, height);
      ctx.font = `bold ${size - 2}px monospace`;
      const rows = Math.ceil(height / size);
      columns.forEach((column, index) => {
        column.pos += column.speed;
        if (column.pos > rows + 4 && Math.random() > .96) column.pos = -Math.random() * 8;
        const row = column.up ? rows - column.pos : column.pos;
        const x = index * size;
        const y = row * size;
        ctx.fillStyle = "#43e5ec";
        ctx.fillText(digit(), x, column.up ? y + size : y - size);
        ctx.fillStyle = "#eaffff";
        ctx.fillText(digit(), x, y);
      });
    }
    if (elapsed > 1500) intro.classList.add("reveal");
    if (elapsed > rainTime) return finish();
    raf = window.requestAnimationFrame(draw);
  }

  function finish() {
    if (finished) return;
    finished = true;
    window.cancelAnimationFrame(raf);
    intro.classList.add("done");
    document.documentElement.classList.add("intro-done");
    intro.classList.remove("playing");
    window.removeEventListener("keydown", finish);
    window.removeEventListener("resize", setup);
    window.setTimeout(() => intro.remove(), 800);
  }

  if (ctx && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    intro.classList.add("playing");
    setup();
    window.addEventListener("resize", setup);
    window.addEventListener("keydown", finish);
    intro.addEventListener("click", finish);
    raf = window.requestAnimationFrame(draw);
  } else {
    intro.remove();
    document.documentElement.classList.add("intro-done");
  }
}

const menu = document.querySelector(".menu");
const navigation = document.querySelector("#navigation");
const desktop = window.matchMedia("(min-width: 64rem)");

function setMenu(open) {
  menu.setAttribute("aria-expanded", String(open));
  navigation.classList.toggle("open", open);
}

menu.closest(".nav").classList.add("menu-enabled");
menu.hidden = false;
menu.addEventListener("click", () => setMenu(menu.getAttribute("aria-expanded") === "false"));
navigation.addEventListener("click", event => {
  const link = event.target.closest("a");
  if (!link || desktop.matches) return;

  setMenu(false);
  const target = document.getElementById(link.hash.slice(1));
  if (target) {
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }
});
desktop.addEventListener("change", () => {
  if (!desktop.matches && navigation.contains(document.activeElement)) menu.focus();
  setMenu(false);
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menu.focus();
  }
});

const dayButtons = [...document.querySelectorAll("[data-day]")];

function showDay(day) {
  dayButtons.forEach(button => {
    const selected = button.dataset.day === day;
    button.setAttribute("aria-pressed", String(selected));
    document.getElementById(button.getAttribute("aria-controls")).hidden = !selected;
  });
}

function showDayFromHash() {
  if (location.hash === "#day-one") showDay("one");
  if (location.hash === "#day-two") showDay("two");
}

showDay(location.hash === "#day-two" ? "two" : "one");
document.querySelector(".tabs").hidden = false;
window.addEventListener("hashchange", showDayFromHash);
dayButtons.forEach(button => button.addEventListener("click", () => showDay(button.dataset.day)));
document.querySelectorAll("[data-show-day]").forEach(link => {
  link.addEventListener("click", () => {
    showDay(link.dataset.showDay);
    const target = document.getElementById(link.hash.slice(1));
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  });
});

/* ===== Programme: live "happening now" view ===== */
const nowBar = document.querySelector(".now-bar");
if (nowBar) {
  const params = new URLSearchParams(location.search);
  const eventDays = { "2027-03-30": "one", "2027-03-31": "two" };
  const dayNames = { one: "Day 1", two: "Day 2" };
  const toMinutes = value => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const gaborone = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Gaborone", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const sessionsFor = day => [...document.querySelectorAll(`#day-${day} details[data-start]`)];
  const titleOf = session => session.querySelector(".slot-title").textContent;
  const field = name => nowBar.querySelector(`[data-now="${name}"]`);
  const progress = nowBar.querySelector(".now-progress span");
  let firstRender = true;

  // Real event days use the real date; any other day is shown as an event-day preview.
  // ?day=one|two and ?time=HH:MM override the clock for testing.
  function eventClock() {
    const parts = Object.fromEntries(gaborone.formatToParts(new Date()).map(part => [part.type, part.value]));
    const realDay = eventDays[`${parts.year}-${parts.month}-${parts.day}`];
    const forcedDay = ["one", "two"].includes(params.get("day")) ? params.get("day") : null;
    const forcedTime = /^\d{1,2}:\d{2}$/.test(params.get("time") || "") ? params.get("time") : null;
    const time = (forcedTime || `${parts.hour}:${parts.minute}`).padStart(5, "0");
    return { day: forcedDay || realDay || "one", time, minutes: toMinutes(time), preview: !realDay || Boolean(forcedDay || forcedTime) };
  }

  function mark(session, kind, text) {
    session.classList.add(`is-${kind}`);
    const tag = document.createElement("span");
    tag.className = `status ${kind}`;
    tag.textContent = text;
    session.querySelector("summary").append(tag);
  }

  function renderLive() {
    const { day, time, minutes, preview } = eventClock();
    for (const session of [...sessionsFor("one"), ...sessionsFor("two")]) {
      session.classList.remove("is-past", "is-now", "is-next");
      session.querySelectorAll(".status").forEach(tag => tag.remove());
    }
    const sessions = sessionsFor(day);
    const current = sessions.find(session => minutes >= toMinutes(session.dataset.start) && minutes < toMinutes(session.dataset.end));
    const next = sessions.find(session => toMinutes(session.dataset.start) > minutes);
    sessions.forEach(session => session.classList.toggle("is-past", toMinutes(session.dataset.end) <= minutes));
    if (current) mark(current, "now", "Now");
    if (next) mark(next, "next", "Next");

    dayButtons.forEach(button => button.classList.toggle("live", button.dataset.day === day));
    nowBar.classList.toggle("closed", !current);
    field("day").textContent = dayNames[day];
    field("clock").textContent = time;
    nowBar.querySelector(".now-note").hidden = !preview;

    let share = 0;
    if (current) {
      const start = toMinutes(current.dataset.start);
      share = (minutes - start) / (toMinutes(current.dataset.end) - start);
      field("state").textContent = "Happening now";
      field("title").textContent = titleOf(current);
      field("next").textContent = next ? `Up next at ${next.dataset.start}: ${titleOf(next)}` : "Last session of the day";
    } else if (next) {
      const opening = next === sessions[0];
      field("state").textContent = opening ? "Opening soon" : "Up next";
      field("title").textContent = opening ? `Doors open at ${next.dataset.start}` : titleOf(next);
      field("next").textContent = `First up at ${next.dataset.start}: ${titleOf(next)}`;
    } else {
      share = 1;
      field("state").textContent = "Day closed";
      field("title").textContent = day === "one" ? "That’s a wrap for Day 1" : "That’s a wrap for DataX 2027";
      field("next").textContent = day === "one"
        ? `Day 2 opens at ${sessionsFor("two")[0].dataset.start} on 31 March`
        : "Thank you for joining us in Gaborone.";
    }
    progress.style.setProperty("--p", `${Math.round(share * 100)}%`);

    if (firstRender) {
      const focus = current || next || sessions[0];
      sessions.forEach(session => { session.open = session === focus; });
      firstRender = false;
    }
    return day;
  }

  const liveDay = renderLive();
  if (location.hash !== "#day-one" && location.hash !== "#day-two") showDay(liveDay);
  nowBar.hidden = false;
  window.setInterval(renderLive, 30000);
}

const eventStart = Date.parse("2027-03-30T00:00:00+02:00");
const clock = document.querySelector(".clock");
const clockValues = [...clock.querySelectorAll("[data-clock]")];

function updateCountdown() {
  let remaining = Math.max(0, Math.ceil((eventStart - Date.now()) / 1000));
  const ended = remaining === 0;
  for (const [index, unit] of [86400, 3600, 60, 1].entries()) {
    const value = String(Math.floor(remaining / unit)).padStart(2, "0");
    if (clockValues[index].textContent !== value) clockValues[index].textContent = value;
    remaining %= unit;
  }
  clock.hidden = ended;
  document.querySelector(".countdown-ended").hidden = !ended;
  return ended;
}

if (!updateCountdown()) {
  const timer = window.setInterval(() => {
    if (updateCountdown()) window.clearInterval(timer);
  }, 1000);
}

const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
const field = document.querySelector(".binary-field");
const context = field.getContext("2d");
if (context) {
  const step = 20;
  const digit = () => String(Math.floor(Math.random() * 10));
  let width = 0;
  let height = 0;
  let lastFrame = 0;
  let active = true;
  let request = 0;
  let streams = [];

  function paint(time) {
    context.clearRect(0, 0, width, height);
    context.font = "bold 16px monospace";
    for (const [column, stream] of streams.entries()) {
      const length = stream.digits.length;
      const cycle = height + step * length;
      const head = (stream.offset + time * stream.speed) % cycle;
      for (let index = 0; index < length; index++) {
        if (time && Math.random() < .04) stream.digits[index] = digit();
        const y = head - index * step;
        if (y < 0 || y > height + step) continue;
        if (index === 0) {
          context.globalAlpha = .95;
          context.fillStyle = "#eaffff";
        } else {
          context.globalAlpha = .75 * (1 - index / length) ** 1.4;
          context.fillStyle = "#43e5ec";
        }
        context.fillText(stream.digits[index], column * step + 3, y);
      }
    }
    context.globalAlpha = 1;
  }

  function frame(time) {
    if (time - lastFrame >= 42) {
      paint(time);
      lastFrame = time;
    }
    request = window.requestAnimationFrame(frame);
  }

  function syncMotion() {
    window.cancelAnimationFrame(request);
    if (!active || document.hidden) {
      paint(0);
      return;
    }
    request = window.requestAnimationFrame(frame);
  }

  const resize = new ResizeObserver(() => {
    width = field.clientWidth;
    height = field.clientHeight;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    field.width = Math.round(width * scale);
    field.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    streams = Array.from({ length: Math.ceil(width / step) }, () => {
      const length = 10 + Math.floor(Math.random() * 18);
      return {
        offset: Math.random() * (height + step * length),
        speed: .06 + Math.random() * .12,
        digits: Array.from({ length }, digit),
      };
    });
    paint(0);
  });
  resize.observe(field);
  const visibility = new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    syncMotion();
  });
  visibility.observe(field);
  document.addEventListener("visibilitychange", syncMotion);
}

const reveal = new IntersectionObserver(entries => {
  for (const entry of entries) {
    entry.target.classList.toggle("section-enter", entry.isIntersecting);
  }
}, { threshold: .1 });
document.querySelectorAll("main > section[data-enter]").forEach(section => reveal.observe(section));

const topLink = document.querySelector(".back-top");
const topVisibility = new IntersectionObserver(([entry]) => {
  topLink.hidden = entry.isIntersecting;
});
topVisibility.observe(document.querySelector("header"));

const notice = document.querySelector(".cookie-notice");
const cookieLink = document.querySelector(".cookie-link");
const dismiss = document.querySelector(".cookie-dismiss");
const preference = "datax-cookie-notice-v1";
let dismissed = false;
try {
  dismissed = localStorage.getItem(preference) === "dismissed";
} catch {
  // The notice still works if storage is unavailable.
}
notice.hidden = dismissed;
cookieLink.hidden = false;
cookieLink.addEventListener("click", () => {
  notice.hidden = false;
  dismiss.focus();
});
dismiss.addEventListener("click", () => {
  notice.hidden = true;
  try {
    localStorage.setItem(preference, "dismissed");
  } catch {
    // Dismissal still applies to this page view.
  }
  cookieLink.focus({ preventScroll: true });
});

const experience = document.querySelector("#experience");
if (experience) {
  const title = experience.querySelector("h2");
  const text = title.textContent;
  const glyphs = "0123456789ABCDEFX#$%&@";
  let decoding = 0;
  title.setAttribute("aria-label", text);

  function decode() {
    window.cancelAnimationFrame(decoding);
    const start = performance.now();
    const tick = now => {
      const progress = Math.min((now - start) / 1200, 1);
      const shown = Math.floor(progress * text.length);
      title.textContent = [...text].map((char, index) =>
        index < shown || char === " " ? char : glyphs[Math.floor(Math.random() * glyphs.length)]).join("");
      if (progress < 1) decoding = window.requestAnimationFrame(tick);
    };
    decoding = window.requestAnimationFrame(tick);
  }

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) decode();
  }, { threshold: .1 }).observe(experience);

  for (const card of experience.querySelectorAll("article")) {
    card.addEventListener("pointermove", event => {
      const box = card.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      card.style.setProperty("--rx", `${(.5 - y) * 14}deg`);
      card.style.setProperty("--ry", `${(x - .5) * 18}deg`);
      card.style.setProperty("--mx", `${x * 100}%`);
      card.style.setProperty("--my", `${y * 100}%`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    });
  }
}

const about = document.querySelector("#about");
if (about) {
  const heading = about.querySelector("h2");
  const words = heading.textContent.trim().split(/\s+/);
  heading.setAttribute("aria-label", words.join(" "));
  heading.innerHTML = words.map((word, index) =>
    `<span class="w${index >= words.length - 2 ? " hl" : ""}" aria-hidden="true">${word}</span>`).join(" ");
  heading.querySelectorAll(".w").forEach((word, index) => word.style.setProperty("--w", index));

  const figure = about.querySelector("figure");
  const holo = about.querySelector(".holo");
  figure.addEventListener("pointermove", event => {
    const box = holo.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    holo.style.setProperty("--rx", `${(.5 - y) * 12}deg`);
    holo.style.setProperty("--ry", `${(x - .5) * 16}deg`);
    holo.style.setProperty("--mx", `${x * 100}%`);
    holo.style.setProperty("--my", `${y * 100}%`);
  });
  figure.addEventListener("pointerleave", () => {
    holo.style.setProperty("--rx", "0deg");
    holo.style.setProperty("--ry", "0deg");
  });

  const net = about.querySelector(".about-net");
  const ink = net.getContext("2d");
  if (ink) {
    const reach = 125;
    let width = 0;
    let height = 0;
    let nodes = [];
    let packets = [];
    let pointer = null;
    let loop = 0;

    const resizeNet = new ResizeObserver(() => {
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      width = net.clientWidth;
      height = net.clientHeight;
      net.width = Math.round(width * scale);
      net.height = Math.round(height * scale);
      ink.setTransform(scale, 0, 0, scale, 0, 0);
      const count = Math.round(Math.min(120, width * height / 11000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - .5) * .6,
        vy: (Math.random() - .5) * .6,
        r: 1 + Math.random() * 1.8,
        hot: Math.random() < .12,
      }));
      packets = [];
    });
    resizeNet.observe(net);

    function drawNet() {
      ink.clearRect(0, 0, width, height);
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      }
      ink.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const distance = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (distance > reach) continue;
          ink.strokeStyle = `rgba(67, 229, 236, ${(1 - distance / reach) * .3})`;
          ink.beginPath();
          ink.moveTo(nodes[i].x, nodes[i].y);
          ink.lineTo(nodes[j].x, nodes[j].y);
          ink.stroke();
        }
        if (pointer) {
          const distance = Math.hypot(nodes[i].x - pointer.x, nodes[i].y - pointer.y);
          if (distance < 190) {
            ink.strokeStyle = `rgba(255, 104, 27, ${(1 - distance / 190) * .7})`;
            ink.beginPath();
            ink.moveTo(nodes[i].x, nodes[i].y);
            ink.lineTo(pointer.x, pointer.y);
            ink.stroke();
          }
        }
      }
      if (nodes.length > 1 && Math.random() < .12) {
        const from = nodes[Math.floor(Math.random() * nodes.length)];
        let to = null;
        let best = reach;
        for (const node of nodes) {
          const distance = Math.hypot(node.x - from.x, node.y - from.y);
          if (node !== from && distance < best) { best = distance; to = node; }
        }
        if (to) packets.push({ from, to, t: 0 });
      }
      packets = packets.filter(packet => (packet.t += .025) < 1);
      ink.fillStyle = "#eaffff";
      ink.shadowColor = "#43e5ec";
      ink.shadowBlur = 10;
      for (const { from, to, t } of packets) {
        ink.beginPath();
        ink.arc(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, 2.2, 0, Math.PI * 2);
        ink.fill();
      }
      for (const node of nodes) {
        ink.fillStyle = node.hot ? "#ff681b" : "#43e5ec";
        ink.shadowColor = ink.fillStyle;
        ink.beginPath();
        ink.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ink.fill();
      }
      ink.shadowBlur = 0;
      loop = window.requestAnimationFrame(drawNet);
    }

    about.addEventListener("pointermove", event => {
      const box = net.getBoundingClientRect();
      pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
    });
    about.addEventListener("pointerleave", () => { pointer = null; });

    let netVisible = false;
    function syncNet() {
      window.cancelAnimationFrame(loop);
      if (netVisible && !document.hidden) loop = window.requestAnimationFrame(drawNet);
    }
    new IntersectionObserver(([entry]) => {
      netVisible = entry.isIntersecting;
      syncNet();
    }).observe(about);
    document.addEventListener("visibilitychange", syncNet);
  }
}

/* ===== Site-wide motion helpers ===== */
const finePointer = window.matchMedia("(pointer: fine)");
const glyphSet = "0123456789ABCDEFX#$%&@";

function scrambleText(element, duration = 700, lockWidth = false) {
  const text = element.dataset.text || (element.dataset.text = element.textContent);
  window.cancelAnimationFrame(Number(element.dataset.scramble || 0));
  if (lockWidth) element.style.width = `${element.getBoundingClientRect().width}px`;
  const start = performance.now();
  const tick = now => {
    const progress = Math.min((now - start) / duration, 1);
    const shown = Math.floor(progress * text.length);
    element.textContent = [...text].map((char, index) =>
      index < shown || char === " " ? char : glyphSet[Math.floor(Math.random() * glyphSet.length)]).join("");
    if (progress < 1) {
      element.dataset.scramble = String(window.requestAnimationFrame(tick));
    } else {
      element.textContent = text;
      element.style.width = "";
    }
  };
  element.dataset.scramble = String(window.requestAnimationFrame(tick));
}

function splitWords(heading, { highlight = [], wave = [] } = {}) {
  const words = heading.textContent.trim().split(/\s+/);
  heading.setAttribute("aria-label", words.join(" "));
  heading.classList.add("fx-split");
  heading.innerHTML = words.map((word, index) => {
    const classes = ["w", highlight.includes(index) && "fx-hl", wave.includes(index) && "fx-wave"].filter(Boolean).join(" ");
    const inner = wave.includes(index)
      ? [...word].map(letter => `<span class="l">${letter}</span>`).join("")
      : word;
    return `<span class="${classes}" aria-hidden="true">${inner}</span>`;
  }).join(" ");
  heading.querySelectorAll(".w").forEach((word, index) => word.style.setProperty("--w", index));
  heading.querySelectorAll(".l").forEach((letter, index) => letter.style.setProperty("--l", index));
}

function onEnter(element, callback, threshold = .15) {
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) callback();
  }, { threshold }).observe(element);
}

function countUp(element, duration = 1400) {
  const text = element.dataset.text || (element.dataset.text = element.textContent);
  const start = performance.now();
  const tick = now => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    element.textContent = text.replace(/\d[\d,]*/g, match => {
      const value = Math.round(Number(match.replaceAll(",", "")) * eased);
      return match.includes(",") ? value.toLocaleString("en-US") : String(value);
    });
    if (progress < 1) window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
}

function addTilt(element, tiltX = 12, tiltY = 16) {
  element.addEventListener("pointermove", event => {
    const box = element.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    element.style.setProperty("--rx", `${(.5 - y) * tiltX}deg`);
    element.style.setProperty("--ry", `${(x - .5) * tiltY}deg`);
  });
  element.addEventListener("pointerleave", () => {
    element.style.setProperty("--rx", "0deg");
    element.style.setProperty("--ry", "0deg");
  });
}

function runWhileVisible(element, frame) {
  let request = 0;
  let visible = false;
  const loop = time => {
    frame(time);
    request = window.requestAnimationFrame(loop);
  };
  const sync = () => {
    window.cancelAnimationFrame(request);
    if (visible && !document.hidden) request = window.requestAnimationFrame(loop);
  };
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(element);
  document.addEventListener("visibilitychange", sync);
}

/* ===== Nav: sticky glass bar, progress, scrollspy, scramble ===== */
const siteHeader = document.querySelector("header#top");
const contactStrip = siteHeader.querySelector(".contact-strip");
const scrollBar = siteHeader.querySelector(".scroll-progress");
new ResizeObserver(() => siteHeader.style.setProperty("--strip", `${contactStrip.offsetHeight}px`)).observe(contactStrip);

let scrollQueued = false;
function updateScroll() {
  scrollQueued = false;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollBar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  siteHeader.classList.toggle("scrolled", window.scrollY > contactStrip.offsetHeight + 10);
}
window.addEventListener("scroll", () => {
  if (scrollQueued) return;
  scrollQueued = true;
  window.requestAnimationFrame(updateScroll);
}, { passive: true });
updateScroll();

const spyLinks = [...navigation.querySelectorAll(':scope > a[href^="#"]:not(.button)')];
spyLinks.forEach(link => link.addEventListener("pointerenter", () => scrambleText(link, 450, true)));
const spy = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    spyLinks.forEach(link => link.classList.toggle("active", link.hash === `#${entry.target.id}`));
  }
}, { rootMargin: "-45% 0px -50% 0px" });
spyLinks.forEach(link => {
  const section = document.querySelector(link.hash);
  if (section) spy.observe(section);
});
spy.observe(document.querySelector(".hero"));

/* ===== Buttons: magnetic pull + click ripple ===== */
document.querySelectorAll(".button").forEach(button => {
  if (finePointer.matches) {
    button.addEventListener("pointermove", event => {
      const box = button.getBoundingClientRect();
      button.style.setProperty("--tx", `${(event.clientX - box.left - box.width / 2) * .25}px`);
      button.style.setProperty("--ty", `${(event.clientY - box.top - box.height / 2) * .35}px`);
    });
    button.addEventListener("pointerleave", () => {
      button.style.setProperty("--tx", "0px");
      button.style.setProperty("--ty", "0px");
    });
  }
  button.addEventListener("click", event => {
    const box = button.getBoundingClientRect();
    const size = Math.max(box.width, box.height) * 2;
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - box.left - size / 2}px;top:${event.clientY - box.top - size / 2}px`;
    button.append(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  });
});

/* ===== Cursor ring ===== */
if (finePointer.matches) {
  const ring = document.createElement("div");
  const dot = document.createElement("div");
  ring.className = "cursor-ring";
  dot.className = "cursor-dot";
  ring.setAttribute("aria-hidden", "true");
  dot.setAttribute("aria-hidden", "true");
  document.body.append(ring, dot);
  let targetX = -100;
  let targetY = -100;
  let ringX = -100;
  let ringY = -100;
  let following = false;
  const follow = () => {
    ringX += (targetX - ringX) * .2;
    ringY += (targetY - ringY) * .2;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
    if (Math.abs(targetX - ringX) + Math.abs(targetY - ringY) > .4) window.requestAnimationFrame(follow);
    else following = false;
  };
  window.addEventListener("pointermove", event => {
    targetX = event.clientX;
    targetY = event.clientY;
    dot.style.transform = `translate(${targetX}px, ${targetY}px)`;
    ring.classList.add("on");
    dot.classList.add("on");
    ring.classList.toggle("hover", Boolean(event.target.closest?.("a, button, summary, .chips li")));
    if (!following) {
      following = true;
      window.requestAnimationFrame(follow);
    }
  });
  document.documentElement.addEventListener("mouseleave", () => {
    ring.classList.remove("on");
    dot.classList.remove("on");
  });
}

/* ===== Programme ===== */
const programme = document.querySelector("#programme");
if (programme) {
  splitWords(programme.querySelector("h2"), { highlight: [3] });
  programme.querySelector(".eyebrow").classList.add("eyebrow-caret");
}

/* ===== Investment: rising particles + self-drawing growth chart ===== */
const investment = document.querySelector("#investment");
if (investment) {
  splitWords(investment.querySelector("h2"), { wave: [2, 3] });
  const metric = investment.querySelector(".metric strong");
  onEnter(investment, () => countUp(metric, 1600));

  const canvas = investment.querySelector(".invest-fx");
  const paint = canvas.getContext("2d");
  if (paint) {
    let width = 0;
    let height = 0;
    let motes = [];
    let chart = [];
    let chartStart = 0;
    const mote = anywhere => ({
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : height + 10,
      speed: .3 + Math.random(),
      r: .8 + Math.random() * 2.2,
      hot: Math.random() < .25,
    });
    const buildChart = () => {
      const steps = Math.max(8, Math.round(width / 60));
      let y = height * .88;
      chart = Array.from({ length: steps + 1 }, (_, index) => {
        if (index) y -= height * .55 / steps + (Math.random() - .42) * height * .14;
        y = Math.max(height * .12, Math.min(height * .95, y));
        return { x: index / steps * width, y };
      });
    };
    new ResizeObserver(() => {
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      paint.setTransform(scale, 0, 0, scale, 0, 0);
      motes = Array.from({ length: Math.round(width / 16) }, () => mote(true));
      buildChart();
      chartStart = 0;
    }).observe(canvas);

    runWhileVisible(investment, time => {
      paint.clearRect(0, 0, width, height);
      if (!chartStart || time - chartStart > 7000) {
        chartStart = time;
        buildChart();
      }
      const elapsed = (time - chartStart) / 1000;
      const drawn = Math.min(elapsed / 3.5, 1) * (chart.length - 1);
      const fade = elapsed > 5.5 ? Math.max(0, 1 - (elapsed - 5.5) / 1.2) : 1;
      const whole = Math.floor(drawn);
      const points = chart.slice(0, whole + 1);
      if (whole < chart.length - 1) {
        const a = chart[whole];
        const b = chart[whole + 1];
        const part = drawn - whole;
        points.push({ x: a.x + (b.x - a.x) * part, y: a.y + (b.y - a.y) * part });
      }
      if (points.length > 1) {
        const fill = paint.createLinearGradient(0, height * .1, 0, height);
        fill.addColorStop(0, `rgba(67, 229, 236, ${.16 * fade})`);
        fill.addColorStop(1, "rgba(67, 229, 236, 0)");
        paint.beginPath();
        points.forEach((point, index) => index ? paint.lineTo(point.x, point.y) : paint.moveTo(point.x, point.y));
        paint.lineTo(points.at(-1).x, height);
        paint.lineTo(points[0].x, height);
        paint.closePath();
        paint.fillStyle = fill;
        paint.fill();
        paint.beginPath();
        points.forEach((point, index) => index ? paint.lineTo(point.x, point.y) : paint.moveTo(point.x, point.y));
        paint.strokeStyle = `rgba(67, 229, 236, ${.6 * fade})`;
        paint.lineWidth = 2.5;
        paint.shadowColor = "#43e5ec";
        paint.shadowBlur = 14;
        paint.stroke();
        const head = points.at(-1);
        paint.fillStyle = `rgba(255, 255, 255, ${fade})`;
        paint.beginPath();
        paint.arc(head.x, head.y, 4.5, 0, Math.PI * 2);
        paint.fill();
        paint.shadowBlur = 0;
      }
      for (const particle of motes) {
        particle.y -= particle.speed;
        particle.x += Math.sin(time / 900 + particle.y / 60) * .3;
        if (particle.y < -10) Object.assign(particle, mote(false));
        const life = Math.min(1, particle.y / height + .2);
        paint.fillStyle = particle.hot ? `rgba(255, 104, 27, ${.7 * life})` : `rgba(67, 229, 236, ${.6 * life})`;
        paint.beginPath();
        paint.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        paint.fill();
      }
    });
  }
}

/* ===== Partnerships ===== */
const partnerships = document.querySelector("#partnerships");
if (partnerships) {
  partnerships.querySelector(".eyebrow").classList.add("eyebrow-caret");

  // Partner slider: one logo per step, loops forever, pauses on hover/focus.
  // Auto-advance is off for reduced motion; the arrows always work.
  const slider = partnerships.querySelector(".logo-slider");
  const track = slider.querySelector(".logo-track");
  const originals = [...track.children];
  const count = originals.length;
  originals.forEach(logo => {
    const copy = logo.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    track.append(copy);
  });
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let index = 0;
  let paused = false;
  let moving = false;

  const step = () => {
    const [first, second] = track.children;
    return second.getBoundingClientRect().left - first.getBoundingClientRect().left;
  };
  function place(animate) {
    track.classList.toggle("animate", animate);
    track.style.transform = `translateX(${-index * step()}px)`;
  }
  function go(delta) {
    if (moving) return;
    if (delta < 0 && index === 0) {
      index = count;
      place(false);
      void track.offsetWidth;
    }
    index += delta;
    moving = true;
    place(true);
    // Fallback in case transitionend never fires (e.g. transform did not change).
    window.setTimeout(settle, 900);
  }
  function settle() {
    if (!moving) return;
    moving = false;
    if (index >= count) {
      index -= count;
      place(false);
    }
  }
  track.addEventListener("transitionend", event => {
    if (event.target === track) settle();
  });

  slider.querySelector(".prev").addEventListener("click", () => go(-1));
  slider.querySelector(".next").addEventListener("click", () => go(1));
  slider.addEventListener("pointerenter", () => { paused = true; });
  slider.addEventListener("pointerleave", () => { paused = false; });
  slider.addEventListener("focusin", () => { paused = true; });
  slider.addEventListener("focusout", () => { paused = false; });
  new ResizeObserver(() => place(false)).observe(slider);

  slider.querySelectorAll(".slider-arrow").forEach(arrow => { arrow.hidden = false; });
  slider.classList.add("ready");
  place(false);
  window.setInterval(() => {
    if (!paused && !document.hidden && !reduceMotion.matches) go(1);
  }, 2600);
}

/* ===== Speakers ===== */
const speakers = document.querySelector("#speakers");
if (speakers) {
  speakers.querySelector(".eyebrow").classList.add("eyebrow-caret");
  speakers.querySelectorAll(".speaker").forEach((card, index) => {
    card.style.setProperty("--i", index);
    addTilt(card, 6, 8);
  });
}

/* ===== Account: register / log in ===== */
const account = document.querySelector(".account");
if (account) {
  const toggle = account.querySelector(".account-toggle");
  const label = account.querySelector(".account-label");
  const panel = account.querySelector(".account-menu");
  const guestItems = panel.querySelector(".guest-items");
  const memberItems = panel.querySelector(".member-items");
  const dialogs = { register: document.querySelector("#register-dialog"), login: document.querySelector("#login-dialog") };
  const memberKey = "datax-member-v1";
  let member = null;
  try {
    const saved = JSON.parse(localStorage.getItem(memberKey));
    if (saved && typeof saved.name === "string" && typeof saved.email === "string") member = saved;
  } catch {
    // Signed-out view if storage is unavailable or unreadable.
  }

  function setPanel(open) {
    toggle.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
  }

  function renderMember() {
    label.textContent = member ? `Hi, ${member.name}` : "Join DataX";
    guestItems.hidden = Boolean(member);
    memberItems.hidden = !member;
    memberItems.querySelector(".member-email").textContent = member ? member.email : "";
  }

  function saveMember(next) {
    member = next;
    try {
      if (next) localStorage.setItem(memberKey, JSON.stringify(next));
      else localStorage.removeItem(memberKey);
    } catch {
      // Sign-in still applies to this page view.
    }
    renderMember();
  }

  function openDialog(name) {
    setPanel(false);
    Object.values(dialogs).forEach(dialog => { if (dialog.open) dialog.close(); });
    const dialog = dialogs[name];
    dialog.querySelector("form").hidden = false;
    dialog.querySelector(".modal-done").hidden = true;
    dialog.querySelector(".form-error").hidden = true;
    dialog.showModal();
  }

  function fieldName(input) {
    return input.closest("label")?.firstChild?.textContent.trim() || "This field";
  }

  function validate(form) {
    const error = form.querySelector(".form-error");
    form.querySelectorAll("[aria-invalid]").forEach(input => input.removeAttribute("aria-invalid"));
    let problem = [...form.elements].find(input => input.willValidate && !input.checkValidity());
    let message = "";
    if (problem) {
      message = problem.type === "checkbox"
        ? "Please agree to be contacted so we can confirm your place."
        : `${fieldName(problem)}: ${problem.validationMessage}`;
    } else if (form.elements.days && ![...form.querySelectorAll('[name="days"]')].some(box => box.checked)) {
      problem = form.querySelector('[name="days"]');
      message = "Choose at least one day to attend.";
    }
    if (!problem) {
      error.hidden = true;
      return true;
    }
    error.textContent = message;
    error.hidden = false;
    problem.setAttribute("aria-invalid", "true");
    problem.focus();
    return false;
  }

  function showDone(dialog, values) {
    for (const [key, value] of Object.entries(values)) dialog.querySelector(`[data-done="${key}"]`).textContent = value;
    dialog.querySelector("form").hidden = true;
    const done = dialog.querySelector(".modal-done");
    done.hidden = false;
    done.querySelector(".button").focus();
  }

  const registerForm = dialogs.register.querySelector("form");
  registerForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!validate(registerForm)) return;
    const data = new FormData(registerForm);
    const name = data.get("first").trim();
    const days = data.getAll("days");
    const ref = `DX27-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    saveMember({ name, email: data.get("email").trim(), role: data.get("role"), days, ref });
    showDone(dialogs.register, { name, days: days.join(" and "), ref });
    registerForm.reset();
  });

  const loginForm = dialogs.login.querySelector("form");
  loginForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!validate(loginForm)) return;
    const email = loginForm.elements.email.value.trim();
    const local = email.split("@")[0].split(/[._+-]/)[0] || "there";
    const name = member && member.email.toLowerCase() === email.toLowerCase()
      ? member.name
      : local.charAt(0).toUpperCase() + local.slice(1, 18);
    saveMember({ ...(member?.email.toLowerCase() === email.toLowerCase() ? member : {}), name, email });
    showDone(dialogs.login, { name });
    loginForm.reset();
  });

  toggle.addEventListener("click", () => setPanel(panel.hidden));
  document.addEventListener("click", event => {
    if (!account.contains(event.target)) setPanel(false);
  });
  account.addEventListener("keydown", event => {
    if (event.key !== "Escape" || panel.hidden) return;
    event.stopPropagation();
    setPanel(false);
    toggle.focus();
  });
  document.querySelectorAll("[data-open]").forEach(button => {
    button.addEventListener("click", () => openDialog(button.dataset.open));
  });
  memberItems.querySelector("a").addEventListener("click", () => setPanel(false));
  memberItems.querySelector("[data-signout]").addEventListener("click", () => {
    saveMember(null);
    setPanel(false);
    toggle.focus();
  });
  for (const dialog of Object.values(dialogs)) {
    dialog.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => dialog.close()));
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
  }
  renderMember();
}

/* ===== Contact ===== */
const contactPanel = document.querySelector(".contact-panel");
if (contactPanel) {
  const contactTitle = contactPanel.querySelector("h2");
  onEnter(contactPanel, () => scrambleText(contactTitle, 900));
  addTilt(contactPanel.querySelector(".contact-card"), 5, 7);
}

/* ===== Footer ===== */
const siteFooter = document.querySelector(".site-footer");
new IntersectionObserver(([entry]) => {
  siteFooter.classList.toggle("foot-in", entry.isIntersecting);
}, { threshold: .15 }).observe(siteFooter);
