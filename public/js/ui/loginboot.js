// @ts-check

let _played = false;
let _sequence = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const appendLine = (terminal, className = "") => {
  const row = document.createElement("div");
  row.className = `boot-line ${className}`.trim();
  terminal.appendChild(row);
  return row;
};

const typeLine = async (terminal, text, opts = {}) => {
  const row = appendLine(terminal, opts.className || "");
  const speed = opts.speed ?? 18;
  for (let i = 0; i <= text.length; i++) {
    row.textContent = text.slice(0, i);
    await sleep(speed);
  }
  await sleep(opts.pause ?? 110);
};

const finishBoot = (screen) => {
  screen.classList.remove("booting", "boot-white", "boot-welcome", "boot-reveal");
  screen.classList.add("boot-complete");
};

export const startLoginBoot = async ({ reduced = false } = {}) => {
  const screen = document.getElementById("loginScreen");
  const terminal = document.getElementById("loginBootTerminal");
  if (!screen || !terminal) return;

  if (_played) {
    finishBoot(screen);
    return;
  }

  _played = true;
  const seq = ++_sequence;
  terminal.textContent = "";
  screen.classList.remove("boot-complete", "boot-white", "boot-welcome", "boot-reveal");
  screen.classList.add("booting");

  const lines = [
    "Initializing core systems...",
    "Verifying AES-256 encryption...",
    "Network latency: 12ms",
    "App Check channel: report-only",
    "Status: Secure",
  ];

  if (reduced) {
    lines.forEach((line) => { appendLine(terminal).textContent = line; });
    appendLine(terminal, "secure").textContent = "[ SECURE CONNECTION ESTABLISHED ]";
    await sleep(520);
    if (seq !== _sequence) return;
    screen.classList.add("boot-white", "boot-welcome");
    await sleep(920);
    if (seq === _sequence) finishBoot(screen);
    return;
  }

  for (const line of lines) {
    if (seq !== _sequence) return;
    await typeLine(terminal, line);
  }
  if (seq !== _sequence) return;
  await typeLine(terminal, "[ SECURE CONNECTION ESTABLISHED ]", { className: "secure", speed: 8, pause: 260 });

  screen.classList.add("boot-white");
  await sleep(320);
  if (seq !== _sequence) return;
  screen.classList.add("boot-welcome");
  await sleep(1700);
  if (seq !== _sequence) return;
  screen.classList.add("boot-reveal");
  await sleep(920);
  if (seq !== _sequence) return;
  finishBoot(screen);
};

export const stopLoginBoot = () => {
  _sequence += 1;
  const screen = document.getElementById("loginScreen");
  if (screen) finishBoot(screen);
};
