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
    initContactForm();
    initPhoneFieldEnhancements();
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
// Contact Form Handler
// ======================================

const EMAIL_DNS_RESOLVER_ENDPOINTS = [
    'https://dns.google/resolve',
    'https://cloudflare-dns.com/dns-query'
];
const EMAIL_DNS_LOOKUP_TIMEOUT_MS = 4500;

function initContactForm() {
    const form = document.getElementById('contact-form');
    
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = {
            name: document.getElementById('name').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            email: document.getElementById('email').value.trim(),
            postalcode: document.getElementById('postalcode').value.trim(),
            company: document.getElementById('company')?.value.trim() || '',
            message: document.getElementById('message').value.trim(),
            privacy: document.getElementById('privacy')?.checked || false,
            turnstileToken: getTurnstileToken(form)
        };

        // Honeypot anti-spam trap
        if (formData.company) {
            showFormMessage(
                '¡Mensaje enviado correctamente! Nos pondremos en contacto contigo lo antes posible.',
                'success'
            );
            form.reset();
            return;
        }
        
        // Validate form
        const validation = await validateForm(formData);
        if (!validation.isValid) {
            showFormMessage(validation.message, 'error');
            return;
        }

        if (validation.formattedPhone) {
            const phoneInput = document.getElementById('phone');
            if (phoneInput) {
                phoneInput.value = validation.formattedPhone;
            }
        }

        if (validation.normalizedPhone) {
            formData.phone = validation.normalizedPhone;
        }

        if (validation.normalizedEmail) {
            formData.email = validation.normalizedEmail;

            const emailInput = document.getElementById('email');
            if (emailInput) {
                emailInput.value = validation.normalizedEmail;
            }
        }

        const endpoint = form.getAttribute('action');
        if (!endpoint) {
            showFormMessage('No se pudo enviar el mensaje. Falta configurar el endpoint del formulario.', 'error');
            return;
        }

        if (!formData.turnstileToken) {
            showFormMessage('Completa la verificación anti-spam antes de enviar el formulario.', 'error');
            return;
        }
        
        await submitForm(formData, endpoint);
    });
}

function getTurnstileToken(form) {
    if (!form) return '';

    const turnstileField = form.querySelector('input[name="cf-turnstile-response"]');
    if (!turnstileField) return '';

    return turnstileField.value.trim();
}

function resetTurnstileWidget(form) {
    const hasTurnstileApi = Boolean(window.turnstile && typeof window.turnstile.reset === 'function');
    if (!form || !hasTurnstileApi) return;

    const turnstileContainer = form.querySelector('.cf-turnstile');
    if (!turnstileContainer) return;

    const widgetId = turnstileContainer.getAttribute('data-widget-id');
    if (widgetId) {
        window.turnstile.reset(widgetId);
        return;
    }

    window.turnstile.reset();
}

async function validateForm(data) {
    // Check if all required fields are filled
    if (!data.name || !data.phone || !data.email || !data.message) {
        return {
            isValid: false,
            message: 'Nombre, teléfono, email y mensaje son obligatorios.'
        };
    }

    const emailValidation = await validateEmailAddress(data.email);
    if (!emailValidation.isValid) {
        return {
            isValid: false,
            message: emailValidation.message
        };
    }
    
    const phoneValidation = validatePhoneNumber(data.phone);
    if (!phoneValidation.isValid) {
        return {
            isValid: false,
            message: phoneValidation.message
        };
    }

    // Optional postal code validation (Spain)
    if (data.postalcode) {
        const postalRegex = /^\d{5}$/;
        if (!postalRegex.test(data.postalcode)) {
            return {
                isValid: false,
                message: 'El código postal debe tener exactamente 5 dígitos.'
            };
        }
    }
    
    // Check privacy policy acceptance
    if (!data.privacy) {
        return {
            isValid: false,
            message: 'Debes aceptar la política de privacidad para continuar.'
        };
    }
    
    return {
        isValid: true,
        message: '',
        normalizedEmail: emailValidation.normalizedEmail,
        normalizedPhone: phoneValidation.normalizedPhone,
        formattedPhone: phoneValidation.formattedPhone
    };
}

