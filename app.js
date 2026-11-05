const $ = (id) => document.getElementById(id);

const STORE = {
  notes: "nexus-notes-v1",
  events: "nexus-events-v1",
  brightness: "nexus-brightness-v1",
  sound: "nexus-sound-v1"
};

let soundOn = localStorage.getItem(STORE.sound) !== "false";
let volume = 0.25;
let currentNoteId = null;
let selectedDate = new Date();
selectedDate.setHours(0, 0, 0, 0);

let calendarMonth = new Date(
  selectedDate.getFullYear(),
  selectedDate.getMonth(),
  1
);

let calcInput = "";
let toastTimer;

// NOTIFICATIONS
function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 2400);
}

// SOUND EFFECTS
function sound(freq = 620, duration = 0.045) {
  if (!soundOn || volume <= 0) return;

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = volume * 0.045;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + duration
    );

    osc.stop(ctx.currentTime + duration);
    osc.onended = () => ctx.close();
  } catch {}
}

// DIGITAL CLOCK
function tickClock() {
  const now = new Date();

  $("topClock").textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  $("heroClock").textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  $("taskClock").textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  $("fullDate").textContent = now.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  $("dateChip").textContent = now.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).toUpperCase();
}

tickClock();
setInterval(tickClock, 1000);

// PAGE NAVIGATION
function go(page) {
  document.querySelectorAll(".page").forEach(p => {
    p.classList.toggle("active", p.id === page);
  });

  document.querySelectorAll(".nav-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.target === page);
  });

  sound(520);

  if (page === "calendar") renderCalendar();
  if (page === "notes") renderNotesList();
}

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", () => go(button.dataset.target));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => go(button.dataset.go));
});

// BRIGHTNESS CONTROL
// This adjusts the application interface, not physical monitor brightness.

function setBrightness(value) {
  const v = Number(value);

  document.documentElement.style.setProperty(
    "--brightness",
    String(v / 100)
  );

  $("brightness").value = v;
  $("brightness2").value = v;

  localStorage.setItem(STORE.brightness, String(v));
}

const savedBrightness = Number(
  localStorage.getItem(STORE.brightness) || 100
);

setBrightness(Math.min(115, Math.max(45, savedBrightness)));

$("brightness").addEventListener("input", e => {
  setBrightness(e.target.value);
});

$("brightness2").addEventListener("input", e => {
  setBrightness(e.target.value);
});

// VOLUME CONTROL
$("volume").addEventListener("input", e => {
  volume = Number(e.target.value) / 100;
  sound(700);
});

// SOUND SETTINGS
$("soundToggle").addEventListener("click", () => {
  soundOn = !soundOn;

  localStorage.setItem(STORE.sound, String(soundOn));

  $("soundEnabled").checked = soundOn;
  $("soundToggle").textContent = soundOn ? "♫" : "♪";

  toast(soundOn ? "Sound enabled" : "Sound muted");
});

$("soundEnabled").addEventListener("change", e => {
  soundOn = e.target.checked;

  localStorage.setItem(STORE.sound, String(soundOn));

  $("soundToggle").textContent = soundOn ? "♫" : "♪";
});

$("settingsToggle").addEventListener("click", () => {
  $("settingsPanel").classList.toggle("hidden");
});

$("closeSettings").addEventListener("click", () => {
  $("settingsPanel").classList.add("hidden");
});

$("soundEnabled").checked = soundOn;
$("soundToggle").textContent = soundOn ? "♫" : "♪";

// CALCULATOR
// Uses a restricted arithmetic parser instead of eval().

