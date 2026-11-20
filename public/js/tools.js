(function () {
    var continueBtn   = document.getElementById('continueBtn');
    var loaderSection = document.getElementById('loaderSection');
    var loginSection  = document.getElementById('loginSection');
    var overlay       = document.getElementById('transitionOverlay');
    var signInBtn     = document.getElementById('landingSignInBtn');
    var btnText       = document.getElementById('landingBtnSignInText');
    var btnArrow      = document.getElementById('landingBtnSignInArrow');
    var btnLoader     = document.getElementById('landingBtnLoader');
    var errorToast    = document.getElementById('landingErrorToast');
    var errorText     = document.getElementById('landingErrorText');
    var usernameField = document.getElementById('landingUsernameField');
    var passwordField = document.getElementById('landingPasswordField');
    var eyeBtn        = document.getElementById('landingEyeBtn');
    var eyeIcon       = document.getElementById('landingEyeIcon');
    var dashWrap      = document.getElementById('dashboardWrapper');

    var transitioning = false;
    var isSubmitting  = false;

    applyThemeToDOM('dark');
    if (dashWrap) dashWrap.style.display = 'none';

    var savedSession = localStorage.getItem('4vell_session');
    if (savedSession === 'true') {
        loaderSection.classList.remove('active');
        loaderSection.classList.add('hidden');
        loginSection.classList.remove('active');
        loginSection.classList.add('hidden');
        dashWrap.style.display = 'block';
        document.documentElement.classList.remove('landing-html');
        document.body.classList.remove('landing-body');
        document.body.classList.add('dashboard-active');
        if (typeof initDashboard === 'function') initDashboard();
        if (typeof loadUsername === 'function') loadUsername();
        return;
    }

    startScrambleEffect();
    function startScrambleEffect() {
        var el = document.getElementById('title-scramble');
        if (!el) return;
        var target = 'Selamat Datang';
        var chars = 'abcdefghijklmnopqrstuvwxyz';
        var frame = 0;
        function scramble() {
            var progress = frame / 50;
            var output = '';
            for (var i = 0; i < target.length; i++) {
                output += i < Math.floor(progress * target.length) ? target[i] : chars[Math.floor(Math.random() * chars.length)];
            }
            el.textContent = output;
            frame++;
            if (frame <= 50) requestAnimationFrame(scramble);
            else el.textContent = target;
        }
        setTimeout(scramble, 3000);
    }

    continueBtn.addEventListener('click', function () {
        if (transitioning) return;
        transitioning = true;
        continueBtn.style.pointerEvents = 'none';
        overlay.className = 'transition-overlay flash-in';
        setTimeout(function () {
            loaderSection.classList.remove('active');
            loaderSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
            loginSection.classList.add('active');
            prefillUsername();
        }, 240);
        setTimeout(function () {
            overlay.className = 'transition-overlay flash-out';
            loginSection.classList.add('entered');
        }, 480);
        setTimeout(function () {
            overlay.className = 'transition-overlay';
            transitioning = false;
        }, 900);
    });

    eyeBtn.addEventListener('click', function () {
        var show = passwordField.type === 'password';
        passwordField.type = show ? 'text' : 'password';
        eyeIcon.innerHTML = show
            ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
            : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    });

    function prefillUsername() {
        var saved = localStorage.getItem('4vell_username');
        if (saved) { usernameField.value = saved; passwordField.focus(); }
    }
    function showError(message) {
        errorText.textContent = message;
        errorToast.style.display = 'block';
        clearTimeout(showError._timer);
        showError._timer = setTimeout(function () {
            if (errorToast.style.display === 'block') errorToast.style.display = 'none';
        }, 5000);
    }
    function hideError() { errorToast.style.display = 'none'; }
    function setLoading(state) {
        isSubmitting = state;
        if (state) {
            signInBtn.disabled = true;
            btnText.style.display = 'none';
            btnArrow.style.display = 'none';
            btnLoader.style.display = 'block';
        } else {
            signInBtn.disabled = false;
            btnText.style.display = '';
            btnArrow.style.display = '';
            btnLoader.style.display = 'none';
        }
    }

    signInBtn.addEventListener('click', function () {
        if (isSubmitting) return;
        hideError();
        var username = usernameField.value.trim();
        var key      = passwordField.value.trim();
        if (!username || !key) { showError('Please fill in both username and password!'); return; }
        localStorage.setItem('indictive_username', username);
        setLoading(true);
        setTimeout(async function () {
            localStorage.setItem('4vell_session', 'true');
            localStorage.setItem('4vell_username', username);
            if (typeof currentUsername !== 'undefined') currentUsername = username;
            if (typeof STATE !== 'undefined') STATE.username = username;
            if (typeof notifyLogin === 'function') { try { await notifyLogin(username); } catch (e) {} }
            loaderSection.classList.remove('active');
            loaderSection.classList.add('hidden');
            loginSection.classList.remove('active');
            loginSection.classList.add('hidden');
            document.documentElement.classList.remove('landing-html');
            document.body.classList.remove('landing-body');
            document.body.classList.add('dashboard-active');
            dashWrap.style.display = 'block';
            if (typeof initDashboard === 'function') initDashboard();
            if (typeof loadUsername === 'function') loadUsername();
            setLoading(false);
            if (typeof showToast === 'function') showToast('Selamat datang, ' + username + '!');
        }, 700);
    });

    document.addEventListener('touchmove', function (e) {
        if (!e.target.closest('input, textarea') && loginSection.classList.contains('active')) {
            e.preventDefault();
        }
    }, { passive: false });
})();

