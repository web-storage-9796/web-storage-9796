// ======================================
// DOM Content Loaded
// ======================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize i18n system first
    // await i18n.init();

    // Initialize above-fold / interaction-critical features immediately
    initMobileMenu();
    initLangSwitcher();
    initBrowserLanguageSuggestion();
    initContactFormTracking();
    initScrollToTop();
    initSmoothScroll();
    initCookieBanner();
    initReopenCookieBanner();

    // Defer below-fold work so it doesn't block LCP paint
    const defer = window.requestIdleCallback
        ? cb => requestIdleCallback(cb, { timeout: 2000 })
        : cb => setTimeout(cb, 200);

    defer(function() {
        initFAQ();
        adaptMapZoom();
    });
});

// ======================================
// Adapt Map Zoom on Mobile
// ======================================

function adaptMapZoom() {
    const iframe = document.getElementById('map-iframe');
    const base = 'https://www.google.com/maps/d/u/3/embed?mid=13kZYriuUxUpsJt3kzK1FVElKeX04L9U&ehbc=2E312F&noprof=1';
    const zoom = window.innerWidth < 768 ? 10 : 11; // lower zoom on mobile
    iframe.src = base + '&z=' + zoom;
}

// ======================================
// Mobile Menu Toggle
// ======================================

function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    if (!mobileMenuBtn || !navMenu) return;
    
    // Toggle menu on button click
    mobileMenuBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        navMenu.classList.toggle('active');
        
        // Prevent body scroll when menu is open
        if (navMenu.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });
    
    // Close menu when clicking on a nav link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            mobileMenuBtn.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!navMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            mobileMenuBtn.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// ======================================
// FAQ Accordion
// ======================================

function initFAQ() {
    document.body.classList.add('js-faq-ready');
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        if (!question) return;
        
        question.addEventListener('click', function() {
            // Close other open items
            const wasActive = item.classList.contains('active');
            
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    const otherQuestion = otherItem.querySelector('.faq-question');
                    if (otherQuestion) {
                        otherQuestion.setAttribute('aria-expanded', 'false');
                    }
                }
            });
            
            // Toggle current item
            if (wasActive) {
                item.classList.remove('active');
                question.setAttribute('aria-expanded', 'false');
            } else {
                item.classList.add('active');
                question.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

// ======================================
// Contact Form
// ======================================

// El formulario (envío, validación, verificación anti-spam y respaldo por WhatsApp) vive en
// shared/forms/contact-form.ts y se inicia desde HomePage.astro; aquí solo se
// registra el resultado en analítica.
function initContactFormTracking() {
    document.addEventListener('contact-form:success', function() {
        trackEvent('Contact', 'Form Submit', 'Success');
    });
    document.addEventListener('contact-form:error', function() {
        trackEvent('Contact', 'Form Submit', 'Error');
    });
}

// ======================================
// Scroll to Top Button
// ======================================

function initScrollToTop() {
    const scrollTopBtn = document.getElementById('scroll-top');
    const logo = document.querySelector('.logo');
    const contactCards = document.querySelector('.contact-info');
    if (!scrollTopBtn && !logo) return;

    function scrollToTopSmooth() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    function updateScrollTopVisibility() {
        if (!scrollTopBtn) return;

        const scrollY = window.scrollY;
        const show = scrollY > 300;
        scrollTopBtn.classList.toggle('visible', show);
        const mobileCta = document.querySelector('.mobile-cta-widget');
        const contactCardsVisible = contactCards &&
            contactCards.getBoundingClientRect().top < window.innerHeight &&
            contactCards.getBoundingClientRect().bottom > 0;
        if (mobileCta) mobileCta.classList.toggle('visible', show && !contactCardsVisible);
    }

    function syncScrollTopButtonState() {
        updateScrollTopOffset();
        updateScrollTopVisibility();
    }
    
    // Show/hide button based on scroll position
    if (scrollTopBtn) {
        window.addEventListener('scroll', syncScrollTopButtonState, { passive: true });
    }
    
    // Scroll to top on click
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', function() {
            scrollToTopSmooth();
        });
    }

    if (logo) {
        logo.addEventListener('click', function(e) {
            e.preventDefault();
            scrollToTopSmooth();
        });
    }

    window.addEventListener('resize', debounce(syncScrollTopButtonState, 100));
    window.addEventListener('load', syncScrollTopButtonState, { once: true });

    syncScrollTopButtonState();

    // Run one extra sync after entrance animations settle.
    setTimeout(syncScrollTopButtonState, 650);

    requestAnimationFrame(function() {
        syncScrollTopButtonState();
    });
}

// ======================================
// Smooth Scroll for Anchor Links
// ======================================

