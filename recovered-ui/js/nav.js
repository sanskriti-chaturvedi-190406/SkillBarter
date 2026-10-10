const navbarHTML = `
<header class="navbar">
    <a href="../index.html" class="logo">
        SkillBarter
    </a>

    <nav class="nav-links">
        <a href="dashboard.html" data-page="dashboard">Dashboard</a>
        <a href="discover.html" data-page="discover">Discover</a>
        <a href="connections.html" data-page="connections">Connections</a>
        <a href="chat.html" data-page="chat">Chat</a>
        <a href="sessions.html" data-page="sessions">Sessions</a>
    </nav>

    <div class="nav-actions">
        <a href="profile.html" class="login-link">My Profile</a>
    </div>
</header>
`;

function renderNavbar() {
    const container = document.getElementById("navbar-container");

    if (!container) return;

    container.innerHTML = navbarHTML;

    const currentPage = window.location.pathname
        .split("/")
        .pop()
        .replace(".html", "");

    document.querySelectorAll(".nav-links a").forEach(link => {
        if (link.dataset.page === currentPage) {
            link.classList.add("active");
        }
    });
}

document.addEventListener("DOMContentLoaded", renderNavbar);
