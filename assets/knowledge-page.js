(() => {
  const input = document.getElementById("knowledge-search-input");
  const root = document.querySelector("[data-knowledge-root]");
  if (!root) return;

  const topics = [...root.querySelectorAll("[data-knowledge-topic]")];
  const noResults = root.querySelector("[data-knowledge-no-results]");
  const status = document.querySelector("[data-knowledge-search-status]");

  const normalize = (value) => (value || "").toLocaleLowerCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filter = () => {
    const query = normalize(input?.value.trim());
    let visible = 0;
    topics.forEach((topic) => {
      let topicVisible = 0;
      topic.querySelectorAll("[data-knowledge-item]").forEach((item) => {
        const match = !query || normalize(item.textContent).includes(query);
        item.hidden = !match;
        if (match) { topicVisible += 1; visible += 1; }
      });
      topic.hidden = query ? topicVisible === 0 : false;
    });
    if (noResults) noResults.hidden = visible !== 0 || !query;
    if (status) status.textContent = query ? (visible ? visible + (visible === 1 ? " passende Frage" : " passende Fragen") : "Keine passende Frage gefunden") : "";
  };

  input?.addEventListener("input", filter);

  document.querySelectorAll("[data-sia-open-page]").forEach((button) => {
    button.addEventListener("click", () => {
      window.__slsSiaOpenRequested = true;
      window.dispatchEvent(new CustomEvent("sls:sia-open"));
    });
  });

  const reveals = document.querySelectorAll(".knowledge-page .reveal");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }
})();