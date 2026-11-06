// Botón "volver arriba" para las páginas que no cargan script.js
// (servicios y legales). La home sigue usando initScrollToTop de script.js.
(function () {
    const btn = document.getElementById('scroll-top');
    if (!btn) return;

    function update() {
        btn.classList.toggle('visible', window.scrollY > 300);
    }

    window.addEventListener('scroll', update, { passive: true });
    btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    update();
})();
