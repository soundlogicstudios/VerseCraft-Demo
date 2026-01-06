// VerseCraft Router v0.0.03
// Responsible ONLY for switching screens (single-screen active)

const SCREENS = ["splash", "tos", "menu", "settings", "library", "story"];

let _current = (location.hash || "").replace("#", "").trim();
if (!_current || !SCREENS.includes(_current)) _current = "splash";

export function initRouter() {
  // Allow direct linking via hash (#splash, #tos, #menu, #library, etc.)
  const hash = (location.hash || "").replace("#", "").trim();
  if (hash && SCREENS.includes(hash)) {
    requestAnimationFrame(() => go(hash));
  }
}

export function getCurrentScreen() {
  return _current;
}

export function go(screenId) {
  if (!SCREENS.includes(screenId)) return;

  const from = _current;
  const to = screenId;
  _current = to;

  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  const next = document.querySelector(`[data-screen="${screenId}"]`);
  if (next) {
    next.classList.add("active");
  }

  // Keep URL in sync for debugging / reloads
  history.replaceState(null, "", `#${screenId}`);

  // Notify debug/telemetry layers (non-blocking)
  window.dispatchEvent(new CustomEvent("versecraft:navigate", {
    detail: { from, to }
  }));
}