function calculate(expression) {
  const tokens = expression
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replaceAll("−", "-")
    .match(/\d+(?:\.\d+)?|[()+\-*/]/g);

  if (
    !tokens ||
    tokens.join("") !== expression
      .replaceAll("×", "*")
      .replaceAll("÷", "/")
      .replaceAll("−", "-")
      .replace(/\s/g, "")
  ) {
    throw new Error("Invalid expression");
  }

  let i = 0;

  function factor() {
    const t = tokens[i++];

    if (t === "+") return factor();
    if (t === "-") return -factor();

    if (t === "(") {
      const v = expr();

      if (tokens[i++] !== ")") {
        throw new Error("Missing )");
      }

      return v;
    }

    const n = Number(t);

    if (!Number.isFinite(n)) {
      throw new Error("Invalid number");
    }

    return n;
  }

  function term() {
    let v = factor();

    while (tokens[i] === "*" || tokens[i] === "/") {
      const op = tokens[i++];
      const r = factor();

      v = op === "*" ? v * r : v / r;
    }

    return v;
  }

  function expr() {
    let v = term();

    while (tokens[i] === "+" || tokens[i] === "-") {
      const op = tokens[i++];
      const r = term();

      v = op === "+" ? v + r : v - r;
    }

    return v;
  }

  const result = expr();

  if (i !== tokens.length || !Number.isFinite(result)) {
    throw new Error("Math error");
  }

  return Number(result.toPrecision(12));
}

function updateCalc() {
  $("calcExpression").textContent = calcInput;
}

function calcKey(key) {
  sound(key === "=" ? 850 : 570);

  if (key === "AC") {
    calcInput = "";
    $("calcResult").textContent = "0";
  } else if (key === "DEL") {
    calcInput = calcInput.slice(0, -1);
  } else if (key === "=") {
    try {
      const result = calculate(calcInput);

      $("calcResult").textContent = String(result);
      calcInput = String(result);
    } catch {
      $("calcResult").textContent = "ERROR";
    }
  } else if (/^[0-9.+\-×÷()]$/.test(key)) {
    calcInput += key;
  }

  updateCalc();
}

$("calcKeys").addEventListener("click", e => {
  const button = e.target.closest("button[data-key]");

  if (button) {
    calcKey(button.dataset.key);
  }
});

document.addEventListener("keydown", e => {
  if (!$("calculator").classList.contains("active")) return;

  if (/^[0-9.+\-()]$/.test(e.key)) {
    calcKey(e.key);
  } else if (e.key === "*") {
    calcKey("×");
  } else if (e.key === "/") {
    calcKey("÷");
  } else if (e.key === "Enter") {
    calcKey("=");
  } else if (e.key === "Backspace") {
    calcKey("DEL");
  }
});

// NOTES
function getNotes() {
  try {
    return JSON.parse(localStorage.getItem(STORE.notes) || "[]");
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(STORE.notes, JSON.stringify(notes));
}

function renderNotesList() {
  const query = $("noteSearch").value.toLowerCase();

  const notes = getNotes().filter(n =>
    (n.title + " " + n.body).toLowerCase().includes(query)
  );

  $("notesList").innerHTML = "";

  notes.sort((a, b) => b.updated - a.updated).forEach(n => {
    const row = document.createElement("button");

    row.className =
      "note-row" + (n.id === currentNoteId ? " active" : "");

    const title = document.createElement("strong");
    title.textContent = n.title || "Untitled note";

    const meta = document.createElement("small");
    meta.textContent = new Date(n.updated).toLocaleString();

    row.append(title, meta);

    row.addEventListener("click", () => openNote(n.id));

    $("notesList").append(row);
  });

  if (!notes.length) {
    $("notesList").innerHTML =
      '<p class="muted">No notes yet. Select + NEW to begin.</p>';
  }
}

function openNote(id) {
  const n = getNotes().find(x => x.id === id);

  if (!n) return;

  currentNoteId = id;

  $("noteTitle").value = n.title;
  $("noteBody").value = n.body;

  $("noteMeta").textContent =
    "Last edited " + new Date(n.updated).toLocaleString();

  $("saveStatus").textContent = "Saved locally";

  renderNotesList();
}

function createNote() {
  const n = {
    id: crypto.randomUUID(),
    title: "",
    body: "",
    updated: Date.now()
  };

  const notes = getNotes();

  notes.unshift(n);
  saveNotes(notes);
  openNote(n.id);

  $("noteTitle").focus();

  renderNotesList();
}

function saveCurrentNote() {
  if (!currentNoteId) return;

  const notes = getNotes();
  const n = notes.find(x => x.id === currentNoteId);

  if (!n) return;

  n.title = $("noteTitle").value;
  n.body = $("noteBody").value;
  n.updated = Date.now();

  saveNotes(notes);

  $("noteMeta").textContent =
    "Last edited " + new Date(n.updated).toLocaleString();

  $("saveStatus").textContent = "All changes saved";

  renderNotesList();
}

let noteSaveTimer;

function scheduleNoteSave() {
  $("saveStatus").textContent = "Saving…";

  clearTimeout(noteSaveTimer);

  noteSaveTimer = setTimeout(saveCurrentNote, 250);
}

$("newNote").addEventListener("click", createNote);

$("noteTitle").addEventListener("input", scheduleNoteSave);
$("noteBody").addEventListener("input", scheduleNoteSave);
$("noteSearch").addEventListener("input", renderNotesList);

$("deleteNote").addEventListener("click", () => {
  if (!currentNoteId) return;

  saveNotes(
    getNotes().filter(n => n.id !== currentNoteId)
  );

  currentNoteId = null;

  $("noteTitle").value = "";
  $("noteBody").value = "";

  $("noteMeta").textContent =
    "Select a note or create a new one";

  renderNotesList();

  toast("Note deleted");
});

renderNotesList();

if (getNotes().length) {
  openNote(getNotes()[0].id);
}

// CALENDAR
// Navigation is limited to 2026–2036.

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORE.events) || "{}");
  } catch {
    return {};
  }
}

