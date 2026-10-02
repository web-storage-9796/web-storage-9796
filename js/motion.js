// ======================================
// Motion: cabecera al hacer scroll y revelado de bloques
// ======================================

(function () {
  var header = document.querySelector(".header");

  if (header) {
    var syncHeader = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
    };
    syncHeader();
    window.addEventListener("scroll", syncHeader, { passive: true });
  }

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (prefersReducedMotion || !("IntersectionObserver" in window)) return;

  var selectors = [
    ".section-header",
    ".services-grid > .service-card",
    ".features-grid > .feature-card",
    ".communities-star-service",
    ".seo-content-card",
    ".zone-column",
    ".map-embed-wrapper",
    ".zones-note",
    ".google-reviews-board",
    ".faq-list > .faq-item",
    ".contact-card",
    ".contact-form-wrapper",
    ".service-grid > .service-card",
    ".service-section",
    ".service-faq > h2",
    ".service-faq-list > .faq-item",
    ".customer-reviews",
    ".community-services-heading",
    ".community-service-card",
    ".community-catalogue",
    ".footer-section",
  ].join(",");

  var elements = Array.prototype.slice.call(document.querySelectorAll(selectors));
  var viewportBottom = window.innerHeight * 0.92;
  var pending = elements.filter(function (element) {
    // Lo que ya se ve al cargar no se oculta: evita parpadeos y no afecta al LCP.
    return element.getBoundingClientRect().top > viewportBottom;
  });
  if (!pending.length) return;

  document.documentElement.classList.add("js-reveal");

  var siblingIndex = new Map();
  pending.forEach(function (element) {
    var parent = element.parentElement;
    var index = siblingIndex.get(parent) || 0;
    siblingIndex.set(parent, index + 1);
    element.style.setProperty("--reveal-delay", (index % 4) * 90 + "ms");
    element.classList.add("reveal");
  });

  var finish = function (element) {
    element.classList.remove("reveal", "is-revealed");
    element.style.removeProperty("--reveal-delay");
  };

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var element = entry.target;
        observer.unobserve(element);
        element.classList.add("is-revealed");
        // Al terminar se retiran las clases para devolver las transiciones propias (hover).
        element.addEventListener(
          "transitionend",
          function onEnd(event) {
            if (event.target !== element || event.propertyName !== "opacity") return;
            element.removeEventListener("transitionend", onEnd);
            finish(element);
          },
        );
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0 },
  );

  pending.forEach(function (element) {
    observer.observe(element);
  });
})();
