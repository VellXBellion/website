/* ═══ TOOLS: tiap tool = halaman sendiri via switchPage ═══ */
(function () {
    var TOOL_PAGES = ['toolEncryption','toolPresetFinder','toolQRGenerator','toolCapCut','tooliPhoneQuote','toolSpamTelegram','toolWindowsQuotes','toolTanyaUstad','toolBrat','toolSertifikat'];
    var TOOL_KEYS  = ['encryption','presetfinder','qrgenerator','capcut','iphonequote','spamtelegram','windowsquotes','tanyaustad','brat','sertifikat'];
    var _prev = window.switchPage;

    // Tombol kembali di tiap halaman tool
    TOOL_PAGES.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el || el.querySelector('.tool-back')) return;
        var btn = document.createElement('button');
        btn.className = 'tool-back';
        btn.innerHTML = '<i class="fas fa-arrow-left"></i> Tools';
        btn.onclick = function () { switchPage('tools'); };
        el.insertBefore(btn, el.firstChild);
    });

    window.switchPage = function (page) {
        _prev(page); // logic asli: nav aktif, scroll, dll.
        if (page === 'windowsquotes' || page === 'tanyaustad') {
            var fr = document.querySelector('#' + (page === 'windowsquotes' ? 'toolWindowsQuotes' : 'toolTanyaUstad') + ' iframe');
            if (fr && !fr.src && fr.dataset.src) fr.src = fr.dataset.src;
        }
        if (TOOL_KEYS.indexOf(page) !== -1) {
            // sembunyikan daftar tools, hanya tampilkan halaman tool-nya
            var list = document.getElementById('pageTools');
            if (list) list.classList.remove('active');
        }
    };
})();