async function validateEmailAddress(emailValue) {
    const rawEmail = (emailValue || '').trim();
    if (!rawEmail) {
        return {
            isValid: false,
            message: 'El email es obligatorio.'
        };
    }

    const atSymbolIndex = rawEmail.lastIndexOf('@');
    const hasAtSymbol = atSymbolIndex > 0 && atSymbolIndex < rawEmail.length - 1;
    if (!hasAtSymbol) {
        return {
            isValid: false,
            message: 'El email no parece válido. Revisa el formato (ejemplo: nombre@dominio.com).'
        };
    }

    const localPart = rawEmail.slice(0, atSymbolIndex);
    const domainPart = rawEmail.slice(atSymbolIndex + 1).toLowerCase();
    const normalizedEmail = localPart + '@' + domainPart;

    const hasValidatorLibrary = Boolean(window.validator && typeof window.validator.isEmail === 'function');

    if (hasValidatorLibrary) {
        const isValidEmail = window.validator.isEmail(normalizedEmail, {
            allow_utf8_local_part: false,
            require_tld: true,
            ignore_max_length: false,
            domain_specific_validation: true
        });

        if (!isValidEmail) {
            return {
                isValid: false,
                message: 'El email no parece válido. Revisa el formato (ejemplo: nombre@dominio.com).'
            };
        }
    } else {
        // Fallback if the validator library fails to load.
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return {
                isValid: false,
                message: 'El email no parece válido. Revisa el formato (ejemplo: nombre@dominio.com).'
            };
        }
    }

    const domainCheck = await checkEmailDomainExists(domainPart);
    if (domainCheck.lookupFailed) {
        return {
            isValid: false,
            message: 'No se pudo verificar el dominio "' + domainPart + '" del email. Revisa tu conexión e inténtalo de nuevo.'
        };
    }

    if (!domainCheck.exists) {
        return {
            isValid: false,
            message: 'El dominio "' + domainPart + '" del email es inválido.'
        };
    }

    return {
        isValid: true,
        message: '',
        normalizedEmail: normalizedEmail
    };
}

async function checkEmailDomainExists(domain) {
    const mxResult = await resolveDnsRecord(domain, 'MX');
    if (mxResult === true) {
        return {
            exists: true,
            lookupFailed: false
        };
    }

    const [aResult, aaaaResult] = await Promise.all([
        resolveDnsRecord(domain, 'A'),
        resolveDnsRecord(domain, 'AAAA')
    ]);

    if (aResult === true || aaaaResult === true) {
        return {
            exists: true,
            lookupFailed: false
        };
    }

    const lookupResults = [mxResult, aResult, aaaaResult];

    return {
        exists: false,
        lookupFailed: lookupResults.every(function(result) {
            return result === null;
        })
    };
}

async function resolveDnsRecord(domain, recordType) {
    let receivedDnsResponse = false;

    for (let i = 0; i < EMAIL_DNS_RESOLVER_ENDPOINTS.length; i += 1) {
        const endpoint = EMAIL_DNS_RESOLVER_ENDPOINTS[i];
        const queryUrl = endpoint + '?name=' + encodeURIComponent(domain) + '&type=' + encodeURIComponent(recordType);

        try {
            const response = await fetchWithTimeout(queryUrl, {
                headers: {
                    'Accept': 'application/dns-json'
                }
            }, EMAIL_DNS_LOOKUP_TIMEOUT_MS);

            if (!response || !response.ok) {
                continue;
            }

            const payload = await response.json();
            receivedDnsResponse = true;

            if (payload && payload.Status === 3) {
                // NXDOMAIN (domain does not exist)
                return false;
            }

            const answers = payload && Array.isArray(payload.Answer) ? payload.Answer : [];
            const hasAnswer = answers.some(function(answer) {
                return answer && typeof answer.data === 'string' && answer.data.trim().length > 0;
            });

            if (hasAnswer) {
                return true;
            }

            if (payload && payload.Status === 0) {
                return false;
            }
        } catch (error) {
            // Try next resolver.
        }
    }

    if (!receivedDnsResponse) {
        return null;
    }

    return false;
}

function fetchWithTimeout(url, options, timeoutMs) {
    return Promise.race([
        fetch(url, options),
        new Promise(function(_, reject) {
            setTimeout(function() {
                reject(new Error('Email DNS lookup timed out'));
            }, timeoutMs);
        })
    ]);
}

