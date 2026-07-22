/* =========================================================
   Health Management — Assessment Paywall
   Handles the ?unlock=member / ?unlock=vip flow from the
   homepage journey cards: require login, check whether the
   user already has that plan, otherwise send them to Stripe
   Checkout, then verify payment when they land back here.
========================================================= */

(function () {
    "use strict";

    const PLAN_PRICES = { member: 20, vip: 9.99 };
    const PLAN_NAMES = {
        member: "Member Health Dashboard — One-off unlock",
        vip: "VIP Personalized Risk Model — Upgrade"
    };
    const PLAN_RANK = { free: 0, member: 1, vip: 2 };

    function qs(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    function clearQueryParams() {
        const url = new URL(window.location.href);
        url.search = "";
        window.history.replaceState({}, "", url.toString());
    }

    function el(id) {
        return document.getElementById(id);
    }

    function showGate(message, showHomeLink) {
        el("assessment-gate").hidden = false;
        el("assessment-gate-message").textContent = message;
        el("assessment-gate-home-link").hidden = !showHomeLink;
        document.querySelector(".assessment-intro").hidden = true;
        el("assessment-form").hidden = true;
    }

    function planLabel(plan) {
        if (plan === "vip") return "✦ VIP Personalized Analysis unlocked";
        if (plan === "member") return "✦ Member Customized Analysis unlocked";
        return null;
    }

    function showForm(plan) {
        el("assessment-gate").hidden = true;
        document.querySelector(".assessment-intro").hidden = false;
        el("assessment-form").hidden = false;

        const badge = el("assessment-tier-badge");
        const label = planLabel(plan);
        if (label) {
            badge.hidden = false;
            el("assessment-tier-label").textContent = label;
        } else {
            badge.hidden = true;
        }
    }

    async function authedRequest(path, options) {
        options = options || {};
        const headers = Object.assign(
            { "Content-Type": "application/json" },
            options.headers || {},
            { Authorization: "Bearer " + getToken() }
        );
        return apiRequest(path, Object.assign({}, options, { headers }));
    }

    async function refreshUser() {
        try {
            const me = await authedRequest("/auth/me");
            saveSession(getToken(), me);
            return me;
        } catch (err) {
            return null;
        }
    }

    async function startCheckout(plan) {
        showGate("Redirecting you to secure checkout…", false);
        try {
            const data = await authedRequest("/payments/create-checkout-session", {
                method: "POST",
                body: JSON.stringify({
                    items: [{ id: "plan-" + plan, name: PLAN_NAMES[plan], price: PLAN_PRICES[plan], qty: 1 }],
                    success_path: "/assessment.html?unlock=" + plan,
                    cancel_path: "/index.html"
                })
            });
            window.location.href = data.checkout_url;
        } catch (err) {
            showGate(err.message || "Couldn't start checkout. Please try again.", true);
        }
    }

    async function verifyOrder(orderId, unlock) {
        showGate("Confirming your payment…", false);
        try {
            const order = await authedRequest("/payments/orders/" + orderId + "/verify", { method: "POST" });

            if (order.status !== "paid") {
                showGate(
                    "We couldn't confirm your payment yet. If you completed checkout, please wait a moment and refresh this page.",
                    true
                );
                return;
            }

            const me = await refreshUser();
            clearQueryParams();
            showForm(me ? me.plan : unlock);
        } catch (err) {
            showGate(err.message || "Couldn't confirm your payment.", true);
        }
    }

    async function init() {
        if (!el("assessment-gate")) return; // paywall markup not on this page

        const unlock = qs("unlock");
        const orderId = qs("order");

        if (!unlock) {
            showForm(null);
            return;
        }

        if (typeof isLoggedIn !== "function" || !isLoggedIn()) {
            const redirectTarget = "assessment.html?unlock=" + encodeURIComponent(unlock);
            window.location.href = "login.html?redirect=" + encodeURIComponent(redirectTarget);
            return;
        }

        if (orderId) {
            await verifyOrder(orderId, unlock);
            return;
        }

        showGate("Checking your account…", false);

        const me = await refreshUser();
        if (!me) {
            const redirectTarget = "assessment.html?unlock=" + encodeURIComponent(unlock);
            window.location.href = "login.html?redirect=" + encodeURIComponent(redirectTarget);
            return;
        }

        if ((PLAN_RANK[me.plan] || 0) >= (PLAN_RANK[unlock] || 0)) {
            clearQueryParams();
            showForm(me.plan);
            return;
        }

        await startCheckout(unlock);
    }

    document.addEventListener("DOMContentLoaded", init);
})();
