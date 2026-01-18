// VerseCraft Starter v0.0.05
// Panel-by-panel navigation baseline + Launcher wired

import { initRouter, go, getCurrentScreen } from "./router.js";
import { bindHitboxes } from "./input.js";
import { initDebug } from "./debug.js";

const VERSION = "0.0.05";

// Library manifest (future-proof)
const LIBRARY_MANIFEST_URL = "./content/library_manifest.json";

// Fallback slot order (matches current pre-rendered library art)
const FALLBACK_LIBRARY_SLOTS = [
  { storyId: "backrooms", title: "Backrooms" },
  { storyId: "timecop", title: "Timecop" },
  { storyId: "relic_of_cylara", title: "Relic of Cylara" },
  { storyId: "world_of_lorecraft", title: "World of Lorecraft" },
  { storyId: "oregon_trail", title: "Oregon Trail" },
  { storyId: "wastelands", title: "Wastelands" },
  { storyId: "tale_of_icarus", title: "Tale of Icarus" },
  { storyId: "crimson_seagull", title: "Crimson Seagull" }
];

let librarySlots = null; // loaded from manifest

// --- Keys (locked) ---
const KEY_SELECTED_STORY = "vc_selected_story";
const KEY_SELECTED_PACK = "vc_selected_pack";
const KEY_LAST_LIBRARY = "vc_last_library_screen";

// Save keys: vc_save_<packId>__<storyId>
function saveKey(packId, storyId) {
  return `vc_save_${packId}__${storyId}`;
}

// Story JSON location (locked convention)
function storyJsonPath(packId, storyId) {
  return `./content/packs/${packId}/stories/${storyId}.json`;
}

// Minimal mapping for launch.
// You can expand/replace with a manifest later without changing UI wiring.
function getPackIdForStory(storyId) {
  // You confirmed World Of Lorecraft is in starter.
  if (storyId === "world_of_lorecraft") return "starter";

  // Assumption: the rest are in founders for launch.
  return "founders";
}

function setFooter() {
  const el = document.getElementById("footer");
  if (!el) return;

  const btn = document.getElementById("btnDebug");
  el.textContent = `VerseCraft v${VERSION} • `;
  if (btn) el.appendChild(btn);
}

function selectStory(storyId) {
  const packId = getPackIdForStory(storyId);

  try {
    localStorage.setItem(KEY_SELECTED_STORY, storyId);
    localStorage.setItem(KEY_SELECTED_PACK, packId);
  } catch {}
}

function setLastLibraryScreen(screenId) {
  try {
    localStorage.setItem(KEY_LAST_LIBRARY, screenId);
  } catch {}
}

function getLastLibraryScreen() {
  try {
    return localStorage.getItem(KEY_LAST_LIBRARY) || "library";
  } catch {
    return "library";
  }
}

function getSelection() {
  let storyId = null;
  let packId = null;

  try {
    storyId = localStorage.getItem(KEY_SELECTED_STORY);
    packId = localStorage.getItem(KEY_SELECTED_PACK);
  } catch {}

  if (!storyId) return null;
  if (!packId) packId = getPackIdForStory(storyId);

  return { storyId, packId };
}

// --- Modal fallbacks (still OK if you don't have modalBackdrop) ---
function showStoreModal() {
  const modal = document.getElementById("modalBackdrop");
  if (modal) {
    modal.style.display = "block";
    modal.style.pointerEvents = "auto";
    return;
  }
  alert("Store: Coming Soon");
}

function showMoreSoonModal() {
  const modal = document.getElementById("modalBackdrop");
  if (modal) {
    modal.style.display = "block";
    modal.style.pointerEvents = "auto";
    return;
  }
  alert("More stories available soon!");
}

// --- Launcher rendering ---
async function loadLauncher() {
  const sel = getSelection();
  const titleEl = document.getElementById("launcherTitle");
  const blurbEl = document.getElementById("launcherBlurb");
  const coverEl = document.getElementById("launcherCover");
  const continueHb = document.getElementById("hbLauncherContinue");

  if (!sel) {
    if (titleEl) titleEl.textContent = "No story selected";
    if (blurbEl) blurbEl.textContent = "Return to the Library and pick a story.";
    if (coverEl) coverEl.removeAttribute("src");
    if (continueHb) continueHb.setAttribute("data-disabled", "true");
    return;
  }

  const { packId, storyId } = sel;

  // Enable/disable Continue based on save existence
  const hasSave = (() => {
    try {
      return !!localStorage.getItem(saveKey(packId, storyId));
    } catch {
      return false;
    }
  })();

  if (continueHb) {
    continueHb.setAttribute("data-disabled", hasSave ? "false" : "true");
  }

  // Load story JSON and populate launcher content
  const url = storyJsonPath(packId, storyId);

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const title = data.title || storyId;
    const blurb = data.blurb || "";
    const cover = data.assets?.cover || "";

    if (titleEl) titleEl.textContent = title;
    if (blurbEl) blurbEl.textContent = blurb;

    if (coverEl) {
      if (cover) coverEl.src = cover.startsWith("./") ? cover : `./${cover}`;
      else coverEl.removeAttribute("src");
    }
  } catch (err) {
    if (titleEl) titleEl.textContent = storyId;
    if (blurbEl) blurbEl.textContent = `Missing story JSON at: ${url}`;
    if (coverEl) coverEl.removeAttribute("src");
  }
}

