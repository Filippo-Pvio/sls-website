const pages = [
  ["Start", "/"],
  ["Verkaufen", "/verkaufen/"],
  ["Immobilien", "/immobilien/"],
  ["&Uuml;ber SLS", "/ueber-uns/"],
  ["Kontakt", "/kontakt/"]
];

const icon = (name) => {
  const paths = {
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/>'
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
};

const current = window.location.pathname.replace(/index\.html$/, "");
const navLinks = pages.map(([label, href]) => {
  const active = href === current || (href !== "/" && current.startsWith(href));
  return `<a href="${href}"${active ? ' aria-current="page"' : ""}>${label}</a>`;
}).join("");

document.querySelector("[data-site-header]").innerHTML = `
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
  <div class="header-inner">
    <a class="brand" href="/" aria-label="SLS Immobilienpartner Startseite">
      <img class="brand-logo" src="/assets/logo-sls.svg" alt="" width="267" height="170">
    </a>
    <nav id="site-nav" class="site-nav" aria-label="Hauptnavigation">${navLinks}<a class="nav-mobile-cta" href="/kontakt/#bewertung">Immobilie bewerten ${icon("arrow")}</a></nav>
    <a class="header-cta" href="/kontakt/#bewertung">Immobilie bewerten ${icon("arrow")}</a>
    <button class="menu-toggle" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="Menü öffnen">${icon("menu")}</button>
  </div>`;

document.querySelector("[data-site-footer]").innerHTML = `
  <div class="footer-inner">
    <div class="footer-lead">
      <a class="brand" href="/" aria-label="SLS Immobilienpartner Startseite"><img class="brand-logo" src="/assets/logo-sls.svg" alt="" width="267" height="170"></a>
      <p>Wir verkaufen Ihre Immobilie, als w&auml;re sie unsere eigene.</p>
    </div>
    <div><h2>Kontakt</h2><a href="tel:+4923697428020">02369 742 80 20</a><a href="mailto:service@sls.de">service@sls.de</a></div>
    <div><h2>Standorte</h2><p>Ubierweg 2<br>46286 Dorsten</p><p>K&ouml;nigsallee 19<br>40213 D&uuml;sseldorf</p></div>
    <div><h2>Direkt</h2><a href="/verkaufen/">Immobilie verkaufen</a><a href="/immobilien/">Immobilien finden</a><a href="/kontakt/">Kontakt aufnehmen</a></div>
  </div>
  <div class="footer-bottom"><span>&copy; 2026 SLS Immobilienpartner GmbH</span><span><a href="https://sls.de/datenschutz/">Datenschutz</a><a href="https://sls.de/impressum/">Impressum</a></span></div>`;

const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("#site-nav");
const mobileMenu = window.matchMedia("(max-width: 980px)");

const setMenu = (open, returnFocus = false) => {
  const shouldOpen = mobileMenu.matches && open;
  toggle.setAttribute("aria-expanded", String(shouldOpen));
  toggle.setAttribute("aria-label", shouldOpen ? "Menü schließen" : "Menü öffnen");
  toggle.innerHTML = icon(shouldOpen ? "close" : "menu");
  nav.classList.toggle("is-open", shouldOpen);
  document.body.classList.toggle("menu-open", shouldOpen);
  nav.toggleAttribute("inert", mobileMenu.matches && !shouldOpen);
  nav.setAttribute("aria-hidden", String(mobileMenu.matches && !shouldOpen));

  if (!mobileMenu.matches) {
    nav.removeAttribute("aria-hidden");
    nav.removeAttribute("inert");
  } else if (shouldOpen) {
    nav.querySelector("a")?.focus();
  } else if (returnFocus) {
    toggle.focus();
  }
};

toggle.addEventListener("click", () => {
  setMenu(toggle.getAttribute("aria-expanded") !== "true");
});

nav.addEventListener("click", (event) => {
  if (event.target.closest("a") && mobileMenu.matches) setMenu(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") setMenu(false, true);
});

mobileMenu.addEventListener("change", () => setMenu(false));
setMenu(false);

document.querySelectorAll(".reveal").forEach((element) => {
  const observer = new IntersectionObserver(([entry], obs) => {
    if (entry.isIntersecting) {
      element.classList.add("is-visible");
      obs.disconnect();
    }
  }, { threshold: 0.12 });
  observer.observe(element);
});

const form = document.querySelector("[data-preview-form]");
if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const status = form.querySelector("[data-form-status]");
    status.hidden = false;
    status.focus();
  });
}