function saveEvents(events) {
  localStorage.setItem(STORE.events, JSON.stringify(events));
}

function renderCalendar() {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();

  $("monthLabel").textContent = calendarMonth.toLocaleDateString([], {
    month: "long",
    year: "numeric"
  });

  $("calendarGrid").innerHTML = "";

  ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].forEach(day => {
    const el = document.createElement("div");

    el.className = "day-name";
    el.textContent = day;

    $("calendarGrid").append(el);
  });

  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());

  const events = getEvents();
  const today = dateKey(new Date());

  for (let i = 0; i < 42; i++) {
    const d = new Date(start);

    d.setDate(start.getDate() + i);

    const key = dateKey(d);

    const cell = document.createElement("button");

    cell.className =
      "day-cell" +
      (d.getMonth() !== month ? " muted-day" : "") +
      (key === dateKey(selectedDate) ? " selected" : "") +
      (key === today ? " today" : "");

    cell.textContent = d.getDate();

    if (events[key]?.length) {
      const dot = document.createElement("i");
      dot.className = "event-dot";
      cell.append(dot);
    }

    cell.addEventListener("click", () => {
      selectedDate = d;
      renderCalendar();
      renderEvents();
    });

    $("calendarGrid").append(cell);
  }

  $("selectedDateLabel").textContent =
    selectedDate.toLocaleDateString([], {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric"
    }).toUpperCase();
}

function renderEvents() {
  const list = getEvents()[dateKey(selectedDate)] || [];

  $("eventsList").innerHTML = "";

  if (!list.length) {
    $("eventsList").innerHTML =
      '<p class="muted">No events for this date.</p>';
  }

  list.forEach((ev, index) => {
    const row = document.createElement("div");
    row.className = "event-row";

    const title = document.createElement("span");
    title.textContent = ev;

    const del = document.createElement("button");
    del.textContent = "REMOVE";

    del.addEventListener("click", () => {
      const all = getEvents();

      all[dateKey(selectedDate)].splice(index, 1);

      if (!all[dateKey(selectedDate)].length) {
        delete all[dateKey(selectedDate)];
      }

      saveEvents(all);

      renderCalendar();
      renderEvents();
    });

    row.append(title, del);

    $("eventsList").append(row);
  });
}

$("prevMonth").addEventListener("click", () => {
  const d = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() - 1,
    1
  );

  if (d.getFullYear() >= 2026) {
    calendarMonth = d;
    renderCalendar();
  }
});

