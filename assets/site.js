const navGroups = [
  { label: "Immobilien", href: "/immobilien/", kicker: "Finden", items: [
    ["Aktuelle Immobilien", "/immobilien/", "Häuser, Wohnungen & besondere Objekte"],
    ["Immobilie kaufen", "/kaufen/", "Vom Suchprofil bis zum Notartermin"],
    ["Finanzierung", "/finanzierung/", "Budget frühzeitig realistisch einordnen"],
    ["Suchprofil anlegen", "/kontakt/", "Passende Angebote früher erhalten"]
  ]},
  { label: "Verkaufen", href: "/verkaufen/", kicker: "Für Eigentümer", items: [
    ["Immobilie verkaufen", "/verkaufen/", "Unser Prozess von Bewertung bis Übergabe"],
    ["Immobilienbewertung", "/immobilienbewertung/", "Kostenlos und unverbindlich starten"],
    ["Referenzen", "/referenzen/", "Erfolgreich vermittelte Immobilien"],
    ["Ratgeber", "/downloads/", "Wissen für Ihre Verkaufsentscheidung"]
  ]},
  { label: "Standorte", href: "/standorte/", kicker: "In NRW zuhause", items: [
    ["Alle Standorte", "/standorte/", "Ruhrgebiet & Rheinland"],
    ["Dorsten", "/immobilienmakler-dorsten/", "SLS im nördlichen Ruhrgebiet"],
    ["Herten", "/immobilienmakler-herten/", "Lokale Immobilienberatung"],
    ["Düsseldorf", "/immobilienmakler-dusseldorf/", "SLS im Rheinland"]
  ]},
  { label: "Über SLS", href: "/ueber-uns/", kicker: "Unternehmen", items: [
    ["Über uns", "/ueber-uns/", "Wer wir sind und wie wir arbeiten"],
    ["Team", "/team/", "Ihre Ansprechpartner bei SLS"],
    ["Werte", "/werte/", "Wofür SLS steht"],
    ["Karriere", "/karriere/", "Gemeinsam Immobilien neu denken"],
    ["Magazin", "/blog/", "News & Immobilienwissen"],
    ["Presse", "/presse/", "Medien & Ansprechpartner"],
    ["Kontakt", "/kontakt/", "Direkt mit uns sprechen"]
  ]}
];

