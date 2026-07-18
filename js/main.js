/* ===================================
   health management
   Main JavaScript
=================================== */

// Wait until page loads
document.addEventListener("DOMContentLoaded", function () {
    /* --------------------------------
       Active Navigation Highlight
    -------------------------------- */
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split("/").pop() || "index.html";
    const navLinks = document.querySelectorAll("nav a");

    navLinks.forEach(function (link) {
        const href = link.getAttribute("href");

        if (!href || href === "#") {
            return;
        }

        const linkPage = href.split("/").pop();

        if (linkPage === currentPage) {
            link.classList.add("active");
        }
    });

    if (["strength.html", "control.html", "power.html"].includes(currentPage)) {
        const fitnessLink = document.querySelector(".dropdown > a");

        if (fitnessLink) {
            fitnessLink.classList.add("active");
        }
    }

    /* --------------------------------
       Fitness Dropdown
    -------------------------------- */
    const fitnessDropdown = document.querySelector(".dropdown");
    const fitnessToggle = document.querySelector(".dropdown > a");

    if (fitnessDropdown && fitnessToggle) {
        fitnessToggle.setAttribute("role", "button");
        fitnessToggle.setAttribute("aria-haspopup", "true");
        fitnessToggle.setAttribute("aria-expanded", "false");

        fitnessToggle.addEventListener("click", function (event) {
            event.preventDefault();
            const isOpen = fitnessDropdown.classList.toggle("is-open");
            fitnessToggle.setAttribute("aria-expanded", String(isOpen));
        });

        document.addEventListener("click", function (event) {
            if (!fitnessDropdown.contains(event.target)) {
                fitnessDropdown.classList.remove("is-open");
                fitnessToggle.setAttribute("aria-expanded", "false");
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                fitnessDropdown.classList.remove("is-open");
                fitnessToggle.setAttribute("aria-expanded", "false");
                fitnessToggle.focus();
            }
        });
    }

    /* --------------------------------
       Smooth Scrolling
    -------------------------------- */
    const scrollLinks = document.querySelectorAll('a[href^="#"]');

    scrollLinks.forEach(function (link) {
        link.addEventListener("click", function (event) {
            const targetSelector = this.getAttribute("href");

            if (!targetSelector || targetSelector === "#") {
                return;
            }

            const target = document.querySelector(targetSelector);

            if (target) {
                event.preventDefault();
                target.scrollIntoView({
                    behavior: "smooth"
                });
            }
        });
    });

    /* --------------------------------
       Fade-in Animation
    -------------------------------- */
    const sections = document.querySelectorAll("section");

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("show");
                    }
                });
            },
            {
                threshold: 0.15
            }
        );

        sections.forEach(function (section) {
            observer.observe(section);
        });
    }

    /* --------------------------------
       Contact Form Validation
    -------------------------------- */
    const form = document.querySelector("form");

    if (form) {
        form.addEventListener("submit", function (event) {
            const email = document.getElementById("email");

            if (email && !email.value.includes("@")) {
                event.preventDefault();
                alert("Please enter a valid email address.");
            }
        });
    }
});