function validatePhoneNumber(phoneValue) {
    const rawPhone = (phoneValue || '').trim();

    if (!rawPhone) {
        return {
            isValid: false,
            message: 'El teléfono es obligatorio.'
        };
    }

    // Quick reject of unexpected characters before parsing
    const invalidCharsRegex = /[^0-9\s\+\-\(\)\.]/;
    if (invalidCharsRegex.test(rawPhone)) {
        return {
            isValid: false,
            message: 'El teléfono contiene caracteres no válidos.'
        };
    }

    const hasLibPhoneNumber = Boolean(
        window.libphonenumber &&
        typeof window.libphonenumber.parsePhoneNumberFromString === 'function'
    );

    if (hasLibPhoneNumber) {
        try {
            // ES as default country keeps local numbers like 612345678 valid.
            const parsedPhone = window.libphonenumber.parsePhoneNumberFromString(rawPhone, 'ES');

            if (!parsedPhone || !parsedPhone.isPossible() || !parsedPhone.isValid()) {
                return {
                    isValid: false,
                    message: 'El teléfono no es válido. Ejemplo: +34 612 34 56 78.'
                };
            }

            return {
                isValid: true,
                message: '',
                normalizedPhone: parsedPhone.number,
                formattedPhone: parsedPhone.formatInternational()
            };
        } catch (error) {
            return {
                isValid: false,
                message: 'No hemos podido validar el teléfono. Revisa el formato.'
            };
        }
    }

    // Fallback validation if library fails to load.
    const phoneDigits = rawPhone.replace(/\D/g, '');
    if (phoneDigits.length < 9) {
        return {
            isValid: false,
            message: 'El teléfono debe tener al menos 9 dígitos.'
        };
    }

    if (phoneDigits.length > 15) {
        return {
            isValid: false,
            message: 'El teléfono es demasiado largo. Revisa el número.'
        };
    }

    return {
        isValid: true,
        message: '',
        normalizedPhone: rawPhone,
        formattedPhone: rawPhone
    };
}

function initPhoneFieldEnhancements() {
    const phoneInput = document.getElementById('phone');

    if (!phoneInput) return;

    phoneInput.setAttribute('inputmode', 'tel');
    phoneInput.setAttribute('autocomplete', 'tel');

    phoneInput.addEventListener('blur', function() {
        const currentValue = phoneInput.value.trim();
        if (!currentValue) return;

        const phoneValidation = validatePhoneNumber(currentValue);
        if (phoneValidation.isValid && phoneValidation.formattedPhone) {
            phoneInput.value = phoneValidation.formattedPhone;
        }
    });
}

async function submitForm(data, endpoint) {
    const form = document.getElementById('contact-form');
    const submitBtn = form.querySelector('.btn-submit');
    const originalBtnText = submitBtn.textContent.trim() || 'Enviar Mensaje';
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    submitBtn.setAttribute('aria-busy', 'true');
    
    try {
        const payload = {
            "Nombre": data.name,
            "Teléfono": data.phone,
            "Email": data.email,
            "Código Postal": data.postalcode || 'No indicado',
            "Mensaje": data.message
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        let result = null;
        try {
            result = await response.json();
        } catch (error) {
            result = null;
        }

        const providerRejected = Boolean(
            result && (result.success === false || result.success === 'false' || result.ok === false)
        );

        if (!response.ok || providerRejected) {
            throw new Error('Form provider rejected submission');
        }

        showFormMessage(
            '¡Formulario enviado correctamente! En breve nos pondremos en contacto contigo.',
            'success'
        );
        form.reset();
        resetTurnstileWidget(form);
        trackEvent('Contact', 'Form Submit', 'Success');

    } catch (error) {
        console.error('Contact form submission error:', error);
        showFormMessage(
            'No hemos podido enviar tu mensaje. Intenta de nuevo en unos minutos.',
            'error'
        );
        trackEvent('Contact', 'Form Submit', 'Error');

    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        submitBtn.removeAttribute('aria-busy');

        const messageContainer = document.getElementById('form-message');
        if (messageContainer) {
            messageContainer.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }
}

let timeoutId = null;

function showFormMessage(message, type) {
    const formMessage = document.getElementById('form-message');
    
    if (!formMessage) return;
    
    formMessage.textContent = message;
    formMessage.className = 'form-message ' + type;
    formMessage.style.display = 'block';

    formMessage.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });

    if (timeoutId) {
        clearTimeout(timeoutId);
    }
    
    // Hide message after 5 seconds
    timeoutId = setTimeout(() => {
        formMessage.style.display = 'none';
    }, 10000);
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

// Add sticky header on scroll (optional)
window.addEventListener('scroll', debounce(function() {
    const header = document.querySelector('.header');
    
    if (!header) return;
    
    if (window.pageYOffset > 100) {
        header.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    } else {
        header.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
    }
}, 50));

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

    document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
        link.addEventListener('click', function() {
            trackEvent('Contact', 'WhatsApp Click', this.getAttribute('href'));
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