function initSmoothScroll() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if it's just "#"
            if (href === '#') return;
            
            const target = document.querySelector(href);
            
            if (target) {
                e.preventDefault();

                // Read both geometry values before any writes to avoid forced reflow.
                const header = document.querySelector('.header');
                const headerHeight = header ? header.offsetHeight : 0;
                const targetTop = target.getBoundingClientRect().top;

                const targetPosition = targetTop + window.pageYOffset - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ======================================
// Cookie Consent Banner
// ======================================

const COOKIE_CONSENT_KEY = 'cookieConsentChoice';
const MOBILE_BREAKPOINT_QUERY = '(max-width: 900px)';

function initCookieBanner() {
    const cookieBanner = document.getElementById('cookieBanner');
    if (!cookieBanner) return;

    const acceptBtn = document.getElementById('cookieAcceptBtn');
    const rejectBtn = document.getElementById('cookieRejectBtn');
    const storedChoice = safeGetLocalStorage(COOKIE_CONSENT_KEY);

    if (acceptBtn) {
        acceptBtn.addEventListener('click', function() {
            handleCookieChoice('accepted', cookieBanner);
        });
    }

    if (rejectBtn) {
        rejectBtn.addEventListener('click', function() {
            handleCookieChoice('rejected', cookieBanner);
        });
    }

    window.addEventListener('resize', debounce(function() {
        updateCookieBannerOffset(cookieBanner);
    }, 100));

    if (storedChoice === 'accepted' || storedChoice === 'rejected') {
        setCookieBannerVisibility(cookieBanner, false);
        if (storedChoice === 'accepted') initAnalyticsTracking();
        return;
    }

    setCookieBannerVisibility(cookieBanner, true);
}

function initReopenCookieBanner() {
    const reopenLink = document.getElementById('reopenCookieBanner');
    if (!reopenLink) return;

    const cookieBanner = document.getElementById('cookieBanner');
    if (!cookieBanner) return;

    reopenLink.addEventListener('click', function(e) {
        e.preventDefault();
        safeRemoveLocalStorage(COOKIE_CONSENT_KEY);
        setCookieBannerVisibility(cookieBanner, true);
    });
}

function handleCookieChoice(choice, cookieBanner) {
    safeSetLocalStorage(COOKIE_CONSENT_KEY, choice);
    setCookieBannerVisibility(cookieBanner, false);
    if (choice === 'accepted') initAnalyticsTracking();
    trackEvent('Cookies', 'Consent', choice);
}

function setCookieBannerVisibility(cookieBanner, isVisible) {
    if (!cookieBanner) return;

    cookieBanner.hidden = !isVisible;

    if (!isVisible) {
        document.body.classList.remove('cookie-banner-visible');
        document.documentElement.style.setProperty('--cookie-banner-offset', '0px');
        setTimeout(updateScrollTopOffset, 500);
        return;
    }

    // Measure after paint to capture final rendered height.
    requestAnimationFrame(function() {
        updateCookieBannerOffset(cookieBanner);
    });
}

function updateCookieBannerOffset(cookieBanner) {
    // ── READS (all geometry before any DOM writes) ──────────────────────────
    const isMobile = window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
    const bannerVisible = isFloatingElementVisible(cookieBanner);
    const bannerRect = bannerVisible ? cookieBanner.getBoundingClientRect() : null;
    const viewportHeight = isMobile ? window.innerHeight : 0;

    // ── COMPUTE ─────────────────────────────────────────────────────────────
    const extraSpacing = isMobile ? 10 : 12;
    const bannerOffset = bannerRect ? Math.ceil(bannerRect.height + extraSpacing) : 0;

    let scrollTopOffset = 0;
    if (isMobile && bannerRect) {
        scrollTopOffset = Math.max(0, Math.ceil(viewportHeight - bannerRect.top) + 10);
    }

    // ── WRITES (all at once, after all reads) ────────────────────────────────
    if (bannerVisible) {
        document.body.classList.add('cookie-banner-visible');
        document.documentElement.style.setProperty('--cookie-banner-offset', bannerOffset + 'px');
    } else {
        document.body.classList.remove('cookie-banner-visible');
        document.documentElement.style.setProperty('--cookie-banner-offset', '0px');
    }
    document.documentElement.style.setProperty('--scroll-top-offset', isMobile ? scrollTopOffset + 'px' : '0px');
}

function updateScrollTopOffset() {
    if (!window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches) {
        document.documentElement.style.setProperty('--scroll-top-offset', '0px');
        return;
    }

    const floatingElements = [
        document.getElementById('cookieBanner')
    ];

    // Read all geometry first, then write — avoids forced reflow.
    const viewportHeight = window.innerHeight;
    const rects = floatingElements.map(el => ({
        el,
        rect: isFloatingElementVisible(el) ? el.getBoundingClientRect() : null
    }));

    let maxDistanceFromBottomToTop = 0;

    rects.forEach(({ rect }) => {
        if (!rect) return;

        const distanceFromBottomToTop = Math.ceil(viewportHeight - rect.top);

        if (distanceFromBottomToTop > maxDistanceFromBottomToTop) {
            maxDistanceFromBottomToTop = distanceFromBottomToTop;
        }
    });

    const extraGap = maxDistanceFromBottomToTop > 0 ? 10 : 0;
    const offset = Math.max(0, maxDistanceFromBottomToTop + extraGap);

    document.documentElement.style.setProperty('--scroll-top-offset', offset + 'px');
}

function isFloatingElementVisible(element) {
    if (!element || element.hidden) return false;

    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
        return false;
    }

    const elementRect = element.getBoundingClientRect();
    return elementRect.width > 0 && elementRect.height > 0;
}