$("nextMonth").addEventListener("click", () => {
  const d = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    1
  );

  if (d.getFullYear() <= 2036) {
    calendarMonth = d;
    renderCalendar();
  }
});

$("todayBtn").addEventListener("click", () => {
  selectedDate = new Date();
  selectedDate.setHours(0, 0, 0, 0);

  calendarMonth = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1
  );

  renderCalendar();
  renderEvents();
});

$("addEvent").addEventListener("click", () => {
  const title = $("eventTitle").value.trim();

  if (!title) {
    return toast("Enter an event name first");
  }

  const all = getEvents();
  const key = dateKey(selectedDate);

  all[key] ??= [];
  all[key].push(title);

  saveEvents(all);

  $("eventTitle").value = "";

  renderCalendar();
  renderEvents();
  renderUpcoming();

  toast("Event saved");
});

function renderUpcoming() {
  const all = getEvents();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const items = Object.entries(all)
    .flatMap(([date, events]) =>
      events.map(title => ({ date, title }))
    )
    .filter(x => new Date(x.date + "T00:00:00") >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  $("upcomingList").innerHTML = "";

  if (!items.length) {
    $("upcomingList").textContent = "No upcoming events saved.";
    return;
  }

  items.forEach(x => {
    const p = document.createElement("p");

    p.className = "headline";

    p.textContent =
      new Date(x.date + "T00:00:00").toLocaleDateString([], {
        month: "short",
        day: "numeric"
      }) + " — " + x.title;

    $("upcomingList").append(p);
  });
}

renderCalendar();
renderEvents();
renderUpcoming();

// WEB SEARCH
async function openUrl(url) {
  try {
    const parsed = new URL(url, window.location.href);
    if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("Unsupported URL");
    window.open(parsed.href, "_blank", "noopener,noreferrer");
  } catch (error) {
    toast("Could not open that web address.");
  }
}

$("searchForm").addEventListener("submit", async e => {
  e.preventDefault();

  const q = $("webQuery").value.trim();

  if (!q) return;

  await openUrl(
    "https://www.google.com/search?q=" + encodeURIComponent(q)
  );

  $("searchStatus").textContent =
    "Search opened in your default browser.";
});

document.querySelectorAll("[data-site]").forEach(button => {
  button.addEventListener("click", () => {
    openUrl(button.dataset.site);
  });
});

// NEWS
function parseFeeds(xmlStrings) {
  const items = [];

  for (const xml of xmlStrings) {
    const doc = new DOMParser().parseFromString(xml, "text/xml");

    doc.querySelectorAll("item").forEach(item => {
      const title = item.querySelector("title")?.textContent?.trim();
      const link = item.querySelector("link")?.textContent?.trim();
      const date = item.querySelector("pubDate")?.textContent?.trim();

      if (title && link && /^https?:\/\//i.test(link)) {
        items.push({ title, link, date });
      }
    });
  }

  return items
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 20);
}

async function loadNews() {
  $("newsList").innerHTML =
    '<p class="muted">Connecting to news feeds…</p>';

  $("dashHeadlines").innerHTML =
    '<p class="muted">Loading headlines…</p>';

  try {
    const feedUrls = [
      "https://feeds.bbci.co.uk/news/world/rss.xml",
      "https://feeds.bbci.co.uk/news/technology/rss.xml"
    ];
    const responses = await Promise.allSettled(feedUrls.map(async feedUrl => {
      const api = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feedUrl);
      const response = await fetch(api);
      if (!response.ok) throw new Error("News feed unavailable");
      const data = await response.json();
      return (data.items || []).map(item => ({ title: item.title, link: item.link, date: item.pubDate }));
    }));
    const items = responses.filter(x => x.status === "fulfilled").flatMap(x => x.value)
      .filter(item => item.title && /^https?:\/\//i.test(item.link))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 20);

    if (!items.length) {
      throw new Error("No headlines returned");
    }

    $("newsList").innerHTML = "";

    items.forEach(item => {
      const row = document.createElement("div");
      row.className = "news-item";

      const a = document.createElement("a");
      a.href = item.link;
      a.textContent = item.title;

      a.addEventListener("click", e => {
        e.preventDefault();
        openUrl(item.link);
      });

      const small = document.createElement("small");

      small.textContent = item.date
        ? new Date(item.date).toLocaleString()
        : "BBC News";

      row.append(a, small);
      $("newsList").append(row);
    });

    $("dashHeadlines").innerHTML = "";

    items.slice(0, 4).forEach(item => {
      const row = document.createElement("div");
      row.className = "headline";

      const a = document.createElement("a");
      a.href = "#";
      a.textContent = item.title;

      a.addEventListener("click", e => {
        e.preventDefault();
        openUrl(item.link);
      });

      const small = document.createElement("small");
      small.textContent = "BBC NEWS";

      row.append(a, small);
      $("dashHeadlines").append(row);
    });

  } catch (err) {
    const msg =
      "News unavailable. Check your internet connection and refresh.";

    $("newsList").textContent = msg;
    $("dashHeadlines").textContent = msg;
  }
}

