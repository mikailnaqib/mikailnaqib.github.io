/* Shared by every page: the Light / System / Dark theme switch.
   Loaded in <head> so the saved theme applies before the page draws. */
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
