// "system" = nothing stored, follow the OS
const darkMode = document.getElementById("dark-mode");
const themeCycle = document.getElementById("theme-cycle");
const themeValue = themeCycle.querySelector(".theme-value");
const THEMES = ["light", "dark", "system"];
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const themeColor = document.querySelector('meta[name="theme-color"]');

function storedTheme() {
    try {
        const theme = localStorage.getItem("theme");
        return theme === "light" || theme === "dark" ? theme : "system";
    } catch {
        return "system";
    }
}

function applyTheme(theme) {
    const dark = theme === "dark" || (theme === "system" && systemDark.matches);
    document.documentElement.classList.toggle("dark", dark);
    // App title bar follows the page background
    themeColor.content = dark ? "#111111" : "#ffffff";
    darkMode.checked = dark;
    themeValue.textContent = theme;
}

function setTheme(theme) {
    try {
        if (theme === "system") {
            localStorage.removeItem("theme");
        } else {
            localStorage.setItem("theme", theme);
        }
    } catch {}
    applyTheme(theme);
}

darkMode.addEventListener("change", () => setTheme(darkMode.checked ? "dark" : "light"));
themeCycle.addEventListener("click", () => {
    const next = THEMES[(THEMES.indexOf(storedTheme()) + 1) % THEMES.length];
    setTheme(next);
});
systemDark.addEventListener("change", () => {
    if (storedTheme() === "system") applyTheme("system");
});
// Sync other open tabs
window.addEventListener("storage", event => {
    if (event.key === "theme") applyTheme(storedTheme());
});

applyTheme(storedTheme());

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}
