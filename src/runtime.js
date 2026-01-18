window.Runtime = (function () {
  const catalogPath = "content/Catalog.json";
  let story = null;
  let packData = null;

  const storyContainer = () => document.querySelector(".story-text");
  const choiceContainer = () => document.querySelector("#choicePanel");

  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
  }

  async function loadStory() {
    try {
      const sel = {
        packId: localStorage.getItem("vc_selected_pack") || "starter",
        storyId: localStorage.getItem("vc_selected_story") || "world_of_lorecraft"
      };

      const catalog = await loadJSON(catalogPath);
      const pack = catalog.Packs.find(p => p.pack_id === sel.packId);
      if (!pack) throw new Error("Pack not found in catalog");

      packData = await loadJSON(`content/packs/${sel.packId}/pack.json`);

      // Inject pack CSS if present
      if (packData.style) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `content/packs/${sel.packId}/${packData.style}`;
        document.head.appendChild(link);
      }

      // Apply theme color if defined
      if (packData.themeColor) {
        document.documentElement.style.setProperty("--pack-theme-color", packData.themeColor);
      }

      // Load story JSON
      const storyPath = `content/packs/${sel.packId}/stories/${sel.storyId}.json`;
      story = await loadJSON(storyPath);
      console.log("[Runtime] Story loaded:", story.title);
      renderSection(story.start);
    } catch (err) {
      console.error("[Runtime] Failed:", err);
      const el = storyContainer();
      if (el) el.textContent = "Error loading story: " + err.message;
    }
  }

  function renderSection(id) {
    if (!story) return;
    const section = story.sections.find(s => s.id === id);
    if (!section) return;
    const el = storyContainer();
    const choicesEl = choiceContainer();
    if (!el || !choicesEl) return;

    // Clear previous
    el.innerHTML = "";
    choicesEl.innerHTML = "";

    const p = document.createElement("p");
    p.textContent = section.text;
    el.appendChild(p);

    if (section.system) {
      const sys = document.createElement("div");
      sys.className = "system-text";
      sys.textContent = section.system;
      el.appendChild(sys);
    }

    el.scrollTop = 0;

    // Render choices
    if (section.choices) {
      section.choices.forEach(choice => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.textContent = choice.label;
        btn.style.color = "#fff";
        btn.style.background = "var(--pack-theme-color, #333)";
        btn.onclick = () => {
          if (choice.toMenu) {
            window.location.reload();
          } else {
            renderSection(choice.to);
          }
        };
        choicesEl.appendChild(btn);
      });
    }
  }

  function start() {
    loadStory();
  }

  return { start };
})();