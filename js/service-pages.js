document.addEventListener("DOMContentLoaded", function () {
  document.body.classList.add("js-faq-ready");
  initCustomerReviews();
  var mobileMenuButton = document.querySelector(".mobile-menu-btn");
  var navigationMenu = document.querySelector(".nav-menu");

  if (mobileMenuButton && navigationMenu) {
    mobileMenuButton.addEventListener("click", function () {
      var isOpen = navigationMenu.classList.toggle("active");
      mobileMenuButton.classList.toggle("active", isOpen);
      mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
    });

    navigationMenu.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        navigationMenu.classList.remove("active");
        mobileMenuButton.classList.remove("active");
        mobileMenuButton.setAttribute("aria-expanded", "false");
      }
    });
  }

  var languageSwitcher = document.querySelector(".lang-switcher");

  if (languageSwitcher) {
    var languageButton = languageSwitcher.querySelector(".lang-current");

    languageButton.addEventListener("click", function () {
      var isOpen = languageSwitcher.classList.toggle("open");
      languageButton.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", function (event) {
      if (!languageSwitcher.contains(event.target)) {
        languageSwitcher.classList.remove("open");
        languageButton.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        languageSwitcher.classList.remove("open");
        languageButton.setAttribute("aria-expanded", "false");
        languageButton.focus();
      }
    });
  }

  var items = document.querySelectorAll(".faq-item");

  items.forEach(function (item, index) {
    var question = item.querySelector(".faq-question");
    var answer = item.querySelector(".faq-answer");
    if (!question) return;

    if (answer) {
      var answerId = "service-faq-answer-" + index;
      answer.id = answerId;
      question.setAttribute("aria-controls", answerId);
    }

    question.addEventListener("click", function () {
      var wasActive = item.classList.contains("active");

      items.forEach(function (otherItem) {
        if (otherItem === item) return;
        otherItem.classList.remove("active");
        var otherQuestion = otherItem.querySelector(".faq-question");
        if (otherQuestion) otherQuestion.setAttribute("aria-expanded", "false");
      });

      item.classList.toggle("active", !wasActive);
      question.setAttribute("aria-expanded", String(!wasActive));
    });
  });

  var phone = document.querySelector('a[href^="tel:"]');
  var whatsapp = document.querySelector('a[href^="https://wa.me/"]');

  if (phone && whatsapp) {
    var contactBar = document.createElement("aside");
    contactBar.className = "service-mobile-contact";
    contactBar.setAttribute("aria-label", "Contacto rápido");
    contactBar.innerHTML =
      '<a href="' + phone.getAttribute("href") + '">Llamar ahora</a>' +
      '<a href="' + whatsapp.getAttribute("href") + '">WhatsApp</a>';
    document.body.appendChild(contactBar);
  }
});

function initCustomerReviews() {
  var reviews = document.querySelector(".customer-reviews");
  if (!reviews || !reviews.querySelector("[data-featurable-async]")) return;

  observeFeaturableBranding(reviews);

  function loadBundle() {
    if (document.querySelector("script[data-featurable-bundle]")) return;

    var preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = "https://featurable.com";
    preconnect.crossOrigin = "anonymous";
    preconnect.dataset.featurablePreconnect = "true";
    document.head.appendChild(preconnect);

    var script = document.createElement("script");
    script.src = "https://featurable.com/assets/bundle.js";
    script.defer = true;
    script.charset = "UTF-8";
    script.dataset.featurableBundle = "true";
    document.body.appendChild(script);
  }

  if (!("IntersectionObserver" in window)) {
    loadBundle();
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
    loadBundle();
    observer.disconnect();
  }, { rootMargin: "240px 0px", threshold: 0 });

  observer.observe(reviews);
}

function hideFeaturableBranding(shadowRoot) {
  if (!shadowRoot || shadowRoot.querySelector("[data-hide-featurable-branding]")) return;

  var style = document.createElement("style");
  style.dataset.hideFeaturableBranding = "true";
  style.textContent = [
    '[class*="Carousel-module__branding"]',
    '[class*="Branding-module__"]',
    '[class*="brandingContainer"]',
    'a[href*="featurable.com"]',
  ]
    .map(function (selector) {
      return selector + "{display:none!important;visibility:hidden!important;height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;}";
    })
    .join("");

  shadowRoot.appendChild(style);
}

function observeFeaturableBranding(reviews) {
  function scanShadowRoots() {
    reviews.querySelectorAll(".shadow-wrapper").forEach(function (wrapper) {
      if (wrapper.shadowRoot) hideFeaturableBranding(wrapper.shadowRoot);
    });
  }

  scanShadowRoots();

  var observer = new MutationObserver(scanShadowRoots);
  observer.observe(reviews, { childList: true, subtree: true });
}