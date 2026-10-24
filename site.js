/* Shared by every page: the Light / System / Dark theme switch,
   and the "under construction" notice.
   Loaded in <head> so the saved theme applies before the page draws. */

/* ===== UNDER-CONSTRUCTION NOTICE: edit the text here =====
   SHOW: set to false to turn the notice off for everyone.
   It appears on the front page at the start of every visit
   (not again when someone clicks around within the same visit). */
var CONSTRUCTION_NOTICE = {
  SHOW: true,
  label: "Notice · Work in progress",
  title: "Under construction",
  text: "Forewarning: this website is still being built. Some projects are missing details and photos, and pages may change as I add more of my work.",
  button: "Continue"
};

(function () {
  var N = CONSTRUCTION_NOTICE, KEY = "portfolio-notice-seen", root = document.documentElement;
  if (!N.SHOW) return;
  // Only on the front page (marked with <meta name="portfolio-page" content="home">)
  if (!document.querySelector('meta[name="portfolio-page"][content="home"]')) return;
  // sessionStorage resets when the tab or browser is closed, so every new visit sees it
  var seen = null;
  try { seen = sessionStorage.getItem(KEY); } catch (e) {}
  if (seen) return;

  root.classList.add("notice-pending");   // hides the page until the notice is up

  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }

  document.addEventListener("DOMContentLoaded", function () {
    var el = document.createElement("div");
    el.className = "notice";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "notice-title");
    el.innerHTML =
      '<div class="notice-card">' +
        '<div class="notice-tape" aria-hidden="true"></div>' +
        '<div class="notice-body">' +
          '<span class="label">' + esc(N.label) + '</span>' +
          '<h2 id="notice-title">' + esc(N.title) + '</h2>' +
          '<p>' + esc(N.text) + '</p>' +
          '<button type="button" class="notice-go">' + esc(N.button) +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="notice-tape" aria-hidden="true"></div>' +
      '</div>';
    document.body.appendChild(el);
    root.classList.remove("notice-pending");
    root.classList.add("notice-open");
    var btn = el.querySelector(".notice-go");
    btn.focus();

    function close() {
      try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
      root.classList.remove("notice-open");
      el.classList.add("notice-leaving");
      setTimeout(function(){ el.remove(); }, 250);
    }
    btn.addEventListener("click", close);
    el.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
      if (e.key === "Tab") { e.preventDefault(); btn.focus(); }   // keep focus inside the notice
    });
  });
})();

(function () {
  var KEY = "portfolio-theme";
  var root = document.documentElement;

  function apply(mode) {
    if (mode === "light" || mode === "dark") root.setAttribute("data-site-theme", mode);
    else root.removeAttribute("data-site-theme");
    var btns = document.querySelectorAll(".theme-switch button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute("aria-pressed", String(btns[i].dataset.mode === (mode || "system")));
    }
  }

  var saved = "system";
  try { saved = localStorage.getItem(KEY) || "system"; } catch (e) {}
  apply(saved);

  document.addEventListener("DOMContentLoaded", function () {
    apply(saved);
    var btns = document.querySelectorAll(".theme-switch button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        saved = this.dataset.mode;
        apply(saved);
        try { localStorage.setItem(KEY, saved); } catch (e) {}
      });
    }
  });
})();

/* A clickable project card "pops up" while it's crossing the middle of the
   screen, and drops back down once it leaves (mouse-over still works too). */
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var cards = document.querySelectorAll("a.sheet");
    if (!cards.length) return;
    var ticking = false;
    function update() {
      ticking = false;
      var mid = window.innerHeight / 2;
      for (var i = 0; i < cards.length; i++) {
        var r = cards[i].getBoundingClientRect();
        cards[i].classList.toggle("in-view", r.top <= mid && r.bottom >= mid);
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  });
})();
