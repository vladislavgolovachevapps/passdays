/* Site-wide language preference.
   The choice is stored once and applies across Home, Privacy and Terms.
   Works as progressive enhancement: every page also has plain <a> links,
   so the site is fully usable with JavaScript disabled. */
(function () {
  "use strict";

  // 0) Theme toggle (light default, dark opt-in).
  //    The initial theme is applied by a tiny inline script in <head> to avoid
  //    a flash; here we just wire the toggle button and enable transitions.
  var THEME_KEY = "passdays_theme";
  function applyTheme(t) {
    var dark = t === "dark";
    if (dark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    // Keep the mobile browser chrome / status-bar tint in sync with the theme.
    // Without this, the top strip keeps the previous theme's color until a full
    // re-render (e.g. rotating the device).
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) { meta.setAttribute("content", dark ? "#000000" : "#fdf7ee"); }
  }
  // Enable smooth color transitions only after first paint (no load flash).
  // Use rAF when the tab is visible; fall back to a timeout so the class is
  // still added in background tabs / webviews where rAF can be throttled.
  function enableThemeTransitions() { document.body.classList.add("theme-ready"); }
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(function () {
      requestAnimationFrame(enableThemeTransitions);
    });
  }
  setTimeout(enableThemeTransitions, 120);
  var themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    // Reflect the current theme (set by the inline head script) on the button.
    themeBtn.setAttribute(
      "aria-pressed",
      String(document.documentElement.getAttribute("data-theme") === "dark")
    );
    themeBtn.addEventListener("click", function () {
      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      var next = isDark ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* private mode */ }
      themeBtn.setAttribute("aria-pressed", String(next === "dark"));
    });
  }

  var KEY = "passdays_lang";
  var current = document.documentElement.lang === "ru" ? "ru" : "en";

  function store(lang) {
    try { localStorage.setItem(KEY, lang); } catch (e) { /* private mode */ }
  }

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  // 1) Remember the language whenever the user picks one from the menu.
  var switches = document.querySelectorAll("[data-set-lang]");
  for (var i = 0; i < switches.length; i++) {
    switches[i].addEventListener("click", function () {
      store(this.getAttribute("data-set-lang"));
    });
  }

  // 1b) Language popup menu: open/close behaviour.
  var langMenu = document.querySelector(".lang-menu");
  if (langMenu) {
    var langTrigger = langMenu.querySelector(".lang-trigger");
    function setMenu(open) {
      langMenu.setAttribute("data-open", String(open));
      langTrigger.setAttribute("aria-expanded", String(open));
    }
    langTrigger.addEventListener("click", function (e) {
      e.stopPropagation();
      setMenu(langMenu.getAttribute("data-open") !== "true");
    });
    // Click outside closes it.
    document.addEventListener("click", function (e) {
      if (!langMenu.contains(e.target)) { setMenu(false); }
    });
    // Escape closes it and returns focus to the trigger.
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && langMenu.getAttribute("data-open") === "true") {
        setMenu(false);
        langTrigger.focus();
      }
    });
  }

  // 2) On load, honour a previously chosen language site-wide.
  //    If the visitor preferred RU but landed on an EN page (e.g. a shared
  //    link or the App Store privacy URL), send them to the RU counterpart.
  var pref = read();
  if (pref && pref !== current) {
    var alt = document.querySelector('link[rel="alternate"][hreflang="' + pref + '"]');
    if (alt && alt.href) {
      window.location.replace(alt.href);
      return; // we're navigating away; skip reveal setup
    }
  }

  // 3) Scroll-reveal for landing sections.
  //    Progressive enhancement: classes are added by JS, so visitors without
  //    JavaScript (or with reduced-motion) always see fully visible content.
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var targets = document.querySelectorAll(".section-head, .features");
  if (!targets.length) return;

  // No IntersectionObserver or reduced motion → just show everything.
  if (reduceMotion || !("IntersectionObserver" in window)) {
    return;
  }

  for (var j = 0; j < targets.length; j++) {
    targets[j].classList.add("reveal");
  }

  function show(el) { el.classList.add("is-visible"); }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        show(entry.target);
        observer.unobserve(entry.target); // reveal once, then stop watching
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  for (var k = 0; k < targets.length; k++) {
    observer.observe(targets[k]);
  }

  // Safety net: if the observer never fires (e.g. odd viewport, embedded
  // webview), reveal everything after a short delay so content is never
  // left invisible.
  setTimeout(function () {
    for (var m = 0; m < targets.length; m++) {
      if (!targets[m].classList.contains("is-visible")) show(targets[m]);
    }
  }, 1200);
})();