$("refreshNews").addEventListener("click", loadNews);
loadNews();

// WEATHER
const weatherCodes = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail"
};

function weatherIcon(code) {
  if (code === 0 || code === 1) return "☀";
  if ([2, 3, 45, 48].includes(code)) return "☁";
  if ([95, 96, 99].includes(code)) return "⛈";
  return "🌧";
}

async function loadWeather(city) {
  $("weatherSummary").textContent = "Fetching live conditions…";

  try {
    const placeName = String(city || "Kano").trim();
    if (!placeName) throw new Error("Please enter a city name.");
    const geoResponse = await fetch("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(placeName) + "&count=1&language=en&format=json");
    if (!geoResponse.ok) throw new Error("Location search failed");
    const geo = await geoResponse.json();
    if (!geo.results || !geo.results.length) throw new Error("Location not found");
    const place = geo.results[0];
    const forecastUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + place.latitude + "&longitude=" + place.longitude + "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7";
    const response = await fetch(forecastUrl);
    if (!response.ok) throw new Error("Weather service unavailable");
    const data = await response.json();
    const result = { place: place.name, data };
    const c = result.data.current;
    const d = result.data.daily;

    $("weatherPlace").textContent = result.place;

    $("weatherSummary").textContent =
      weatherCodes[c.weather_code] || "Current conditions";

    $("weatherTemp").textContent =
      Math.round(c.temperature_2m) + "°C";

    $("weatherDetails").textContent =
      `Feels like ${Math.round(c.apparent_temperature)}°C · Humidity ${c.relative_humidity_2m}% · Wind ${Math.round(c.wind_speed_10m)} km/h`;

    $("dashTemp").textContent =
      Math.round(c.temperature_2m) + "°";

    $("dashPlace").textContent = result.place;

    $("dashWeatherText").textContent =
      weatherCodes[c.weather_code] || "Current conditions";

    $("forecastGrid").innerHTML = "";

    d.time.forEach((day, i) => {
      const card = document.createElement("div");
      card.className = "forecast-card";

      const date = document.createElement("strong");

      date.textContent = new Date(day + "T12:00:00")
        .toLocaleDateString([], { weekday: "short" });

      const icon = document.createElement("span");
      icon.textContent = weatherIcon(d.weather_code[i]);

      const temps = document.createElement("small");

      temps.textContent =
        `${Math.round(d.temperature_2m_max[i])}° / ${Math.round(d.temperature_2m_min[i])}°`;

      card.append(date, icon, temps);

      $("forecastGrid").append(card);
    });

  } catch (err) {
    $("weatherSummary").textContent =
      err.message || "Weather unavailable";

    $("dashWeatherText").textContent =
      "Weather data unavailable.";

    $("forecastGrid").innerHTML = "";
  }
}

$("loadWeather").addEventListener("click", () => {
  loadWeather($("cityInput").value);
});

$("cityInput").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    loadWeather($("cityInput").value);
  }
});

loadWeather("Kano");