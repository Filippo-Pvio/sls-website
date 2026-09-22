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

const current = window.location.pathname.replace(/index\.html$/, "");
const isActive = (href) => href === current || (href !== "/" && current.startsWith(href));
const navLinks = navGroups.map((group, index) => {
  const active = isActive(group.href) || group.items?.some(([, href]) => isActive(href));
  const submenu = group.items.map(([label, href, desc]) => `<a class="mega-link" href="${href}"${isActive(href) ? ' aria-current="page"' : ""}><strong>${label}</strong><span>${desc}</span></a>`).join("");
  return `<div class="nav-group${active ? " is-current" : ""}">
    <div class="nav-group-row">
      <a class="nav-link" href="${group.href}">${group.label}</a>
      <button class="submenu-toggle" type="button" aria-expanded="false" aria-controls="submenu-${index}" aria-label="${group.label} Untermenü öffnen">${icon("chevron")}</button>
    </div>
    <div class="submenu mega-menu" id="submenu-${index}">
      <div class="mega-menu-intro"><span>${group.kicker}</span><strong>${group.label}</strong></div>
      <div class="mega-menu-links">${submenu}</div>
    </div>
  </div>`;
}).join("");

document.querySelector("[data-site-header]").innerHTML = `
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
  <div class="header-inner">
    <a class="brand" href="/" aria-label="SLS Immobilienpartner Startseite">
      <img class="brand-logo" src="/assets/logo-sls.svg" alt="SLS Immobilienpartner" width="267" height="170">
    </a>
    <nav id="site-nav" class="site-nav" aria-label="Hauptnavigation">${navLinks}<a class="nav-mobile-cta" href="/immobilienbewertung/">Immobilie bewerten ${icon("arrow")}</a></nav>
    <a class="header-cta" href="/immobilienbewertung/">Immobilie bewerten</a>
    <button class="menu-toggle" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="Menü öffnen">${icon("menu")}</button>
  </div>`;

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
const mobileMenu = window.matchMedia("(max-width: 980px)");

const closeSubmenus = () => document.querySelectorAll(".submenu-toggle").forEach((button) => {
  button.setAttribute("aria-expanded", "false");
  button.closest(".nav-group")?.classList.remove("is-open");
});

const setMenu = (open, returnFocus = false) => {
  const shouldOpen = mobileMenu.matches && open;
  toggle.setAttribute("aria-expanded", String(shouldOpen));
  toggle.setAttribute("aria-label", shouldOpen ? "Menü schließen" : "Menü öffnen");
  toggle.innerHTML = icon(shouldOpen ? "close" : "menu");
  nav.classList.toggle("is-open", shouldOpen);
  document.body.classList.toggle("menu-open", shouldOpen);

  if (!mobileMenu.matches) {
    nav.removeAttribute("aria-hidden");
    nav.removeAttribute("inert");
  } else if (!shouldOpen) {
    nav.setAttribute("aria-hidden", "true");
    nav.setAttribute("inert", "");
    closeSubmenus();
    if (returnFocus) toggle.focus();
  } else {
    nav.removeAttribute("aria-hidden");
    nav.removeAttribute("inert");
  }
};

toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));

document.querySelectorAll(".submenu-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const group = button.closest(".nav-group");
    const open = button.getAttribute("aria-expanded") === "true";
    document.querySelectorAll(".nav-group.is-open").forEach((other) => {
      if (other !== group) {
        other.classList.remove("is-open");
        other.querySelector(".submenu-toggle")?.setAttribute("aria-expanded", "false");
      }
    });
    button.setAttribute("aria-expanded", String(!open));
    group.classList.toggle("is-open", !open);
  });
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
