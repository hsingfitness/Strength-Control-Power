/* =========================================================
   Health Management — Client-side Auth
   Talks to the FastAPI backend (deployed separately on Render).
   Update API_BASE once the backend is live.
========================================================= */

const API_BASE = "https://YOUR-BACKEND.onrender.com/api";

const AUTH_TOKEN_KEY = "hm_token";
const AUTH_USER_KEY = "hm_user";

/* ---------- session storage helpers ---------- */

function saveSession(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_USER_KEY));
    } catch (e) {
        return null;
    }
}

function clearSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

function isLoggedIn() {
    return Boolean(getToken());
}

/* ---------- page protection (gate fitness pages behind login) ---------- */

function requireAuth() {
    if (isLoggedIn()) return;

    const path = window.location.pathname;
    const inSubfolder = path.includes("/fitness/");
    const currentFile = path.substring(path.lastIndexOf("/") + 1);
    const redirectValue = inSubfolder ? `fitness/${currentFile}` : currentFile;
    const loginUrl = inSubfolder ? "../login.html" : "login.html";

    window.location.href = `${loginUrl}?redirect=${encodeURIComponent(redirectValue)}`;
}

/* ---------- API calls ---------- */

async function apiRequest(path, options = {}) {
    let response;

    try {
        response = await fetch(API_BASE + path, {
            headers: { "Content-Type": "application/json" },
            ...options
        });
    } catch (networkError) {
        throw new Error(
            "Can't reach the server right now. The backend may not be deployed yet — please try again later."
        );
    }

    let data = null;
    try {
        data = await response.json();
    } catch (e) {
        /* no JSON body */
    }

    if (!response.ok) {
        const detail = data && data.detail;
        throw new Error(
            detail ||
            "Can't reach the server right now. The backend may not be deployed yet — please try again later."
        );
    }

    return data;
}

async function signup({ name, email, password }) {
    const data = await apiRequest("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
    });
    saveSession(data.access_token, data.user);
    return data;
}

async function login({ email, password }) {
    const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });
    saveSession(data.access_token, data.user);
    return data;
}

function logout() {
    clearSession();
    window.location.href = "index.html";
}

/* ---------- form wiring ---------- */

function showFormError(formEl, message) {
    let box = formEl.querySelector(".form-error");
    if (!box) {
        box = document.createElement("p");
        box.className = "form-error";
        formEl.prepend(box);
    }
    box.textContent = message;
    box.hidden = false;
}

function clearFormError(formEl) {
    const box = formEl.querySelector(".form-error");
    if (box) box.hidden = true;
}

function setSubmitting(formEl, isSubmitting) {
    const btn = formEl.querySelector("button[type=submit]");
    if (!btn) return;
    btn.disabled = isSubmitting;
    btn.textContent = isSubmitting ? "Please wait…" : btn.dataset.label || btn.textContent;
    if (!btn.dataset.label) btn.dataset.label = btn.textContent;
}

function initLoginForm() {
    const form = document.getElementById("login-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFormError(form);
        setSubmitting(form, true);

        const email = form.email.value.trim();
        const password = form.password.value;

        try {
            await login({ email, password });
            const params = new URLSearchParams(window.location.search);
            window.location.href = params.get("redirect") || "index.html";
        } catch (err) {
            showFormError(form, err.message);
        } finally {
            setSubmitting(form, false);
        }
    });
}

function initSignupForm() {
    const form = document.getElementById("signup-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFormError(form);

        const name = form.name.value.trim();
        const email = form.email.value.trim();
        const password = form.password.value;
        const confirm = form.confirm.value;

        if (password !== confirm) {
            showFormError(form, "Passwords don't match.");
            return;
        }

        if (password.length < 8) {
            showFormError(form, "Password must be at least 8 characters.");
            return;
        }

        setSubmitting(form, true);

        try {
            await signup({ name, email, password });
            window.location.href = "index.html";
        } catch (err) {
            showFormError(form, err.message);
        } finally {
            setSubmitting(form, false);
        }
    });
}

/* ---------- nav swap (Log In button <-> account menu) ---------- */

function rootPath(path) {
    return /\/(fitness|legal)\//.test(window.location.pathname) ? "../" + path : path;
}

function renderNavAuth() {
    const slot = document.getElementById("nav-auth-slot");
    if (!slot) return;

    if (!isLoggedIn()) {
        slot.innerHTML = `<a href="${rootPath("login.html")}" class="btn-login">Log In</a>`;
        return;
    }

    const user = getUser() || {};
    const initial = (user.name || user.email || "?").charAt(0).toUpperCase();
    const isAdmin = user.role === "super_admin" || user.role === "operator";

    slot.innerHTML = `
        <div class="account-menu">
            <button type="button" class="btn-account">
                <span class="btn-account__avatar">${initial}</span>
                ${user.name || "Account"}
            </button>
            <div class="account-menu__dropdown">
                <a href="${rootPath("assessment.html")}">My Assessments</a>
                <a href="${rootPath("marketplace.html")}">My Orders</a>
                ${isAdmin ? `<a href="${rootPath("admin.html")}">Admin Dashboard</a>` : ""}
                <button type="button" id="logout-btn">Log Out</button>
            </div>
        </div>
    `;

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);
}

document.addEventListener("DOMContentLoaded", () => {
    renderNavAuth();
    initLoginForm();
    initSignupForm();
});