function safeGetLocalStorage(key) {
    try {
        return window.localStorage.getItem(key);
    } catch (error) {
        return null;
    }
}

function safeSetLocalStorage(key, value) {
    try {
        window.localStorage.setItem(key, value);
    } catch (error) {
        // Ignore write errors (private mode, blocked storage, etc.).
    }
}

function safeRemoveLocalStorage(key) {
    try {
        window.localStorage.removeItem(key);
    } catch (error) {
        // Ignore errors.
    }
}

// ======================================
// Utility Functions
// ======================================

// Phone number formatting (optional enhancement)
function formatPhoneNumber(input) {
    const phoneInput = document.getElementById('phone');
    
    if (!phoneInput) return;
    
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        // Format as +34 XXX XXX XXX
        if (value.length > 0) {
            if (value.startsWith('34')) {
                value = '+' + value;
            } else if (!value.startsWith('+')) {
                value = '+34' + value;
            }
        }
        
        e.target.value = value;
    });
}

// Call phone formatting if needed
// formatPhoneNumber();

// ======================================
// Performance Optimizations
// ======================================

// Debounce function for scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// La sombra de la cabecera al hacer scroll se gestiona en /js/motion.js?v=679624d4da08 (.is-scrolled)

// ======================================
// Analytics Event Tracking (Google Tag Manager)
// ======================================

const GTM_ID = 'GTM-MJ6NWRV4';

// Only called after the user has accepted cookies.
function initAnalyticsTracking() {
    loadGoogleTagManager();

    document.querySelectorAll('a[href^="tel:"]').forEach(link => {
        link.addEventListener('click', function() {
            trackEvent('Contact', 'Phone Click', this.getAttribute('href'));
        });
    });

    document.querySelectorAll('a[href*="wa.me"]:not([data-form-fallback-whatsapp])').forEach(link => {
        link.addEventListener('click', function() {
            trackEvent('Contact', 'WhatsApp Click', this.getAttribute('href'));
        });
    });

    // El enlace de respaldo del formulario lleva datos personales en la URL: se registra sin ella.
    document.querySelectorAll('[data-form-fallback-whatsapp]').forEach(link => {
        link.addEventListener('click', function() {
            trackEvent('Contact', 'WhatsApp Click', this.dataset.base);
        });
    });

    document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
        link.addEventListener('click', function() {
            trackEvent('Contact', 'Email Click', this.getAttribute('href'));
        });
    });

    document.querySelectorAll('.btn-primary, .btn-secondary').forEach(button => {
        button.addEventListener('click', function() {
            trackEvent('CTA', 'Click', this.textContent.trim());
        });
    });
}

function loadGoogleTagManager() {
    if (window._gtmLoaded || document.getElementById('gtm-script')) return;
    window._gtmLoaded = true;

    const inject = function() {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        const script = document.createElement('script');
        script.id = 'gtm-script';
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
        document.head.appendChild(script);
    };

    if ('requestIdleCallback' in window) {
        requestIdleCallback(inject, { timeout: 2000 });
    } else {
        setTimeout(inject, 1);
    }
}

function trackEvent(category, action, label) {
    if (safeGetLocalStorage(COOKIE_CONSENT_KEY) !== 'accepted') return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        event: 'track_event',
        event_category: category,
        event_action: action,
        event_label: label
    });
}

// ======================================
// Language Switcher
// ======================================

function initLangSwitcher() {
    const switcher = document.querySelector('.lang-switcher');
    if (!switcher) return;

    const btn = switcher.querySelector('.lang-current');

    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = switcher.classList.toggle('open');
        btn.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', function(e) {
        if (!switcher.contains(e.target)) {
            switcher.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            switcher.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
        }
    });
}

