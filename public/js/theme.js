function applyThemeToDOM(theme) {
    document.documentElement.setAttribute('data-theme', 'dark');
}
function toggleTheme() {
    if (typeof showToast === 'function') showToast('Tema Oblivion aktif');
}
function loadSavedTheme() {
    applyThemeToDOM('dark');
}
(function() {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.removeItem('4vell_theme');
})();
