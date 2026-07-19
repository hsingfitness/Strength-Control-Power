/* =========================================================
   Health Management — Guest/Member Assessment
   Submits the assessment form to the FastAPI backend and
   renders the AI-generated basic report inline.
========================================================= */

function showAssessmentError(message) {
    const box = document.getElementById("assessment-error");
    if (!box) return;
    box.textContent = message;
    box.hidden = false;
}

function clearAssessmentError() {
    const box = document.getElementById("assessment-error");
    if (box) box.hidden = true;
}

function renderAssessmentResult(report) {
    const panel = document.getElementById("assessment-result");
    if (!panel) return;

    document.getElementById("result-risk-level").textContent = report.risk_level;
    document.getElementById("result-summary").textContent = report.summary;
    document.getElementById("result-disclaimer").textContent = report.disclaimer;

    const list = document.getElementById("result-recommendations");
    list.innerHTML = "";
    report.recommendations.forEach((tip) => {
        const li = document.createElement("li");
        li.textContent = tip;
        list.appendChild(li);
    });

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function initAssessmentForm() {
    const form = document.getElementById("assessment-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearAssessmentError();

        const symptomDetails = form.symptom_details.value.trim();
        if (!symptomDetails) {
            showAssessmentError("Please describe what you're feeling before requesting an analysis.");
            return;
        }

        const btn = document.getElementById("analysis-submit-btn");
        const originalLabel = btn.innerHTML;
        btn.disabled = true;
        btn.textContent = "Analyzing…";

        try {
            const response = await fetch(API_BASE + "/reports/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(typeof getToken === "function" && getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
                },
                body: JSON.stringify({
                    symptom_details: symptomDetails,
                    breakfast: form.breakfast.value.trim(),
                    lunch: form.lunch.value.trim(),
                    dinner: form.dinner.value.trim(),
                    sleep: form.sleep.value.trim()
                })
            });

            let data = null;
            try {
                data = await response.json();
            } catch (e) {
                /* no JSON body */
            }

            if (!response.ok) {
                throw new Error((data && data.detail) || "Something went wrong generating your analysis.");
            }

            renderAssessmentResult(data);
        } catch (err) {
            const message =
                err.message === "Failed to fetch"
                    ? "Can't reach the analysis server right now. The backend may not be deployed yet — please try again later."
                    : err.message;
            showAssessmentError(message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalLabel;
        }
    });
}

document.addEventListener("DOMContentLoaded", initAssessmentForm);
