/* =========================================================
   Health Management — Marketplace
   Loads products from the backend so admin/operator edits made
   in the Admin Dashboard actually show up here. If the backend
   isn't reachable, the static cards already in the HTML stay put
   (nothing breaks, it just won't reflect live edits).
========================================================= */

(function () {
    "use strict";

    const BADGE_CLASS = {
        "Best Seller": "badge--gold",
        "Popular": "badge--purple",
        "New": "badge--blue",
        "Top Rated": "badge--green"
    };

    function badgeClass(text) {
        return BADGE_CLASS[text] || "badge--muted";
    }

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str == null ? "" : String(str);
        return div.innerHTML;
    }

    function renderCard(p) {
        const badges = (p.badges || [])
            .map((b) => `<span class="badge ${badgeClass(b)}">${escapeHtml(b)}</span>`)
            .join("");

        return `
            <article class="product-card" data-category="${escapeHtml(p.category)}">
                <div class="product-card__top">
                    <div class="product-icon" aria-hidden="true">${escapeHtml(p.icon)}</div>
                    <div class="product-badges">${badges}</div>
                </div>
                <h3>${escapeHtml(p.name)}</h3>
                <p>${escapeHtml(p.description)}</p>
                <div class="product-card__footer">
                    <strong>$${Number(p.price).toFixed(2)}</strong>
                    <button class="cart-button" type="button" data-add-to-cart
                        data-id="${escapeHtml(p.id)}"
                        data-name="${escapeHtml(p.name)}"
                        data-price="${p.price}"
                        data-icon="${escapeHtml(p.icon)}">
                        <span aria-hidden="true">🛒</span> Add to Cart
                    </button>
                </div>
            </article>`;
    }

    function updateItemCount(n) {
        const el = document.querySelector(".item-count");
        if (el) el.textContent = n + (n === 1 ? " item" : " items");
    }

    function wireCategoryFilters() {
        const pills = document.querySelectorAll(".category-pill");
        if (!pills.length) return;

        pills.forEach((pill) => {
            if (pill._filterBound) return;
            pill._filterBound = true;

            pill.addEventListener("click", () => {
                pills.forEach((p) => p.classList.remove("category-pill--active"));
                pill.classList.add("category-pill--active");

                const label = pill.textContent.trim().toLowerCase();
                const isAll = label.includes("all products");

                const cards = document.querySelectorAll(".product-card");
                let visible = 0;

                cards.forEach((card) => {
                    const match = isAll || (card.dataset.category && label.includes(card.dataset.category));
                    card.style.display = match ? "" : "none";
                    if (match) visible++;
                });

                updateItemCount(visible);
            });
        });
    }

    async function loadProducts() {
        wireCategoryFilters();

        const grid = document.querySelector(".product-grid");
        if (!grid || typeof API_BASE === "undefined") return;

        let products;
        try {
            const response = await fetch(API_BASE + "/products");
            if (!response.ok) return;
            products = await response.json();
        } catch (err) {
            return; // backend unreachable — keep the static fallback cards
        }

        if (!Array.isArray(products) || products.length === 0) return;

        grid.innerHTML = products.map(renderCard).join("");
        updateItemCount(products.length);
        wireCategoryFilters();

        if (window.HMCart && typeof window.HMCart.rebind === "function") {
            window.HMCart.rebind();
        }
    }

    document.addEventListener("DOMContentLoaded", loadProducts);
})();
