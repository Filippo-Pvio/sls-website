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

const primaryLinks = navGroups.map((group, index) => {
  const submenuId = `desktop-submenu-${index}`;
  const submenuLinks = group.items.map(([label, href, description]) =>
    `<a class="floating-dropdown-link" href="${href}"><strong>${label}</strong><span>${description}</span></a>`
  ).join("");
  return `<div class="floating-nav-group">
    <a class="floating-nav-link" href="${group.href}"${isActive(group.href) ? ' aria-current="page"' : ""}>${group.label}</a>
    <button class="floating-nav-trigger" type="button" aria-label="Untermenü ${group.label} öffnen" aria-controls="${submenuId}" aria-expanded="false">${icon("chevron")}</button>
    <div class="floating-nav-dropdown" id="${submenuId}" hidden>${submenuLinks}</div>
  </div>`;
}).join("");

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
      <img src="/assets/logo-sls-horizontal-transparent.png" alt="SLS Immobilienpartner">
    </a>
    <nav class="floating-primary" aria-label="Hauptnavigation">${primaryLinks}</nav>
    ${document.body.classList.contains("home-editorial") ? '<a class="floating-scroll-cta" href="/immobilienbewertung/"><span class="floating-scroll-cta-full">Kostenlos bewerten</span><span class="floating-scroll-cta-short">Bewerten</span></a>' : ""}
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
        <button class="offcanvas-close" type="button" data-nav-close aria-label="Menü schließen">${icon("close")}</button>
      </div>
      <p class="offcanvas-intro">Womit können wir helfen?</p>
      <div class="fullscreen-nav-grid">${overlaySections}</div>
      <div class="fullscreen-nav-bottom">
        <a href="/blog/">Magazin</a><a href="/presse/">Presse</a><a href="/kontakt/">Kontakt</a>
      </div>
    </div>
  </nav>`;

const isEditorialHome = document.body.classList.contains("home-editorial");
document.querySelector("[data-site-footer]").innerHTML = `
  ${isEditorialHome ? "" : `<section class="trust-strip" aria-label="Vertrauen und Mitgliedschaften">
    <div class="wrap trust-grid">
      <div><strong>Top bewertet</strong><span>Kundenstimmen aus Google</span></div>
      <div><strong>IVD Mitglied</strong><span>Immobilienverband Deutschland</span></div>
      <div><strong>ImmoScout24</strong><span>GoldPartner</span></div>
      <div><strong>30+ Standorte</strong><span>in Nordrhein-Westfalen</span></div>
    </div>
  </section>`}
  <div class="footer-inner">
    <div class="footer-lead">
      <a class="brand" href="/" aria-label="SLS Immobilienpartner Startseite"><img class="brand-logo" src="/assets/logo-sls.svg" alt="SLS Immobilienpartner" width="267" height="170"></a>
      <p>${isEditorialHome ? 'Wir verkaufen <span class="footer-owner-emphasis">Ihre Immobilie</span>, als wäre sie unsere eigene.' : 'Wir verkaufen Ihre Immobilie, als wäre sie unsere eigene.'}</p>
    </div>
    <div><h2>Eigentümer</h2><a href="/immobilienbewertung/">Immobilienbewertung</a><a href="/verkaufen/">Verkaufen</a><a href="/service/">Service</a><a href="/faq/">Fragen & Antworten</a><a href="/referenzen/">Referenzen</a></div>
    <div><h2>Interessenten</h2><a href="/kaufen/">Kaufen</a><a href="/finanzierung/">Finanzierung</a><a href="/immobilien/">Immobilien</a><a href="/downloads/">Ratgeber</a></div>
    <div><h2>SLS</h2><a href="/ueber-uns/">Über uns</a><a href="/team/">Team</a><a href="/standorte/">Standorte</a><a href="/karriere/">Karriere</a><a href="/blog/">Blog</a></div>
    <div><h2>Kontakt</h2><a href="tel:+4923697428020">02369 742 80 20</a><a href="mailto:service@sls.de">service@sls.de</a><p>Ubierweg 2 · 46286 Dorsten</p><p>Königsallee 19 · 40213 Düsseldorf</p></div>
  </div>
  <div class="footer-bottom"><span>&copy; 2026 SLS Immobilienpartner GmbH</span><span><a href="https://sls.de/datenschutz/">Datenschutz</a><a href="https://sls.de/impressum/">Impressum</a></span></div>`;

const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("#site-nav");
const header = document.querySelector("[data-site-header]");

const desktopNav = document.querySelector(".floating-primary");
const desktopGroups = [...desktopNav.querySelectorAll(".floating-nav-group")];
const desktopBreakpoint = window.matchMedia("(min-width: 981px)");

const closeDesktopMenus = (except) => {
  desktopGroups.forEach((group) => {
    if (group === except) return;
    const trigger = group.querySelector(".floating-nav-trigger");
    group.querySelector(".floating-nav-dropdown").hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-label", `Untermenü ${group.querySelector(".floating-nav-link").textContent} öffnen`);
  });
};
const openDesktopMenu = (group) => {
  if (!desktopBreakpoint.matches) return;
  closeDesktopMenus(group);
  const trigger = group.querySelector(".floating-nav-trigger");
  group.querySelector(".floating-nav-dropdown").hidden = false;
  trigger.setAttribute("aria-expanded", "true");
  trigger.setAttribute("aria-label", `Untermenü ${group.querySelector(".floating-nav-link").textContent} schließen`);
};
desktopGroups.forEach((group) => {
  group.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") openDesktopMenu(group);
  });
  group.addEventListener("pointerleave", () => {
    if (!group.contains(document.activeElement)) closeDesktopMenus();
  });
  group.addEventListener("focusin", () => openDesktopMenu(group));
  group.addEventListener("focusout", (event) => {
    if (!group.contains(event.relatedTarget)) closeDesktopMenus();
  });
  group.querySelector(".floating-nav-trigger").addEventListener("click", () => openDesktopMenu(group));
  group.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      group.querySelector(".floating-nav-trigger").focus();
      closeDesktopMenus();
    }
  });
});
document.addEventListener("pointerdown", (event) => {
  if (!desktopNav.contains(event.target)) closeDesktopMenus();
});
window.addEventListener("resize", () => closeDesktopMenus());

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

const heroValuation = document.querySelector('.hero-actions a[href="/immobilienbewertung/"]');
if (heroValuation) {
  const syncValuation = () => {
    header.classList.toggle("has-scroll-cta", heroValuation.getBoundingClientRect().bottom <= 0);
  };
  if ("IntersectionObserver" in window) {
    const valuationObserver = new IntersectionObserver(syncValuation, { threshold: 0 });
    valuationObserver.observe(heroValuation);
  } else {
    window.addEventListener("scroll", syncValuation, { passive: true });
    window.addEventListener("resize", syncValuation, { passive: true });
    syncValuation();
  }
}

// Keep a direct call option within reach on the mobile homepage after the hero.
if (isEditorialHome) {
  const hero = document.querySelector(".hero-premium");
  const finalCall = document.querySelector('.premium-final-cta a[href^="tel:"]');
  const footer = document.querySelector(".site-footer");
  if (hero && finalCall && footer) {
    const mobileCall = document.createElement("a");
    mobileCall.className = "mobile-call-cta";
    mobileCall.href = "tel:+4923697428020";
    mobileCall.setAttribute("aria-label", "SLS telefonisch anrufen");
    mobileCall.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.91.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg><span>Anrufen</span>';
    mobileCall.hidden = true;
    document.body.appendChild(mobileCall);

    let scheduled = false;
    const syncMobileCall = () => {
      scheduled = false;
      const videoPlayingInView = [...document.querySelectorAll(".home-value-interview-media iframe")].some((frame) => {
        const bounds = frame.getBoundingClientRect();
        return bounds.top < window.innerHeight && bounds.bottom > 0;
      });
      const show = window.matchMedia("(max-width: 760px)").matches
        && hero.getBoundingClientRect().bottom <= 0
        && finalCall.getBoundingClientRect().top > window.innerHeight - 80
        && footer.getBoundingClientRect().top > window.innerHeight
        && !document.body.classList.contains("menu-open")
        && !videoPlayingInView;
      mobileCall.hidden = !show;
    };
    const scheduleMobileCall = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(syncMobileCall);
    };
    window.addEventListener("scroll", scheduleMobileCall, { passive: true });
    window.addEventListener("resize", scheduleMobileCall, { passive: true });
    document.querySelectorAll("[data-home-interview-play], [data-home-roomtour-play]").forEach((button) => {
      button.addEventListener("click", scheduleMobileCall);
    });
    new MutationObserver(scheduleMobileCall).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    scheduleMobileCall();
  }
}

if (document.body.classList.contains("home-editorial") && "IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.body.classList.add("home-copy-motion-ready");
}
const observeOnce = (selector, options) => document.querySelectorAll(selector).forEach((element) => {
  const observer = new IntersectionObserver(([entry], obs) => {
    if (entry.isIntersecting) {
      element.classList.add("is-visible");
      obs.disconnect();
    }
  }, options);
  observer.observe(element);
});
observeOnce(".reveal", { threshold: 0.08 });
observeOnce(".home-copy-motion-ready .home-copy-reveal", { threshold: 0.01, rootMargin: "0px 0px -22% 0px" });

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
