const navGroups = [
  { label: "Verkaufen", href: "/verkaufen/", kicker: "Für Eigentümer", items: [
    ["Immobilie verkaufen", "/verkaufen/", "Unser Prozess von Bewertung bis Übergabe"],
    ["Immobilienbewertung", "/immobilienbewertung/", "Kostenlos und unverbindlich starten"],
    ["Referenzen", "/referenzen/", "Erfolgreich vermittelte Immobilien"]
  ]},
  { label: "Immobilien", href: "/immobilien/", kicker: "Finden", items: [
    ["Aktuelle Immobilien", "/immobilien/", "Häuser, Wohnungen & besondere Objekte"],
    ["Immobilie kaufen", "/kaufen/", "Vom Suchprofil bis zum Notartermin"],
    ["Finanzierung", "/finanzierung/", "Budget frühzeitig realistisch einordnen"],
    ["Suchprofil anlegen", "/suchprofil/", "Passende Angebote früher erhalten"]
  ]},
  { label: "Wissen & Netzwerk", href: "/faq/", kicker: "Orientierung", items: [
    ["Immobilienwissen", "/faq/", "Fragen & Antworten rund um Immobilien"],
    ["Ratgeber", "/downloads/", "Wissen für Ihre Verkaufsentscheidung"],
    ["Magazin", "/blog/", "News & Immobilienwissen"],
    ["Netzwerk von SLS Immobilienpartner", "/netzwerk/", "Fachbetriebe & Ansprechpartner rund um Immobilien"]
  ]},
  { label: "Standorte", href: "/standorte/", kicker: "In NRW zuhause", items: [
    ["Unsere Marktgebiete", "/standorte/", "Ruhrgebiet & Rheinland"],
    ["Büro Dorsten", "/immobilienmakler-dorsten/", "Unser Büro im Ruhrgebiet"],
    ["Büro Düsseldorf", "/immobilienmakler-dusseldorf/", "Unser Büro im Rheinland"]
  ]},
  { label: "Über uns", href: "/ueber-uns/", kicker: "Unternehmen", items: [
    ["Über uns", "/ueber-uns/", "Wer wir sind und wie wir arbeiten"],
    ["Team", "/team/", "Ihre Ansprechpartner bei SLS Immobilienpartner"],
    ["Werte", "/werte/", "Wofür SLS Immobilienpartner steht"],
    ["Karriere", "/karriere/", "Gemeinsam Immobilien neu denken"],
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

const mobileNavGroups = [
  { ...navGroups[0], mobileLabel: "Verkaufen" },
  { ...navGroups[1], mobileLabel: "Immobilien finden" },
  { ...navGroups[2], mobileLabel: "Wissen & Netzwerk" },
  { ...navGroups[3], mobileLabel: "Standorte" },
  {
    ...navGroups[4],
    mobileLabel: "Über uns",
    items: navGroups[4].items.filter(([label]) => label !== "Kontakt")
  }
];

const overlaySections = mobileNavGroups.map((group, index) => {
  const panelId = `mobile-nav-panel-${index}`;
  const links = group.items.map(([label, href]) =>
    `<a class="overlay-sub-link" href="${href}">${label}</a>`
  ).join("");
  return `<section class="overlay-nav-section">
    <button class="overlay-main-toggle" type="button" aria-expanded="false" aria-controls="${panelId}">
      <span>${group.mobileLabel || group.label}</span>
      <span class="overlay-main-toggle-icon" aria-hidden="true">+</span>
    </button>
    <div class="overlay-subgrid" id="${panelId}" hidden>${links}</div>
  </section>`;
}).join("");

const isEditorialHome = document.body.classList.contains("home-editorial");
const isPropertyPreview = document.body.classList.contains("property-preview");
const hasHeaderValuationCta = isEditorialHome || isPropertyPreview;
const valuationCtaLabel = isPropertyPreview ? "Immobilie bewerten" : "Kostenlos bewerten";

document.querySelector("[data-site-header]").innerHTML = `
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
  <div class="floating-header-shell">
    <a class="floating-brand" href="/" aria-label="SLS Immobilienpartner Startseite">
      <img src="/assets/logo-sls-horizontal-transparent.png" alt="SLS Immobilienpartner">
    </a>
    <nav class="floating-primary" aria-label="Hauptnavigation">${primaryLinks}</nav>
    ${hasHeaderValuationCta ? `<a class="floating-scroll-cta" href="/immobilienbewertung/"><span class="floating-scroll-cta-full">${valuationCtaLabel}</span><span class="floating-scroll-cta-short">Bewerten</span></a>` : ""}
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
        <a href="/kontakt/">Kontakt</a>
      </div>
      <a class="offcanvas-valuation-cta" href="/immobilienbewertung/">Immobilie kostenlos bewerten</a>
    </div>
  </nav>`;

const footer = document.querySelector("[data-site-footer]");
footer.classList.add("footer-unified");
const footerGroups = navGroups.map((group, index) => `<details class="footer-group" open>
  <summary><h2>${group.label}</h2><span aria-hidden="true">+</span></summary>
  <nav aria-label="Footer: ${group.label}">${group.items.map(([label, href]) => `<a href="${href}">${label}</a>`).join("")}</nav>
</details>`).join("");
footer.innerHTML = `
  <div class="footer-unified-wrap">
    <div class="footer-intro-row">
      <div class="footer-lead">
        <a class="brand" href="/" aria-label="SLS Immobilienpartner Startseite"><img class="brand-logo" src="/assets/logo-sls.svg" alt="SLS Immobilienpartner" width="267" height="170" loading="lazy"></a>
        <p>Wir verkaufen <span class="footer-owner-emphasis">Ihre Immobilie</span>, als wäre sie unsere eigene.</p>
        <nav class="footer-social" aria-label="SLS Immobilienpartner auf Social Media"><a href="https://www.instagram.com/sls_immobilienpartner/" target="_blank" rel="noopener noreferrer" aria-label="SLS Immobilienpartner auf Instagram (öffnet in neuem Tab)" title="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a><a href="https://www.linkedin.com/company/sls-immobilienpartner/" target="_blank" rel="noopener noreferrer" aria-label="SLS Immobilienpartner auf LinkedIn (öffnet in neuem Tab)" title="LinkedIn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="7" cy="8" r="1" fill="currentColor" stroke="none"/><path d="M7 11v7m4 0v-7m0 3a3 3 0 0 1 6 0v4"/></svg></a><a href="https://www.facebook.com/people/SLS-Immobilienpartner/61562917415040/" target="_blank" rel="noopener noreferrer" aria-label="SLS Immobilienpartner auf Facebook (öffnet in neuem Tab)" title="Facebook"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.5 21v-8h2.7l.4-3.2h-3.1V7.8c0-.9.3-1.5 1.6-1.5h1.7V3.4c-.8-.1-1.7-.2-2.6-.2-2.7 0-4.5 1.6-4.5 4.7v1.9H9V13h2.7v8z"/></svg></a><a href="https://www.youtube.com/@SLSImmobilienpartnerGmbH" target="_blank" rel="noopener noreferrer" aria-label="SLS Immobilienpartner auf YouTube (öffnet in neuem Tab)" title="YouTube"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="5"/><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none"/></svg></a></nav>
      </div>
      <div class="footer-contact">
        <h2>Persönlich für Sie da</h2>
        <a class="footer-phone" href="tel:+4923697428020">02369 742 80 20</a>
        <a href="mailto:service@sls.de">service@sls.de</a>
        <a class="footer-contact-link" href="/kontakt/">Kontakt aufnehmen <span aria-hidden="true">→</span></a>
      </div>
      <div class="footer-offices">
        <h2>Unsere Büros</h2>
        <a href="/immobilienmakler-dorsten/"><strong>Dorsten</strong><span>Ubierweg 2 · 46286 Dorsten</span></a>
        <a href="/immobilienmakler-dusseldorf/"><strong>Düsseldorf</strong><span>Königsallee 19 · 40213 Düsseldorf</span></a>
      </div>
    </div>
    <div class="footer-navigation">${footerGroups}</div>
    <div class="footer-legal"><span>&copy; ${new Date().getFullYear()} SLS Immobilienpartner GmbH</span><nav aria-label="Rechtliche Informationen"><a href="https://sls.de/datenschutz/">Datenschutz</a><a href="https://sls.de/impressum/">Impressum</a></nav></div>
  </div>`;
const footerMobile = window.matchMedia("(max-width: 680px)");
const syncFooterGroups = () => footer.querySelectorAll(".footer-group").forEach(group => { group.open = !footerMobile.matches; });
syncFooterGroups();
footerMobile.addEventListener("change", syncFooterGroups);
footer.querySelectorAll(".footer-group summary").forEach(summary => summary.addEventListener("click", event => {
  if (!footerMobile.matches) event.preventDefault();
}));

/* SIA is a global site assistant. Pages that already include it keep their existing script. */
if (!document.querySelector('script[src="/assets/sia-widget.js"]')) {
  const siaScript = document.createElement("script");
  siaScript.src = "/assets/sia-widget.js";
  siaScript.defer = true;
  document.head.appendChild(siaScript);
}

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

nav.querySelectorAll(".overlay-main-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const willOpen = button.getAttribute("aria-expanded") !== "true";
    nav.querySelectorAll(".overlay-main-toggle").forEach((other) => {
      const panel = document.getElementById(other.getAttribute("aria-controls"));
      const open = other === button && willOpen;
      other.setAttribute("aria-expanded", String(open));
      other.querySelector(".overlay-main-toggle-icon").textContent = open ? "−" : "+";
      if (panel) panel.hidden = !open;
    });
  });
});


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
} else if (isPropertyPreview) {
  const syncPropertyValuation = () => {
    header.classList.toggle("has-scroll-cta", window.scrollY > 28);
  };
  window.addEventListener("scroll", syncPropertyValuation, { passive: true });
  window.addEventListener("resize", syncPropertyValuation, { passive: true });
  syncPropertyValuation();
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

const socialPlatforms = document.querySelector(".home-reach-platforms");
if (socialPlatforms && "IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const socialObserver = new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting) return;
    socialPlatforms.classList.add("is-spotlit");
    observer.disconnect();
  }, { threshold: 0.35, rootMargin: "0px 0px -12% 0px" });
  socialObserver.observe(socialPlatforms);
}


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