// ======================================
// Browser Language Suggestion
// ======================================

const BROWSER_LANGUAGE_CHOICE_KEY = 'browserLanguageChoice';

function initBrowserLanguageSuggestion() {
    const supportedLanguages = ['es', 'ca', 'en'];
    const currentLanguage = document.documentElement.lang.toLowerCase().split('-')[0];
    const browserLanguage = (navigator.languages && navigator.languages[0] || navigator.language || 'en')
        .toLowerCase()
        .split('-')[0];
    const preferredLanguage = supportedLanguages.includes(browserLanguage) ? browserLanguage : 'en';

    if (currentLanguage === preferredLanguage) return;
    if (safeGetLocalStorage(BROWSER_LANGUAGE_CHOICE_KEY)) return;

    const content = {
        es: {
            languageLabel: 'Idioma detectado',
            title: '¿Quieres ver la web en español?',
            description: 'Tu navegador está configurado en español.',
            confirm: 'Sí, ver en español',
            cancel: 'No, continuar aquí',
            flag: '<svg viewBox="0 0 3 2" aria-hidden="true"><rect width="3" height="2" fill="#c60b1e"/><rect y="0.5" width="3" height="1" fill="#ffc400"/></svg>'
        },
        ca: {
            languageLabel: 'Idioma detectat',
            title: 'Vols veure el web en català?',
            description: 'El teu navegador està configurat en català.',
            confirm: 'Sí, veure-la en català',
            cancel: 'No, continuar aquí',
            flag: '<svg viewBox="0 0 3 2" aria-hidden="true"><rect width="3" height="2" fill="#fcdd09"/><rect y="0.222" width="3" height="0.222" fill="#da121a"/><rect y="0.667" width="3" height="0.222" fill="#da121a"/><rect y="1.111" width="3" height="0.222" fill="#da121a"/><rect y="1.556" width="3" height="0.222" fill="#da121a"/></svg>'
        },
        en: {
            languageLabel: 'Detected language',
            title: 'Would you like to view the website in English?',
            description: 'Your browser is set to English.',
            confirm: 'Yes, view in English',
            cancel: 'No, stay here',
            flag: '<svg viewBox="0 0 3 2" aria-hidden="true"><rect width="3" height="2" fill="#012169"/><path d="M0,0 L3,2 M3,0 L0,2" stroke="#fff" stroke-width="0.4"/><path d="M0,0 L3,2 M3,0 L0,2" stroke="#C8102E" stroke-width="0.25"/><path d="M1.5,0 V2 M0,1 H3" stroke="#fff" stroke-width="0.6"/><path d="M1.5,0 V2 M0,1 H3" stroke="#C8102E" stroke-width="0.4"/></svg>'
        }
    }[preferredLanguage];
    const destinations = { es: '/', ca: '/ca/', en: '/en/' };
    const dialog = document.createElement('div');
    const titleId = 'browser-language-title';

    dialog.className = 'browser-language-modal';
    dialog.innerHTML = `
        <div class="browser-language-modal__backdrop"></div>
        <section class="browser-language-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
            <header class="browser-language-modal__header">
                <div class="browser-language-modal__flag">${content.flag}</div>
                <div>
                    <span class="browser-language-modal__eyebrow">${content.languageLabel}</span>
                    <h2 id="${titleId}">${content.title}</h2>
                </div>
            </header>
            <p>${content.description}</p>
            <div class="browser-language-modal__actions">
                <button type="button" class="browser-language-modal__confirm">${content.confirm}</button>
                <button type="button" class="browser-language-modal__cancel">${content.cancel}</button>
            </div>
        </section>
    `;

    function closeDialog() {
        dialog.remove();
        document.removeEventListener('keydown', handleKeydown);
    }

    function handleKeydown(event) {
        if (event.key === 'Escape') closeDialog();
    }

    dialog.querySelector('.browser-language-modal__confirm').addEventListener('click', function() {
        safeSetLocalStorage(BROWSER_LANGUAGE_CHOICE_KEY, preferredLanguage);
        window.location.href = destinations[preferredLanguage];
    });
    dialog.querySelector('.browser-language-modal__cancel').addEventListener('click', function() {
        safeSetLocalStorage(BROWSER_LANGUAGE_CHOICE_KEY, currentLanguage);
        closeDialog();
    });
    dialog.querySelector('.browser-language-modal__backdrop').addEventListener('click', closeDialog);

    document.body.appendChild(dialog);
    document.addEventListener('keydown', handleKeydown);
    dialog.querySelector('.browser-language-modal__confirm').focus({ preventScroll: true });
}
