(async function () {
  const app = document.getElementById("app");

  try {
    // IMPORTANT: file name must match exactly
    const res = await fetch("./lorecraft_tutorial.story.json");
    if (!res.ok) throw new Error("Failed to load JSON: " + res.status);

    const story = await res.json();
    app.innerHTML = `
      <p><strong>Loaded:</strong> ${story.title}</p>
      <p><strong>Start Section:</strong> ${story.startSectionId}</p>
      <p>If you can see this, GitHub Pages is serving your app correctly.</p>
    `;
  } catch (err) {
    app.innerHTML = `<pre style="white-space:pre-wrap;">${String(err)}</pre>`;
  }
})();    
