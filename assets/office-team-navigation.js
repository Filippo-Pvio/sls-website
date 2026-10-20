document.querySelectorAll('.office-page .office-team-group').forEach((group, index) => {
  const track = group.querySelector('.office-people');
  const title = group.querySelector('.office-team-group-title');
  const cards = [...track.children];
  const header = document.createElement('div');
  header.className = 'office-team-heading';
  title.before(header);
  header.append(title);
  track.id ||= `office-team-${index + 1}`;
  const controls = document.createElement('div');
  controls.className = 'office-team-navigation';
  controls.hidden = true;
  const label = title.textContent.trim();
  controls.innerHTML = `<span class="office-team-count" aria-live="polite" aria-atomic="true"></span><button type="button" class="office-team-arrow" aria-controls="${track.id}" aria-label="${label}: vorherige Mitarbeiter">←</button><button type="button" class="office-team-arrow" aria-controls="${track.id}" aria-label="${label}: weitere Mitarbeiter">→</button>`;
  header.append(controls);
  const [previous, next] = controls.querySelectorAll('button');
  const count = controls.querySelector('span');
  const update = () => {
    const overflow = track.scrollWidth > track.clientWidth + 2;
    group.classList.toggle('is-scrollable', overflow);
    controls.hidden = !overflow;
    if (!overflow) return;
    const bounds = track.getBoundingClientRect();
    const visible = cards.map((card, i) => {
      const rect = card.getBoundingClientRect();
      return Math.min(rect.right, bounds.right) - Math.max(rect.left, bounds.left) >= rect.width / 2 ? i + 1 : null;
    }).filter(Boolean);
    if (visible.length) count.textContent = `${visible[0]}${visible.length > 1 ? `–${visible.at(-1)}` : ''} von ${cards.length}`;
    previous.disabled = track.scrollLeft < 2;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
  };
  const move = direction => {
    const stride = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth;
    track.scrollBy({left: direction * stride, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  };
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  let frame;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  }, {passive: true});
  new ResizeObserver(update).observe(track);
  update();
});