/* ═══ ANIME PAGE: wrapper, tidak mengubah switchPage asli ═══ */
(function () {
    var _origSwitchPage = window.switchPage;
    var videoLoaded = false;

    window.switchPage = function (page) {
        _origSwitchPage(page); // logic asli (nav active, scroll, dll.)
        var anime = document.getElementById('pageAnime');
        var video = document.getElementById('animeVideo');
        if (page === 'anime') {
            if (anime) anime.classList.add('active');
            if (video) {
                if (!videoLoaded) { video.src = video.dataset.src; videoLoaded = true; }
                video.play().catch(function () {});
            }
        } else if (video) {
            video.pause();
        }
    };

    var search = document.getElementById('animeSearch');
    if (search) {
        search.addEventListener('input', function () {
            var q = search.value.trim().toLowerCase();
            document.querySelectorAll('#animeGrid .anime-card').forEach(function (card) {
                var t = card.querySelector('h4').textContent.toLowerCase();
                card.style.display = t.includes(q) ? '' : 'none';
            });
        });
    }
})();

/* ═══ AGENTS PAGE: wrapper, tidak mengubah switchPage asli ═══ */
(function () {
    var _prev = window.switchPage;

    window.switchPage = function (page) {
        _prev(page);
        closeAgentModal();
        if (page === 'agents') {
            var el = document.getElementById('pageAgents');
            if (el) el.classList.add('active');
        }
    };

    var members = [
        { name: '4VELL', username: '@MarvelNovaX', role: 'Developer', type: 'owner', status: 'online',
          bio: 'Art Of The Darkness | The Silence Code | True Developer | Not a clone account | My Channel @MarvelRVG1',
          avatar: 'https://files.catbox.moe/gi746s.png',
          banner: 'linear-gradient(135deg, #E11D2E 0%, #05070C 100%)', link: 'https://t.me/MarvelNovaX' },
        { name: 'fathan studio dev', username: '@@fathandev', role: 'Blood Support', type: 'support', status: 'online',
          bio: 'my bubub tercinta Marvel🥰🤍',
          avatar: 'https://b.top4top.io/p_39716l3an0.jpg',
          banner: 'linear-gradient(135deg, #1E5FFF 0%, #05070C 100%)', link: 'https://t.me/fathandev' }, 
{ name: 'Leon¡x', username: '@LeonixSukaNaspad', role: 'Support', type: 'support', status: 'online',
          bio: 'kink',
          avatar: 'https://d.top4top.io/p_3960bddvc1.jpg',
          banner: 'linear-gradient(135deg, #1E5FFF 0%, #05070C 100%)', link: 'https://t.me/YugaxNaspad' }
    ];

    var grid = document.getElementById('agGrid');
    var count = document.getElementById('agCount');
    var modal = document.getElementById('agModal');
    if (!grid || !modal) return;
    if (count) count.textContent = String(members.length).padStart(2, '0');

    function fallback(name, size) {
        return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=05070C&color=E11D2E&bold=true' + (size ? '&size=' + size : '');
    }

    members.forEach(function (m) {
        var color = m.type === 'owner' ? '#4D82FF' : '#FF4D5E';
        var card = document.createElement('div');
        card.className = 'ag-card';

        var av = document.createElement('div');
        av.className = 'ag-av';
        var img = document.createElement('img');
        img.src = m.avatar; img.alt = m.name;
        img.onerror = function () { this.onerror = null; this.src = fallback(m.name); };
        var dot = document.createElement('div');
        dot.className = 'ag-dot ' + m.status;
        av.appendChild(img); av.appendChild(dot);

        var nm = document.createElement('div');
        nm.className = 'ag-name'; nm.textContent = m.name;

        var role = document.createElement('div');
        role.className = 'ag-role'; role.textContent = m.role;
        role.style.cssText = 'color:' + color + ';border:1px solid ' + color + '66;background:' + color + '12';

        card.appendChild(av); card.appendChild(nm); card.appendChild(role);
        card.addEventListener('click', function () { openAgentModal(m); });
        grid.appendChild(card);
    });

    function openAgentModal(d) {
        var img = document.getElementById('agImg');
        img.onerror = function () { this.onerror = null; this.src = fallback(d.name, 180); };
        img.src = d.avatar;
        document.getElementById('agName').textContent = d.name;
        document.getElementById('agUser').textContent = d.username;
        document.getElementById('agRole').textContent = d.role.toUpperCase();
        document.getElementById('agBio').textContent = d.bio;
        document.getElementById('agLink').href = d.link;
        document.getElementById('agModalBg').style.background = d.banner || 'linear-gradient(135deg,#E11D2E,#05070C)';
        var st = document.getElementById('agStatus');
        st.textContent = d.status.toUpperCase();
        st.style.color = d.status === 'online' ? 'var(--c-green)' : 'var(--c-textSub)';
        modal.classList.add('show');
    }

    function closeAgentModal() { modal.classList.remove('show'); }
    window.closeAgentModal = closeAgentModal;

    document.getElementById('agClose').addEventListener('click', closeAgentModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeAgentModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAgentModal(); });
})();

