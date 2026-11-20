const menu = document.querySelector(".menu");
const navigation = document.querySelector("#navigation");
const desktop = window.matchMedia("(min-width: 52rem)");

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
  const step = 26;
  let width = 0;
  let height = 0;
  let lastFrame = 0;
  let active = true;
  let request = 0;
  let streams = [];

  function paint(time) {
    context.clearRect(0, 0, width, height);
    context.font = "15px monospace";
    context.fillStyle = "#43e5ec";
    for (const [column, stream] of streams.entries()) {
      const cycle = height + step * stream.bits.length;
      const head = (stream.offset + time * stream.speed) % cycle;
      for (const [index, bit] of stream.bits.entries()) {
        const y = head - index * step;
        if (y < 0 || y > height) continue;
        context.globalAlpha = .36 * (1 - index / stream.bits.length);
        context.fillText(bit, column * step + 4, y);
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
    if (motion.matches || !active || document.hidden) {
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
    streams = Array.from({ length: Math.ceil(width / step) }, () => ({
      offset: Math.random() * (height + step * 12),
      speed: .025 + Math.random() * .055,
      bits: Array.from({ length: 12 }, () => Math.random() < .5 ? "0" : "1"),
    }));
    paint(0);
  });
  resize.observe(field);
  const visibility = new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    syncMotion();
  });
  visibility.observe(field);
  motion.addEventListener("change", syncMotion);
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
