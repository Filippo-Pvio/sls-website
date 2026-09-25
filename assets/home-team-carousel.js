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
  let entranceObserver;
  let desktopObserver;
  let desktopVisible = false;
  let entered = false;
  let scheduled = false;
  let autoDelay;
  let autoTimer;
  let autoDirection = 1;
  let manualPauseUntil = 0;
  const hovered = new Set();

  function activeIndex() {
    const first = cards[0]?.offsetLeft || 0;
    const left = track.scrollLeft;
    return cards.reduce((best, card, index) =>
      Math.abs(card.offsetLeft - first - left) <
      Math.abs(cards[best].offsetLeft - first - left) ? index : best, 0);
  }

  function update() {
    scheduled = false;
    if (!cards.length) return;
    const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    progress.textContent = (atEnd && !mobile.matches ? cards.length : activeIndex() + 1) + " / " + cards.length;
    previous.disabled = track.scrollLeft < 2;
    next.disabled = atEnd;
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

  function stopAutoplay() {
    window.clearTimeout(autoDelay);
    window.clearInterval(autoTimer);
    autoDelay = undefined;
    autoTimer = undefined;
  }

  function autoStep() {
    if (manualPauseUntil > Date.now()) return;
    if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 2) autoDirection = -1;
    if (track.scrollLeft < 2) autoDirection = 1;
    move(autoDirection);
  }

  function startAutoplay() {
    if (mobile.matches || reducedMotion.matches || !desktopVisible ||
        hovered.size || track.contains(document.activeElement) ||
        controls.contains(document.activeElement) || autoDelay || autoTimer) return;
    autoDelay = window.setTimeout(() => {
      autoDelay = undefined;
      autoStep();
      autoTimer = window.setInterval(autoStep, 3800);
    }, 1700);
  }

  function startDesktopObserver() {
    if (desktopObserver || reducedMotion.matches || !("IntersectionObserver" in window)) return;
    desktopObserver = new IntersectionObserver(([entry]) => {
      desktopVisible = entry.isIntersecting;
      if (desktopVisible) startAutoplay();
      else stopAutoplay();
    }, { threshold: .2, rootMargin: "0px 0px -10% 0px" });
    desktopObserver.observe(track);
  }

  function startEntrance() {
    if (entered || entranceObserver || reducedMotion.matches ||
        !mobile.matches || !("IntersectionObserver" in window)) return;
    entranceObserver = new IntersectionObserver(([entry], current) => {
      if (!entry.isIntersecting) return;
      entered = true;
      current.disconnect();
      entranceObserver = undefined;
      track.animate?.([
        { opacity: .65, transform: "translate3d(42px, 0, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" }
      ], { duration: 850, easing: "cubic-bezier(.22, .61, .36, 1)" });
    }, { threshold: .12, rootMargin: "0px 0px -8% 0px" });
    entranceObserver.observe(track);
  }

  function syncLayout() {
    controls.hidden = false;
    progress.setAttribute("aria-live", mobile.matches ? "polite" : "off");
    if (mobile.matches) {
      stopAutoplay();
      desktopObserver?.disconnect();
      desktopObserver = undefined;
      desktopVisible = false;
      track.tabIndex = 0;
      startEntrance();
    } else {
      track.tabIndex = 0;
      entranceObserver?.disconnect();
      entranceObserver = undefined;
      startDesktopObserver();
    }
    scheduleUpdate();
  }

  previous.addEventListener("click", () => {
    if (!mobile.matches) manualPauseUntil = Date.now() + 8500;
    move(-1);
  });
  next.addEventListener("click", () => {
    if (!mobile.matches) manualPauseUntil = Date.now() + 8500;
    move(1);
  });
  for (const element of [track, controls]) {
    element.addEventListener("mouseenter", () => {
      hovered.add(element);
      stopAutoplay();
    });
    element.addEventListener("mouseleave", () => {
      hovered.delete(element);
      startAutoplay();
    });
  }
  track.addEventListener("pointerdown", () => {
    if (!mobile.matches) manualPauseUntil = Date.now() + 8500;
  });
  track.addEventListener("wheel", () => {
    if (!mobile.matches) manualPauseUntil = Date.now() + 8500;
  }, { passive: true });
  track.addEventListener("focusin", stopAutoplay);
  track.addEventListener("focusout", () => window.setTimeout(startAutoplay, 0));
  controls.addEventListener("focusin", stopAutoplay);
  controls.addEventListener("focusout", () => window.setTimeout(startAutoplay, 0));
  track.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  if (mobile.addEventListener) mobile.addEventListener("change", syncLayout);
  else mobile.addListener(syncLayout);
  if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", syncLayout);
  else reducedMotion.addListener(syncLayout);
  syncLayout();
})();
