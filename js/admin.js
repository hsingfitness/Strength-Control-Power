/* =========================================================
   Health Management — Admin Dashboard
   Product management (super admin, or operators with the
   manage_products permission) + operator management (super
   admin only). Talks to the FastAPI backend via the same
   apiRequest()/getToken() helpers defined in js/auth.js.
========================================================= */

(function () {
    "use strict";

    async function authedRequest(path, options) {
        options = options || {};
        const headers = Object.assign(
            { "Content-Type": "application/json" },
            options.headers || {},
            { Authorization: "Bearer " + getToken() }
        );
        return apiRequest(path, Object.assign({}, options, { headers }));
    }

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str == null ? "" : String(str);
        return div.innerHTML;
    }

    function money(n) {
        return "$" + Number(n).toFixed(2);
    }

    /* ---------- gate + init ---------- */

    async function init() {
        if (typeof isLoggedIn !== "function" || !isLoggedIn()) {
            window.location.href = "login.html?redirect=admin.html";
            return;
        }

        let me;
        try {
            me = await authedRequest("/auth/me");
        } catch (err) {
            window.location.href = "login.html?redirect=admin.html";
            return;
        }

        const isSuperAdmin = me.role === "super_admin";
        const isOperator = me.role === "operator";

        if (!isSuperAdmin && !isOperator) {
            document.getElementById("admin-denied").hidden = false;
            return;
        }

        document.getElementById("admin-content").hidden = false;
        document.getElementById("admin-role-line").textContent =
            "Signed in as " + me.name + " — " + (isSuperAdmin ? "Super Admin" : "Operator");

        initTabs();

        if (isSuperAdmin) {
            document.getElementById("operators-tab-btn").hidden = false;
            initOperators(me);
        }

        initProducts();
    }

    function initTabs() {
        const buttons = document.querySelectorAll(".admin-tab");
        buttons.forEach((btn) => {
            btn.addEventListener("click", () => {
                buttons.forEach((b) => b.classList.remove("is-active"));
                btn.classList.add("is-active");
                document.querySelectorAll(".admin-panel").forEach((p) => (p.hidden = true));
                document.getElementById("tab-" + btn.dataset.tab).hidden = false;
            });
        });
    }

    /* ============================================================
       PRODUCTS
    ============================================================ */

    let editingProductId = null;

    async function initProducts() {
        try {
            await loadProducts();
            document.getElementById("products-manager").hidden = false;
        } catch (err) {
            document.getElementById("products-denied").hidden = false;
            return;
        }

        document.getElementById("product-form").addEventListener("submit", onProductFormSubmit);
        document.getElementById("product-cancel-edit").addEventListener("click", resetProductForm);
    }

    async function loadProducts() {
        const products = await authedRequest("/admin/products");
        renderProductsTable(products);
    }

    function renderProductsTable(products) {
        const tbody = document.getElementById("products-tbody");

        if (!products.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="admin-table__loading">No products yet.</td></tr>';
            return;
        }

        tbody.innerHTML = products
            .map(
                (p) => `
                <tr data-id="${escapeHtml(p.id)}">
                    <td>
                        <span class="admin-product-name">${escapeHtml(p.icon)} ${escapeHtml(p.name)}</span>
                        <span class="admin-product-desc">${escapeHtml(p.description)}</span>
                    </td>
                    <td>${escapeHtml(p.category)}</td>
                    <td>${money(p.price)}</td>
                    <td>
                        <span class="admin-status ${p.is_active ? "admin-status--active" : "admin-status--inactive"}">
                            ${p.is_active ? "Active" : "Hidden"}
                        </span>
                    </td>
                    <td class="admin-table__actions">
                        <button type="button" class="button button-outline admin-edit-btn">Edit</button>
                        <button type="button" class="button admin-delete-btn admin-delete-btn--danger">Delete</button>
                    </td>
                </tr>`
            )
            .join("");

        tbody.querySelectorAll(".admin-edit-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const id = e.target.closest("tr").dataset.id;
                const product = products.find((p) => p.id === id);
                if (product) fillProductForm(product);
            });
        });

        tbody.querySelectorAll(".admin-delete-btn").forEach((btn) => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.closest("tr").dataset.id;
                if (!confirm("Delete this product? This can't be undone.")) return;

                try {
                    await authedRequest("/admin/products/" + encodeURIComponent(id), { method: "DELETE" });
                    await loadProducts();
                } catch (err) {
                    alert(err.message);
                }
            });
        });
    }

    function fillProductForm(product) {
        editingProductId = product.id;
        document.getElementById("product-form-title").textContent = "Edit Product";
        document.getElementById("product-submit-btn").textContent = "Save Changes";
        document.getElementById("product-cancel-edit").hidden = false;

        document.getElementById("product-id").value = product.id;
        document.getElementById("product-id").disabled = true;
        document.getElementById("product-name").value = product.name;
        document.getElementById("product-price").value = product.price;
        document.getElementById("product-category").value = product.category;
        document.getElementById("product-icon").value = product.icon;
        document.getElementById("product-badges").value = (product.badges || []).join(", ");
        document.getElementById("product-description").value = product.description;
        document.getElementById("product-stripe-link").value = product.stripe_payment_link || "";
        document.getElementById("product-active").checked = product.is_active;

        document.getElementById("product-form").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function resetProductForm() {
        editingProductId = null;
        const form = document.getElementById("product-form");
        form.reset();
        document.getElementById("product-id").disabled = false;
        document.getElementById("product-form-title").textContent = "Add a Product";
        document.getElementById("product-submit-btn").textContent = "Add Product";
        document.getElementById("product-cancel-edit").hidden = true;
        document.getElementById("product-active").checked = true;
        clearFormError(form);
    }

    async function onProductFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        clearFormError(form);

        const badges = document
            .getElementById("product-badges")
            .value.split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        const payload = {
            name: document.getElementById("product-name").value.trim(),
            description: document.getElementById("product-description").value.trim(),
            price: parseFloat(document.getElementById("product-price").value),
            category: document.getElementById("product-category").value,
            icon: document.getElementById("product-icon").value.trim() || "💊",
            badges,
            stripe_payment_link: document.getElementById("product-stripe-link").value.trim() || null,
            is_active: document.getElementById("product-active").checked
        };

        try {
            if (editingProductId) {
                await authedRequest("/admin/products/" + encodeURIComponent(editingProductId), {
                    method: "PUT",
                    body: JSON.stringify(payload)
                });
            } else {
                const id = document.getElementById("product-id").value.trim();
                if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
                    showFormError(form, "Product ID must be lowercase letters, numbers, and dashes only (e.g. vitamin-c-1000mg).");
                    return;
                }
                await authedRequest("/admin/products", {
                    method: "POST",
                    body: JSON.stringify(Object.assign({ id }, payload))
                });
            }

            resetProductForm();
            await loadProducts();
        } catch (err) {
            showFormError(form, err.message);
        }
    }

    /* ============================================================
       OPERATORS (super admin only)
    ============================================================ */

    async function initOperators(me) {
        document.getElementById("operator-form").addEventListener("submit", (e) => onOperatorFormSubmit(e, me));
        await loadOperators(me);
    }

    async function loadOperators(me) {
        try {
            const operators = await authedRequest("/admin/operators");
            renderOperatorsTable(operators, me);
        } catch (err) {
            document.getElementById("operators-tbody").innerHTML =
                '<tr><td colspan="5" class="admin-table__loading">' + escapeHtml(err.message) + "</td></tr>";
        }
    }

    function renderOperatorsTable(operators, me) {
        const tbody = document.getElementById("operators-tbody");

        if (!operators.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="admin-table__loading">No operators yet.</td></tr>';
            return;
        }

        tbody.innerHTML = operators
            .map((op) => {
                const isSelf = op.id === me.id;
                const isSuper = op.role === "super_admin";
                const checked = op.permissions && op.permissions.manage_products ? "checked" : "";

                return `
                <tr data-id="${escapeHtml(op.id)}">
                    <td>${escapeHtml(op.name)}${isSelf ? " (you)" : ""}</td>
                    <td>${escapeHtml(op.email)}</td>
                    <td>${isSuper ? "Super Admin" : "Operator"}</td>
                    <td>
                        ${
                            isSuper
                                ? '<span class="admin-muted">Full access</span>'
                                : `<label class="admin-checkbox-cell">
                                     <input type="checkbox" class="admin-perm-checkbox" ${checked}>
                                   </label>`
                        }
                    </td>
                    <td class="admin-table__actions">
                        ${
                            isSuper
                                ? ""
                                : `<button type="button" class="button admin-remove-operator-btn admin-delete-btn--danger">Remove</button>`
                        }
                    </td>
                </tr>`;
            })
            .join("");

        tbody.querySelectorAll(".admin-perm-checkbox").forEach((cb) => {
            cb.addEventListener("change", async (e) => {
                const id = e.target.closest("tr").dataset.id;
                try {
                    await authedRequest("/admin/operators/" + encodeURIComponent(id), {
                        method: "PATCH",
                        body: JSON.stringify({ permissions: { manage_products: e.target.checked } })
                    });
                } catch (err) {
                    alert(err.message);
                    e.target.checked = !e.target.checked;
                }
            });
        });

        tbody.querySelectorAll(".admin-remove-operator-btn").forEach((btn) => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.closest("tr").dataset.id;
                if (!confirm("Remove this operator's admin access?")) return;

                try {
                    await authedRequest("/admin/operators/" + encodeURIComponent(id), { method: "DELETE" });
                    await loadOperators(me);
                } catch (err) {
                    alert(err.message);
                }
            });
        });
    }

    async function onOperatorFormSubmit(e, me) {
        e.preventDefault();
        const form = e.target;
        clearFormError(form);

        const payload = {
            name: document.getElementById("operator-name").value.trim(),
            email: document.getElementById("operator-email").value.trim(),
            password: document.getElementById("operator-password").value,
            permissions: {
                manage_products: document.getElementById("operator-perm-manage-products").checked
            }
        };

        try {
            await authedRequest("/admin/operators", { method: "POST", body: JSON.stringify(payload) });
            form.reset();
            await loadOperators(me);
        } catch (err) {
            showFormError(form, err.message);
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();
