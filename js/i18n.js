/* ===================================
   health management
   Language switcher + translation engine
   - Persists chosen language in localStorage so it applies on every page
   - Injects an accessible language dropdown on pages that don't already
     have one (same pattern as the cart icon)
   - Translates any element carrying a data-i18n="key" attribute using
     the dictionaries in js/i18n/translations.js
   - Also relabels the dynamically-rendered login/account nav area from
     js/auth.js
=================================== */

(function () {
    "use strict";

    var STORAGE_KEY = "hm_lang";

    var LANGUAGES = [
        { code: "en", flag: "🇺🇸", label: "English", short: "EN" },
        { code: "zh", flag: "🇨🇳", label: "中文", short: "中文" },
        { code: "ja", flag: "🇯🇵", label: "日本語", short: "日本語" },
        { code: "ko", flag: "🇰🇷", label: "한국어", short: "한국어" }
    ];

    var HTML_LANG = { en: "en", zh: "zh-CN", ja: "ja", ko: "ko" };

    function getLanguage() {
        try {
            return window.localStorage.getItem(STORAGE_KEY) || "en";
        } catch (err) {
            return "en";
        }
    }

    function setLanguage(code) {
        try {
            window.localStorage.setItem(STORAGE_KEY, code);
        } catch (err) {
            /* localStorage unavailable — language just won't persist */
        }
        applyLanguage(code);
    }

    function findLang(code) {
        for (var i = 0; i < LANGUAGES.length; i++) {
            if (LANGUAGES[i].code === code) return LANGUAGES[i];
        }
        return LANGUAGES[0];
    }

    /* --------------------------------
       Dropdown (inject if missing, otherwise normalize)
    -------------------------------- */

    var toggleBtn, menuEl, currentFlagEl, currentLabelEl;

    function isInSubfolder() {
        return /\/(fitness|legal)\//.test(window.location.pathname);
    }

    function ensureLanguageDropdown() {
        var navContainer = document.querySelector("header .nav-container");
        if (!navContainer) return;

        var actions = navContainer.querySelector(".nav-actions");
        if (!actions) {
            actions = document.createElement("div");
            actions.className = "nav-actions nav-actions--injected";
            navContainer.appendChild(actions);
        }

        var wrapper = actions.querySelector(".language-dropdown");
        if (!wrapper) {
            wrapper = document.createElement("div");
            wrapper.className = "language-dropdown";
            actions.appendChild(wrapper);
        }

        // Always rebuild the internals so every page shares the same
        // accessible, click-driven markup regardless of what (if
        // anything) was hand-written in that page's HTML.
        wrapper.innerHTML =
            '<button type="button" class="btn-language" id="lang-toggle" aria-haspopup="true" aria-expanded="false" aria-label="Change language">' +
                '<span id="lang-current-flag">🌐</span> <span id="lang-current-label">EN</span>' +
            '</button>' +
            '<div class="language-menu" id="lang-menu" role="menu"></div>';

        menuEl = wrapper.querySelector("#lang-menu");

        LANGUAGES.forEach(function (lang) {
            var item = document.createElement("a");
            item.href = "#";
            item.setAttribute("role", "menuitem");
            item.setAttribute("data-lang", lang.code);
            item.innerHTML =
                '<span>' + lang.flag + ' ' + lang.label + '</span>' +
                '<span class="lang-check" aria-hidden="true">✓</span>';

            item.addEventListener("click", function (e) {
                e.preventDefault();
                setLanguage(lang.code);
                closeMenu();
            });

            menuEl.appendChild(item);
        });

        toggleBtn = wrapper.querySelector("#lang-toggle");
        currentFlagEl = wrapper.querySelector("#lang-current-flag");
        currentLabelEl = wrapper.querySelector("#lang-current-label");

        toggleBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            menuEl.classList.contains("is-open") ? closeMenu() : openMenu();
        });

        document.addEventListener("click", function (e) {
            if (!wrapper.contains(e.target)) closeMenu();
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeMenu();
        });
    }

    function openMenu() {
        if (!menuEl) return;
        menuEl.classList.add("is-open");
        toggleBtn.setAttribute("aria-expanded", "true");
    }

    function closeMenu() {
        if (!menuEl) return;
        menuEl.classList.remove("is-open");
        if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
    }

    /* --------------------------------
       Translation
    -------------------------------- */

    function applyLanguage(code) {
        var lang = findLang(code);
        var dict = window.I18N && window.I18N[code] ? window.I18N[code] : {};

        document.documentElement.setAttribute("lang", HTML_LANG[code] || "en");

        if (currentFlagEl) currentFlagEl.textContent = lang.flag;
        if (currentLabelEl) currentLabelEl.textContent = lang.short;

        if (menuEl) {
            menuEl.querySelectorAll("a[data-lang]").forEach(function (a) {
                var active = a.getAttribute("data-lang") === code;
                a.classList.toggle("is-active", active);
                a.setAttribute("aria-current", active ? "true" : "false");
            });
        }

        document.querySelectorAll("[data-i18n]").forEach(function (el) {
            if (el.dataset.i18nOriginal === undefined) {
                el.dataset.i18nOriginal = el.textContent.trim();
            }
            var key = el.getAttribute("data-i18n");
            el.textContent = (code !== "en" && dict[key]) ? dict[key] : el.dataset.i18nOriginal;
        });

        document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
            if (el.dataset.i18nPlaceholderOriginal === undefined) {
                el.dataset.i18nPlaceholderOriginal = el.getAttribute("placeholder") || "";
            }
            var key = el.getAttribute("data-i18n-placeholder");
            el.setAttribute(
                "placeholder",
                (code !== "en" && dict[key]) ? dict[key] : el.dataset.i18nPlaceholderOriginal
            );
        });

        translateAuthSlot(dict, code);
    }

    // js/auth.js renders the Log In button / account menu dynamically,
    // so it can't carry static data-i18n attributes. Relabel it here
    // whenever it's present. Falls back to whatever auth.js rendered
    // (English) when there's no translation, so this stays safe even
    // if auth.js changes its markup slightly.
    function translateAuthSlot(dict, code) {
        var slot = document.getElementById("nav-auth-slot");
        if (!slot || code === "en") return;

        var loginBtn = slot.querySelector(".btn-login");
        if (loginBtn && dict["nav.login"] && loginBtn.textContent !== dict["nav.login"]) {
            loginBtn.textContent = dict["nav.login"];
        }

        var links = slot.querySelectorAll(".account-menu__dropdown a");
        if (links[0] && dict["nav.myAssessments"] && links[0].textContent !== dict["nav.myAssessments"]) {
            links[0].textContent = dict["nav.myAssessments"];
        }
        if (links[1] && dict["nav.myOrders"] && links[1].textContent !== dict["nav.myOrders"]) {
            links[1].textContent = dict["nav.myOrders"];
        }
        var adminLink = slot.querySelector(".account-menu__dropdown a[href$='admin.html']");
        if (adminLink && dict["nav.admin"] && adminLink.textContent !== dict["nav.admin"]) {
            adminLink.textContent = dict["nav.admin"];
        }

        var logoutBtn = slot.querySelector("#logout-btn");
        if (logoutBtn && dict["nav.logout"] && logoutBtn.textContent !== dict["nav.logout"]) {
            logoutBtn.textContent = dict["nav.logout"];
        }
    }

    /* --------------------------------
       Init
    -------------------------------- */

    function init() {
        ensureLanguageDropdown();
        applyLanguage(getLanguage());

        // If auth.js (or anything else) re-renders the login/account
        // slot after we've already translated the page, re-apply.
        var slot = document.getElementById("nav-auth-slot");
        if (slot && window.MutationObserver) {
            var observer = new MutationObserver(function () {
                translateAuthSlot(
                    (window.I18N && window.I18N[getLanguage()]) || {},
                    getLanguage()
                );
            });
            observer.observe(slot, { childList: true, subtree: true });
        }

        window.addEventListener("storage", function (e) {
            if (e.key === STORAGE_KEY) applyLanguage(getLanguage());
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    window.HMLang = {
        get: getLanguage,
        set: setLanguage
    };
})();