// --- Start / Continue behaviors ---
function startSelectedStory() {
  const sel = getSelection();
  if (!sel) return;

  const { packId, storyId } = sel;

  fetch(storyJsonPath(packId, storyId), { cache: "no-store" })
    .then(r => r.json())
    .then(data => {
      const start = data.start || data.startNodeId || "S01";
      try {
        localStorage.removeItem(saveKey(packId, storyId));
      } catch {}
      try {
        localStorage.setItem("vc_story_cursor", start);
      } catch {}
      go("story");
    })
    .catch(() => go("story"));
}

function continueSelectedStory() {
  const sel = getSelection();
  if (!sel) return;

  const { packId, storyId } = sel;

  let save = null;
  try {
    save = localStorage.getItem(saveKey(packId, storyId));
  } catch {}

  if (!save) {
    alert("No save found for this story yet.");
    return;
  }

  try {
    localStorage.setItem("vc_active_save", save);
  } catch {}

  go("story");
}

// --- Library management ---
async function loadLibraryManifest() {
  try {
    const res = await fetch(LIBRARY_MANIFEST_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data?.slots) && data.slots.length) {
      librarySlots = data.slots;
      return;
    }
  } catch (_){}
  librarySlots = null;
}

function getSlots() {
  return Array.isArray(librarySlots) && librarySlots.length ? librarySlots : FALLBACK_LIBRARY_SLOTS;
}

function storyForRow(rowIndex) {
  const slots = getSlots();
  return slots[rowIndex] || null;
}

function populateLibraryLabels(page) {
  const start = page === 2 ? 4 : 0;
  const end = start + 4;
  for (let i = start; i < end; i++) {
    const el = document.getElementById(`libLabel${i}`);
    const slot = storyForRow(i);
    if (el) el.textContent = slot?.title || "";
  }
}

function boot() {
  setFooter();
  initRouter();

  loadLibraryManifest().then(() => {
    const cur = getCurrentScreen();
    if (cur === "library") populateLibraryLabels(1);
    if (cur === "library2") populateLibraryLabels(2);
  });

  // 🚀 Unified navigation listener (runtime hook added)
  window.addEventListener("versecraft:navigate", (e) => {
    const to = e?.detail?.to;
    if (to === "launcher") loadLauncher();
    if (to === "library") populateLibraryLabels(1);
    if (to === "library2") populateLibraryLabels(2);

    // ✅ Trigger runtime once story screen is active
    if (to === "story") {
      console.log("[App] Entered story screen – starting runtime…");
      if (window.Runtime) {
        Runtime.loadStory().then(() => Runtime.start());
      } else {
        console.warn("[App] Runtime not found in global scope!");
      }
    }
  });

  bindHitboxes({
    // Splash
    hbSplashTap: () => go("tos"),

    // Terms of Service
    hbTosAccept: () => go("menu"),

    // Menu
    hbMenuLoad: () => go("library"),
    hbMenuSettings: () => go("settings"),

    // Settings
    hbSettingsBack: () => go("menu"),
    hbSettingsClear: () => alert("Clear Save (placeholder)"),
    hbSettingsTheme: () => alert("Theme (placeholder)"),

    // Library
    hbLibraryMenu: () => go("menu"),
    hbLibraryStore: () => showStoreModal(),
    hbLibraryNext: () => go("library2"),

    // Library Page 2
    hbLibrary2Back: () => go("library"),
    hbLibrary2Store: () => showStoreModal(),
    hbLibraryMoreSoon: () => showMoreSoonModal(),

    // Launcher
    hbLauncherBack: () => go(getLastLibraryScreen()),
    hbLauncherStart: () => startSelectedStory(),
    hbLauncherContinue: () => continueSelectedStory(),

    // Story
    hbStoryBack: () => go("launcher"),

    // Library row selection
    hbRow0: () => { setLastLibraryScreen(getCurrentScreen()); selectStory((storyForRow(0)?.storyId) || "backrooms"); go("launcher"); },
    hbRow1: () => { setLastLibraryScreen(getCurrentScreen()); selectStory((storyForRow(1)?.storyId) || "timecop"); go("launcher"); },
    hbRow2: () => { setLastLibraryScreen(getCurrentScreen()); selectStory((storyForRow(2)?.storyId) || "relic_of_cylara"); go("launcher"); },
    hbRow3: () => { setLastLibraryScreen(getCurrentScreen()); selectStory((storyForRow(3)?.storyId) || "world_of_lorecraft"); go("launcher"); },
    hbRow4: () => { setLastLibraryScreen(getCurrentScreen()); selectStory((storyForRow(4)?.storyId) || "oregon_trail"); go("launcher"); },
    hbRow5: () => { setLastLibraryScreen(getCurrentScreen()); selectStory((storyForRow(5)?.storyId) || "wastelands"); go("launcher"); },
    hbRow6: () => { setLastLibraryScreen(getCurrentScreen()); selectStory((storyForRow(6)?.storyId) || "tale_of_icarus"); go("launcher"); },
    hbRow7: () => { setLastLibraryScreen(getCurrentScreen()); selectStory((storyForRow(7)?.storyId) || "crimson_seagull"); go("launcher"); },
  });

  initDebug();
  go("splash");
}

window.addEventListener("DOMContentLoaded", boot, { once: true });
