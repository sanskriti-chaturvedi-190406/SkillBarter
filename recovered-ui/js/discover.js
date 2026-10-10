const searchInput = document.getElementById("search-input");
const skillFilter = document.getElementById("skill-filter");
const verifiedOnly = document.getElementById("verified-only");
const partnerCards = document.querySelectorAll(".partner-card");
const resultsCount = document.getElementById("results-count");

function filterPartners() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedFilter = skillFilter.value;
    const requireVerified = verifiedOnly.checked;

    let visibleCount = 0;

    partnerCards.forEach((card) => {
        const name = card.dataset.name.toLowerCase();
        const teaches = card.dataset.teaches.toLowerCase();
        const learns = card.dataset.learns.toLowerCase();

        const matchesSearch =
            name.includes(searchTerm) ||
            teaches.includes(searchTerm) ||
            learns.includes(searchTerm);

        let matchesSkillFilter = true;

        if (selectedFilter === "teach") {
            matchesSkillFilter = teaches.includes("python");
            } else if (selectedFilter === "learn") {
            matchesSkillFilter = learns.includes("javascript");
        }

        const matchesVerification =
            !requireVerified ||
            card.dataset.verified === "true";

        const isVisible =
            matchesSearch &&
            matchesSkillFilter &&
            matchesVerification;

        card.hidden = !isVisible;

        if (isVisible) {
            visibleCount++;
        }
    });

    resultsCount.textContent =
        `${visibleCount} skill partner${visibleCount === 1 ? "" : "s"}`;

    const emptyMessage = document.getElementById("empty-message");

    if (emptyMessage) {
        emptyMessage.hidden = visibleCount !== 0;
    }
}

searchInput.addEventListener("input", filterPartners);
skillFilter.addEventListener("change", filterPartners);
verifiedOnly.addEventListener("change", filterPartners);

filterPartners();
const connectButtons = document.querySelectorAll(".connect-btn");

connectButtons.forEach((button) => {
    button.addEventListener("click", () => {
        if (button.dataset.connected === "true") {
            return;
        }

        button.dataset.connected = "true";
        button.textContent = "Request Sent ✓";
        button.disabled = true;
        button.classList.add("request-sent");
    });
});
