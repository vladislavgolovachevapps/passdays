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
    if (t === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
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

  // 1) Remember the language whenever the user clicks the switch.
  var switches = document.querySelectorAll("[data-set-lang]");
  for (var i = 0; i < switches.length; i++) {
    switches[i].addEventListener("click", function () {
      store(this.getAttribute("data-set-lang"));
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

  // 3) Contact form (support page) → Web3Forms, no page reload.
  //    Static-site friendly: the form POSTs to Web3Forms, which emails the
  //    submission to us. No backend of our own. Falls back to a normal POST
  //    (and the plain mailto: link on the page) if JavaScript is unavailable.
  var form = document.getElementById("contact-form");
  if (form) {
    var status = document.getElementById("form-status");
    var lang = document.documentElement.lang === "ru" ? "ru" : "en";
    var T = {
      en: {
        sending: "Sending…",
        ok: "Thanks! Your message has been sent — we'll reply by email.",
        err: "Something went wrong. Please email us directly at vladislavgolovachevsupport@gmail.com.",
        nokey: "The form isn't configured yet. Please email vladislavgolovachevsupport@gmail.com."
      },
      ru: {
        sending: "Отправка…",
        ok: "Спасибо! Ваше сообщение отправлено — мы ответим по электронной почте.",
        err: "Что-то пошло не так. Напишите нам напрямую на vladislavgolovachevsupport@gmail.com.",
        nokey: "Форма ещё не настроена. Напишите на vladislavgolovachevsupport@gmail.com."
      }
    }[lang];

    function setStatus(msg, kind) {
      status.textContent = msg;
      status.className = "form-status show " + kind;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var btn = form.querySelector(".btn-send");
      var data = Object.fromEntries(new FormData(form).entries());

      // Guard: refuse to submit with the unconfigured placeholder key.
      if (!data.access_key || data.access_key.indexOf("REPLACE_WITH") === 0) {
        setStatus(T.nokey, "err");
        return;
      }

      var original = btn.textContent;
      btn.disabled = true;
      btn.textContent = T.sending;
      setStatus(T.sending, "ok");

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json(); })
        .then(function (json) {
          if (json.success) {
            form.reset();
            setStatus(T.ok, "ok");
          } else {
            setStatus(T.err, "err");
          }
        })
        .catch(function () { setStatus(T.err, "err"); })
        .then(function () {
          btn.disabled = false;
          btn.textContent = original;
        });
    });
  }

  // 4) Scroll-reveal for landing sections.
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
