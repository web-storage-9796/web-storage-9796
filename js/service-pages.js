document.addEventListener("DOMContentLoaded", function () {
  document.body.classList.add("js-faq-ready");
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