const icon = (name) => {
  const paths = {
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>'
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
};

const current = window.location.pathname.replace(/index\\.html$/, "");
const isActive = (href) => href === current || (href !== "/" && current.startsWith(href));

const primaryLinks = navGroups.map((group) =>
  `<a class="floating-nav-link" href="${group.href}"${isActive(group.href) ? ' aria-current="page"' : ""}>${group.label}</a>`
).join("");

const overlaySections = navGroups.map((group) => {
  const links = group.items.slice(0, 4).map(([label, href]) =>
    `<a class="overlay-sub-link" href="${href}">${label}</a>`
  ).join("");
  return `<section class="overlay-nav-section">
    <a class="overlay-main-link" href="${group.href}">${group.label}</a>
    <div class="overlay-subgrid">${links}</div>
  </section>`;
}).join("");

document.querySelector("[data-site-header]").innerHTML = `
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
  <div class="floating-header-shell">
    <a class="floating-brand" href="/" aria-label="SLS Immobilienpartner Startseite">
      <img src="/assets/logo-sls.svg" alt="SLS Immobilienpartner" width="267" height="170">
    </a>
    <nav class="floating-primary" aria-label="Hauptnavigation">${primaryLinks}</nav>
    <div class="floating-actions">
      <button class="menu-toggle floating-menu-toggle" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="Menü öffnen">
        <span class="menu-label">Menü</span>${icon("menu")}
      </button>
    </div>
  </div>
  <div class="nav-backdrop" data-nav-close></div>
  <nav id="site-nav" class="fullscreen-nav" aria-label="Erweiterte Navigation" aria-hidden="true" inert>
    <div class="fullscreen-nav-inner">
      <div class="fullscreen-nav-top">
        <a class="offcanvas-brand" href="/" aria-label="SLS Startseite"><img src="data:image/webp;base64,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" alt="SLS Immobilienpartner"></a>
        <button class="offcanvas-close" type="button" data-nav-close aria-label="Menü schließen">${icon("close")}</button>
      </div>
      <p class="offcanvas-intro">Womit können wir Ihnen helfen?</p>
      <div class="fullscreen-nav-grid">${overlaySections}</div>
      <div class="fullscreen-nav-bottom">
        <a href="/team/">Team</a><a href="/referenzen/">Referenzen</a><a href="/finanzierung/">Finanzierung</a><a href="/blog/">Magazin</a><a href="/karriere/">Karriere</a><a href="/presse/">Presse</a><a href="/kontakt/">Kontakt</a>
      </div>
    </div>
  </nav>`;

document.querySelector("[data-site-footer]").innerHTML = `
  <section class="trust-strip" aria-label="Vertrauen und Mitgliedschaften">
    <div class="wrap trust-grid">
      <div><strong>Top bewertet</strong><span>Kundenstimmen aus Google</span></div>
      <div><strong>IVD Mitglied</strong><span>Immobilienverband Deutschland</span></div>
      <div><strong>ImmoScout24</strong><span>GoldPartner</span></div>
      <div><strong>30+ Standorte</strong><span>in Nordrhein-Westfalen</span></div>
    </div>
  </section>
  <div class="footer-inner">
    <div class="footer-lead">
      <a class="brand" href="/" aria-label="SLS Immobilienpartner Startseite"><img class="brand-logo" src="/assets/logo-sls.svg" alt="SLS Immobilienpartner" width="267" height="170"></a>
      <p>Wir verkaufen Ihre Immobilie, als wäre sie unsere eigene.</p>
    </div>
    <div><h2>Eigentümer</h2><a href="/immobilienbewertung/">Immobilienbewertung</a><a href="/verkaufen/">Verkaufen</a><a href="/service/">Service</a><a href="/referenzen/">Referenzen</a></div>
    <div><h2>Interessenten</h2><a href="/kaufen/">Kaufen</a><a href="/finanzierung/">Finanzierung</a><a href="/immobilien/">Immobilien</a><a href="/downloads/">Ratgeber</a></div>
    <div><h2>SLS</h2><a href="/ueber-uns/">Über uns</a><a href="/team/">Team</a><a href="/standorte/">Standorte</a><a href="/karriere/">Karriere</a><a href="/blog/">Blog</a></div>
    <div><h2>Kontakt</h2><a href="tel:+4923697428020">02369 742 80 20</a><a href="mailto:service@sls.de">service@sls.de</a><p>Ubierweg 2 · 46286 Dorsten</p><p>Königsallee 19 · 40213 Düsseldorf</p></div>
  </div>
  <div class="footer-bottom"><span>&copy; 2026 SLS Immobilienpartner GmbH</span><span><a href="https://sls.de/datenschutz/">Datenschutz</a><a href="https://sls.de/impressum/">Impressum</a></span></div>`;

const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("#site-nav");
const header = document.querySelector("[data-site-header]");

const setMenu = (open, returnFocus = false) => {
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
  toggle.innerHTML = `<span class="menu-label">${open ? "Schließen" : "Menü"}</span>${icon(open ? "close" : "menu")}`;
  nav.classList.toggle("is-open", open);
  document.body.classList.toggle("menu-open", open);
  header.classList.toggle("menu-active", open);

  if (open) {
    nav.removeAttribute("aria-hidden");
    nav.removeAttribute("inert");
  } else {
    nav.setAttribute("aria-hidden", "true");
    nav.setAttribute("inert", "");
    if (returnFocus) toggle.focus();
  }
};

toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));

nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});
document.querySelectorAll("[data-nav-close]").forEach((el) => el.addEventListener("click", () => setMenu(false, true)));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") setMenu(false, true);
});

window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 28);
}, { passive: true });

setMenu(false);

document.querySelectorAll(".reveal").forEach((element) => {
  const observer = new IntersectionObserver(([entry], obs) => {
    if (entry.isIntersecting) {
      element.classList.add("is-visible");
      obs.disconnect();
    }
  }, { threshold: 0.08 });
  observer.observe(element);
});

document.querySelectorAll("[data-faq-button]").forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest(".faq-item");
    const open = item.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(open));
  });
});

const form = document.querySelector("[data-preview-form]");
if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const status = form.querySelector("[data-form-status]");
    if (status) {
      status.hidden = false;
      status.focus();
    }
  });
}