/* ═══ BRAT & Sertifikat generator ═══ */
function xtEsc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
async function xtFetchImage(apiUrl, resultEl, filename, alt) {
    resultEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i><br>Memproses...';
    try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error('Gagal memproses');
        const blob = await res.blob();
        let src = null;
        if (blob.type.startsWith('image/')) {
            src = URL.createObjectURL(blob);
        } else {
            const data = JSON.parse(await blob.text());
            src = (data.result && data.result.url) || data.url || (data.data && data.data.url) || data.image || null;
        }
        if (!src) { resultEl.innerHTML = '<span class="xt-err">Gagal: format respons tidak dikenali.</span>'; return; }
        resultEl.innerHTML = '<img src="' + xtEsc(src) + '" alt="' + xtEsc(alt) + '"><a class="xt-dl" href="' + xtEsc(src) + '" download="' + filename + '" target="_blank" rel="noopener"><i class="fas fa-download"></i> Download</a>';
    } catch (e) {
        resultEl.innerHTML = '<span class="xt-err">Error: ' + xtEsc(e.message) + '</span>';
    }
}
async function generateBrat() {
    const text = document.getElementById('bratText').value.trim();
    const style = document.getElementById('bratStyle').value;
    if (!text) { showToast('Masukkan teks dulu!'); return; }
    const btn = document.getElementById('bratBtn'); btn.disabled = true;
    await xtFetchImage('https://api.nexray.eu.cc/maker/brat?text=' + encodeURIComponent(text) + '&style=' + encodeURIComponent(style), document.getElementById('bratResult'), 'brat.png', 'BRAT Result');
    btn.disabled = false;
}
async function generateSertifikat() {
    const name = document.getElementById('certName').value.trim();
    const reason = document.getElementById('certReason').value.trim() || 'Orang Tolol';
    if (!name) { showToast('Masukkan nama dulu!'); return; }
    const btn = document.getElementById('certBtn'); btn.disabled = true;
    await xtFetchImage('https://api.nexray.eu.cc/maker/sertifikat?name=' + encodeURIComponent(name) + '&reason=' + encodeURIComponent(reason), document.getElementById('certResult'), 'sertifikat.png', 'Sertifikat');
    btn.disabled = false;
}
