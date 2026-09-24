(() => {
  const track = document.querySelector("[data-team-track]");
  const controls = document.querySelector("[data-team-controls]");
  if (!track || !controls) return;

  const cards = [...track.querySelectorAll(".person-card")];
  const previous = controls.querySelector("[data-team-prev]");
  const next = controls.querySelector("[data-team-next]");
  const progress = controls.querySelector("[data-team-progress]");
  const mobile = window.matchMedia("(max-width: 640px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let observer;
  let entered = false;
  let scheduled = false;

  function activeIndex() {
    const first = cards[0]?.offsetLeft || 0;
    const left = track.scrollLeft;
    return cards.reduce((best, card, index) =>
      Math.abs(card.offsetLeft - first - left) <
      Math.abs(cards[best].offsetLeft - first - left) ? index : best, 0);
  }

  function update() {
    scheduled = false;
    if (!mobile.matches || !cards.length) return;
    const index = activeIndex();
    progress.textContent = (index + 1) + " / " + cards.length;
    previous.disabled = track.scrollLeft < 2;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
  }

  function scheduleUpdate() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(update);
    }
  }

  function move(direction) {
    const index = Math.max(0, Math.min(cards.length - 1, activeIndex() + direction));
    track.scrollTo({
      left: cards[index].offsetLeft - cards[0].offsetLeft,
      behavior: reducedMotion.matches ? "auto" : "smooth"
    });
  }

  function startEntrance() {
    if (entered || observer || reducedMotion.matches ||
        !mobile.matches || !("IntersectionObserver" in window)) return;
    observer = new IntersectionObserver(([entry], current) => {
      if (!entry.isIntersecting) return;
      entered = true;
      current.disconnect();
      observer = undefined;
      track.animate?.([
        { opacity: .65, transform: "translate3d(42px, 0, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" }
      ], { duration: 850, easing: "cubic-bezier(.22, .61, .36, 1)" });
    }, { threshold: .12, rootMargin: "0px 0px -8% 0px" });
    observer.observe(track);
  }

  function syncLayout() {
    controls.hidden = !mobile.matches;
    if (mobile.matches) {
      track.tabIndex = 0;
      startEntrance();
    } else {
      track.removeAttribute("tabindex");
      observer?.disconnect();
      observer = undefined;
    }
    scheduleUpdate();
  }

  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  track.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  if (mobile.addEventListener) mobile.addEventListener("change", syncLayout);
  else mobile.addListener(syncLayout);
  syncLayout();
})();
