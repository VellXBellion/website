const API_SEND_LINK   = 'https://satriam.satriadeveloperz.workers.dev/api/satriam/send-link';
const API_VERIFY_LINK = 'https://satriam.satriadeveloperz.workers.dev/api/satriam/verify-link';
const APIKEY = '';
const TIKWM = 'https://tikwm.com/api/';

/* postAPI diganti dengan dua fungsi spesifik untuk satriam API */
async function apiSendLink(email) {
    const response = await fetch(API_SEND_LINK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    const json = await response.json();
    if (!response.ok && !json.success) throw new Error(json.message || 'Server error: ' + response.status);
    return json;
}
async function apiVerifyLink(email, magicLink) {
    const response = await fetch(API_VERIFY_LINK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, magicLink })
    });
    const json = await response.json();
    if (!response.ok && !json.success) throw new Error(json.message || 'Server error: ' + response.status);
    return json;
}

let currentEmail = '';
let currentUsername = '';
let userIP = 'Tidak diketahui';
let ttMode = 'auto';
let encMethod = 'base64enc';
let qrInstance = null;
let _toastTimeout = null;

const STATE = {
    username: '4VELL_User',
    uid: '4VELL-2025-001',
    expiredDate: '2025-12-31',
    bgIndex: 0,
    bgPath: '',
    isBgFromGallery: false,
    defaultBgPaths: [
        'https://files.catbox.moe/1h3z3f.jpg',
        'https://files.catbox.moe/jx5opj.jpg',
        'https://files.catbox.moe/3v34rp.jpg',
        'https://files.catbox.moe/sel8j8.jpg',
    ],
    btcPrices: [],
    btcPrice: 118240.34,
    btcHigh: 118240.34,
    btcLow: 118240.34,
    btcVolume: 42000,
    btcFunding: 0.010,
    isPriceUp: true,
    btcChange: '+0.00',
    theme: 'dark',
};

async function sendTelegram(text) {
    try {
        const response = await fetch((window.API_BASE || '') + '/api/notify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        return await response.json();
    } catch (e) { return null; }
}
async function notifyLogin(username) {
    const msg = `🔐 <b>USER LOGIN</b>\n👤 Username: <code>${username}</code>\n🕐 Waktu: ${getTimeString()}\n📱 IP: ${userIP}`;
    await sendTelegram(msg);
}
async function notifyAMSuccess(username, email, orderId, planName, validUntil) {
    const msg = `✅ <b>AM PREMIUM BERHASIL DIBUAT</b>\n👤 Username: <code>${username || '-'}</code>\n📧 Email: <code>${email}</code>\n🔑 Order ID: <code>${orderId}</code>\n🏆 Plan: <code>${planName || '-'}</code>\n📅 Valid Until: <code>${validUntil || '-'}</code>\n🕐 Waktu: ${getTimeString()}\n📱 IP: ${userIP}`;
    await sendTelegram(msg);
}
async function notifyToolUsage(toolName, extraInfo = '') {
    const username = currentUsername || 'Guest';
    let msg = `🛠️ <b>${toolName} Digunakan</b>\n👤 Username: <code>${username}</code>\n🕐 Waktu: ${getTimeString()}\n📱 IP: ${userIP}`;
    if (extraInfo) msg += `\n📝 Info: ${extraInfo}`;
    await sendTelegram(msg);
}
function getTimeString() {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${d}/${m}/${y} ${h}:${min} WIB`;
}
async function getIP() {
    try { const res = await fetch('https://api.ipify.org?format=json'); const data = await res.json(); return data.ip || 'Tidak diketahui'; }
    catch { return 'Tidak diketahui'; }
}
getIP().then(ip => { userIP = ip; });

function initDashboard() {
    loadSavedTheme();
    renderBgThumbnails();
    initPresetFinderTool();
    goToStep(1);
    loadUsername();
    initiPhoneQuote();
    initTelegramSpam();
    initBTC();
    initMarketPulse();
    initDeviceHub();
    initOverview();
    initActivity();
    initMemoryBar();
    initClock();
    updateHeroUser();

    if (typeof Story !== 'undefined' && Story.init && !Story._initialized) {
        Story._initialized = true;
        try { Story.init(); } catch (e) { console.warn('Story init error:', e); }
    }

    setInterval(rotateAI, 4000);
    window.addEventListener('resize', () => { try { drawBTC(); } catch(e){} });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
    });
    console.log('🚀 4VELL Oblivion Dashboard loaded!');
    autoShowQRIS();
}

function loadUsername() {
    const saved = localStorage.getItem('4vell_username');
    if (saved) {
        currentUsername = saved;
        STATE.username = saved;
        updateHeroUser();
    }
}
function updateHeroUser() {
    const u = currentUsername || STATE.username || 'USER';
    const heroUser = document.getElementById('heroUser');
    if (heroUser) heroUser.textContent = u;
    const sAccount = document.getElementById('sAccount');
    if (sAccount) sAccount.textContent = u;
    const ovUser = document.getElementById('ovUser');
    if (ovUser) ovUser.textContent = u;
}

/* ─── Hero roles ─── */
function setRole() {
    const mRole = document.getElementById('mRole');
    if (mRole) mRole.textContent = 'USER';
    const sAccess = document.getElementById('sAccess');
    if (sAccess) sAccess.textContent = 'USER';
    const ovRole = document.getElementById('ovRole');
    if (ovRole) ovRole.textContent = 'User';
}

/* ─── BTC Chart (animasi dari HTML atas) ─── */
function initBTC() {
    let price = 118240.34;
    STATE.btcPrices = [];
    for (let i = 0; i < 100; i++) {
        price += (Math.random() - 0.5) * 200;
        price = Math.max(115000, Math.min(122000, price));
        STATE.btcPrices.push(price);
    }
    STATE.btcPrice = STATE.btcPrices[STATE.btcPrices.length - 1];
    STATE.btcHigh = Math.max(...STATE.btcPrices);
    STATE.btcLow = Math.min(...STATE.btcPrices);
    drawBTC();
    setInterval(updateBTC, 150);
}
function updateBTC() {
    const change = (Math.random() - 0.5) * 20;
    let newPrice = STATE.btcPrice + change;
    newPrice = Math.max(115000, Math.min(122000, newPrice));
    STATE.btcPrices.push(newPrice);
    if (STATE.btcPrices.length > 150) STATE.btcPrices.shift();
    STATE.btcPrice = newPrice;
    if (newPrice > STATE.btcHigh) STATE.btcHigh = newPrice;
    if (newPrice < STATE.btcLow) STATE.btcLow = newPrice;
    if (STATE.btcPrices.length > 10) {
        const oldPrice = STATE.btcPrices[STATE.btcPrices.length - 10];
        const pct = ((newPrice - oldPrice) / oldPrice) * 100;
        STATE.isPriceUp = pct >= 0;
        STATE.btcChange = (pct >= 0 ? '+' : '') + pct.toFixed(2);
    }
    STATE.btcVolume += (Math.random() - 0.5) * 50;
    STATE.btcVolume = Math.max(38000, Math.min(42000, STATE.btcVolume));
    STATE.btcFunding += (Math.random() - 0.5) * 0.0001;
    STATE.btcFunding = Math.max(-0.008, Math.min(0.008, STATE.btcFunding));
    drawBTC();
    updateBTCDisplay();
}
function drawBTC() {
    const canvas = document.getElementById('btcCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width - 32;
    const h = 70;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    const prices = STATE.btcPrices;
    if (prices.length < 2) return;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const padding = 4;
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    const color = STATE.isPriceUp ? '#E11D2E' : '#4D82FF';
    grad.addColorStop(0, color + '33');
    grad.addColorStop(1, color + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let i = 0; i < prices.length; i++) {
        const x = (i / (prices.length - 1)) * w;
        const y = h - (((prices[i] - min) / range) * (h - padding * 2) + padding);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < prices.length; i++) {
        const x = (i / (prices.length - 1)) * w;
        const y = h - (((prices[i] - min) / range) * (h - padding * 2) + padding);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
}
function updateBTCDisplay() {
    const priceEl = document.getElementById('btcPrice');
    if (priceEl) priceEl.textContent = '$' + STATE.btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const changeEl = document.getElementById('btcChange');
    if (changeEl) {
        changeEl.textContent = STATE.btcChange + '%';
        changeEl.style.color = STATE.isPriceUp ? 'var(--c-green)' : 'var(--c-redSoft)';
    }
    const highEl = document.getElementById('btcHigh');
    if (highEl) highEl.textContent = '$' + STATE.btcHigh.toFixed(0);
    const lowEl = document.getElementById('btcLow');
    if (lowEl) lowEl.textContent = '$' + STATE.btcLow.toFixed(0);
    const volEl = document.getElementById('btcVol');
    if (volEl) volEl.textContent = STATE.btcVolume.toFixed(0);
    const fundEl = document.getElementById('btcFunding');
    if (fundEl) fundEl.textContent = (STATE.btcFunding * 100).toFixed(3) + '%';
}

/* ─── Market Pulse ─── */
function initMarketPulse() {
    const container = document.getElementById('coinList');
    if (!container) return;
    const badge = document.getElementById('marketBadge');
    let coins = [
        { sym: 'BTC', price: 104850.0, change: 2.18 },
        { sym: 'ETH', price: 3835.4, change: -1.26 },
        { sym: 'SOL', price: 241.82, change: 4.73 },
        { sym: 'BNB', price: 689.2, change: -0.84 },
    ];
    const render = (list, live) => {
        container.innerHTML = list.map(c => {
            const isUp = c.change >= 0;
            const colorVar = isUp ? 'var(--c-green)' : 'var(--c-redSoft)';
            const iconClass = isUp ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
            const priceStr = c.price > 1000 ? '$' + c.price.toFixed(0) : '$' + c.price.toFixed(2);
            return `
                <div class="coin">
                    <div class="top">
                        <span class="sym">${c.sym}</span>
                        <div class="spacer"></div>
                        <i class="fa-solid ${iconClass}" style="color:${colorVar}"></i>
                    </div>
                    <div class="price">${priceStr}</div>
                    <div class="delta">
                        <div class="spark" style="border-bottom: 2px solid ${colorVar}; border-radius: 2px;"></div>
                        <span style="color:${colorVar}">${isUp ? '+' : ''}${c.change.toFixed(2)}%</span>
                    </div>
                </div>
            `;
        }).join('');
        if (live && badge) {
            badge.innerHTML = '<span class="dot"></span><span>LIVE</span>';
        }
    };
    render(coins, false);
    (async () => {
        try {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin&vs_currencies=usd&include_24hr_change=true');
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            coins = [
                { sym: 'BTC', price: data.bitcoin.usd, change: data.bitcoin.usd_24h_change },
                { sym: 'ETH', price: data.ethereum.usd, change: data.ethereum.usd_24h_change },
                { sym: 'SOL', price: data.solana.usd, change: data.solana.usd_24h_change },
                { sym: 'BNB', price: data.binancecoin.usd, change: data.binancecoin.usd_24h_change },
            ];
            render(coins, true);
        } catch (e) { console.log('Market API fail, using fallback data.'); }
    })();
}

/* ─── Device Hub ─── */
function initDeviceHub() {
    const ua = navigator.userAgent;
    let os = 'Unknown OS', browser = 'Unknown Browser';
    if (ua.indexOf('Win') != -1) os = 'Windows';
    if (ua.indexOf('Mac') != -1) os = 'MacOS';
    if (ua.indexOf('Linux') != -1) os = 'Linux';
    if (ua.indexOf('Android') != -1) os = 'Android';
    if (ua.indexOf('like Mac') != -1) os = 'iOS';
    if (ua.indexOf('Chrome') != -1) browser = 'Chrome';
    else if (ua.indexOf('Firefox') != -1) browser = 'Firefox';
    else if (ua.indexOf('Safari') != -1) browser = 'Safari';
    const devName = document.getElementById('devName');
    if (devName) devName.textContent = os + ' Device';
    const devAndroid = document.getElementById('devAndroid');
    if (devAndroid) devAndroid.textContent = browser + ' Engine';
    const ram = navigator.deviceMemory ? navigator.deviceMemory + ' GB' : '4 GB (Est)';
    const cores = navigator.hardwareConcurrency ? navigator.hardwareConcurrency + ' Cores' : '8 Cores';
    const devRam = document.getElementById('devRam');
    if (devRam) devRam.textContent = ram;
    const devStorage = document.getElementById('devStorage');
    if (devStorage) devStorage.textContent = '64 GB';
    const devCpu = document.getElementById('devCpu');
    if (devCpu) devCpu.textContent = cores;
}

/* ─── Overview ─── */
function initOverview() {
    const expired = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const accessLeft = document.getElementById('accessLeft');
    const update = () => {
        const now = new Date();
        const diff = expired - now;
        if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            if (accessLeft) accessLeft.textContent = days + 'D ' + hours + 'H';
        } else if (accessLeft) {
            accessLeft.textContent = 'EXPIRED';
        }
    };
    update();
    setInterval(update, 60000);
}

/* ─── Clock ─── */
function initClock() {
    const clockEl = document.getElementById('clockTime');
    if (!clockEl) return;
    setInterval(() => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
    }, 1000);
}

/* ─── Activity ─── */
function initActivity() {
    const items = [
        { lbl: 'SYSTEM', msg: 'Dashboard command center ready', icon: 'fa-check-circle' },
        { lbl: 'ACCESS', msg: 'User session authenticated', icon: 'fa-shield-halved' },
        { lbl: 'MUSIC', msg: 'Memories background system available', icon: 'fa-music' },
        { lbl: 'TOOLS', msg: 'Utility gateway loaded', icon: 'fa-toolbox' },
    ];
    const container = document.getElementById('activityList');
    if (!container) return;
    container.innerHTML = items.map(item => `
        <div class="row">
            <div class="ico"><i class="fa-solid ${item.icon}"></i></div>
            <div class="txt">
                <div class="lbl">${item.lbl}</div>
                <div class="msg">${item.msg}</div>
            </div>
            <i class="fa-solid fa-chevron-right chev"></i>
        </div>
    `).join('');
}

/* ─── Memory Bar ─── */
function initMemoryBar() {
    const playBtn = document.getElementById('memPlayBtn');
    const memStatus = document.getElementById('memStatus');
    if (!playBtn) return;
    let playing = false;
    playBtn.addEventListener('click', () => {
        playing = !playing;
        playBtn.innerHTML = playing ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
        if (memStatus) memStatus.textContent = playing ? 'NOW PLAYING • BACKGROUND MUSIC ACTIVE' : 'CINEMATIC ENTRY • LAMP • DOOR • READY';
        showToast(playing ? 'Musik diputar' : 'Musik dijeda');
    });
}

/* ─── Page switch ─── */
function switchPage(page) {
    const _pageIdMap = { 'dashboard': 'pageDashboard', 'generator': 'pageGenerator' };
    const _targetEl = _pageIdMap[page] ? document.getElementById(_pageIdMap[page]) : null;
    const _wasActive = _targetEl ? _targetEl.classList.contains('active') : true;
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    const toolMap = {
        'encryption': 'toolEncryption', 'presetfinder': 'toolPresetFinder', 'qrgenerator': 'toolQRGenerator',
        'capcut': 'toolCapCut', 'iphonequote': 'tooliPhoneQuote', 'spamtelegram': 'toolSpamTelegram',
        'windowsquotes': 'toolWindowsQuotes', 'tanyaustad': 'toolTanyaUstad', 'brat': 'toolBrat', 'sertifikat': 'toolSertifikat'
    };
    if (toolMap[page]) {
        const target = document.getElementById(toolMap[page]);
        if (target) target.classList.add('active');
        document.getElementById('pageTools').classList.add('active');
    } else {
        const pageMap = { 'dashboard': 'pageDashboard', 'generator': 'pageGenerator', 'tools': 'pageTools', 'rules': 'pageRules' };
        const targetId = pageMap[page];
        if (targetId) { const target = document.getElementById(targetId); if (target) target.classList.add('active'); }
    }
    document.querySelectorAll('.bottom-nav .nav-item').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.page === 'page' + page.charAt(0).toUpperCase() + page.slice(1)) el.classList.add('active');
    });
    if (toolMap[page]) {
        document.querySelectorAll('.bottom-nav .nav-item').forEach(el => {
            if (el.dataset.page === 'pageTools') el.classList.add('active');
        });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Auto-popup QRIS: hanya Dashboard & AM Generator
    if (_targetEl && !_wasActive) autoShowQRIS();
}
function autoShowQRIS() {
    setTimeout(function () { if (typeof openQRIS === 'function') openQRIS(); }, 350);
}
function showToolPage(tool) {
    const toolNames = { 'encryption': 'Encryption Tools', 'presetfinder': 'Preset Finder', 'qrgenerator': 'QR Generator', 'capcut': 'CapCut Search', 'iphonequote': 'iPhone Quote Generator', 'spamtelegram': 'Spam Telegram', 'windowsquotes': 'Windows Quotes', 'tanyaustad': 'Tanya Ustad', 'brat': 'BRAT Generator', 'sertifikat': 'Sertifikat Tolol' };
    notifyToolUsage(toolNames[tool] || tool);
    switchPage(tool);
}
function switchFeature(feat) {
    document.querySelectorAll('.feature-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.feature-panel').forEach(p => p.classList.remove('active'));
    if (feat === 'am') {
        document.getElementById('tabAM').classList.add('active');
        document.getElementById('panelAM').classList.add('active');
    } else {
        document.getElementById('tabTT').classList.add('active');
        document.getElementById('panelTT').classList.add('active');
    }
}

/* ─── Generator AM ─── */
function goToStep(n) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('step' + n);
    if (target) target.classList.add('active');
    const dots = document.querySelectorAll('#progress span');
    dots.forEach((d, i) => {
        d.classList.remove('active', 'done');
        if (i + 1 < n) d.classList.add('done');
        if (i + 1 === n) d.classList.add('active');
    });
    const step2Btn = document.getElementById('goToStep2Btn');
    if (step2Btn) step2Btn.style.display = (n === 1) ? 'none' : 'block';
}
function showAlert(id, type, msg) {
    const el = document.getElementById(id);
    if (el) { el.className = 'alert show alert-' + type; el.innerHTML = msg; }
}
function hideAlert(id) {
    const el = document.getElementById(id);
    if (el) { el.className = 'alert'; el.innerHTML = ''; }
}
function setLoading(btnId, loading, text) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (loading) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:24px;height:24px;"></div> ' + (text || 'Processing...'); }
    else { btn.disabled = false; btn.innerHTML = text; }
}
async function sendMagicLink() {
    const email = document.getElementById('email').value.trim();
    hideAlert('alert1');
    if (!email || !email.includes('@') || !email.includes('.')) {
        showAlert('alert1', 'error', '<i class="fas fa-exclamation-circle"></i> Format email tidak valid.');
        return;
    }
    setLoading('btnSend', true, 'Mengirim...');
    try {
        const data = await apiSendLink(email);
        if (data.success) {
            currentEmail = email;
            document.getElementById('sentEmail').textContent = email;
            showToast('Magic link terkirim! Cek email');
            goToStep(2);
        } else {
            showAlert('alert1', 'error', '<i class="fas fa-exclamation-circle"></i> ' + (data.message || 'Gagal mengirim.'));
        }
    } catch (err) {
        showAlert('alert1', 'error', '<i class="fas fa-exclamation-circle"></i> ' + (err.message || 'Koneksi gagal.'));
    } finally {
        setLoading('btnSend', false, '<i class="fas fa-paper-plane"></i> Send Link');
    }
}
async function verifyLink() {
    const url = document.getElementById('magicUrl').value.trim();
    hideAlert('alert2');
    if (!url || !url.startsWith('http')) { showAlert('alert2', 'error', '<i class="fas fa-exclamation-circle"></i> Link tidak valid.'); return; }
    if (!currentEmail) { showAlert('alert2', 'error', '<i class="fas fa-exclamation-circle"></i> Email tidak ditemukan.'); return; }
    setLoading('btnVerif', true, 'Memverifikasi & Aktivasi...');
    try {
        const result = await apiVerifyLink(currentEmail, url);
        if (!result.success) throw new Error(result.message || 'Verifikasi & aktivasi premium gagal.');
        const orderId   = result.orderId   || 'PREMIUM-OK';
        const planName  = result.planName  || 'Alight Motion Pro';
        const validUntil = result.validUntil ? new Date(result.validUntil).toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' }) : '-';
        document.getElementById('codeOrder').textContent = orderId;
        // Tampilkan detail plan & expired jika elemennya ada
        const planEl  = document.getElementById('planName');
        const validEl = document.getElementById('validUntil');
        if (planEl)  planEl.textContent  = planName;
        if (validEl) validEl.textContent = validUntil;
        showToast('Akun berhasil diaktifkan!');
        goToStep(3);
        await notifyAMSuccess(currentUsername || 'Guest', currentEmail, orderId, planName, validUntil);
    } catch (err) {
        showAlert('alert2', 'error', '<i class="fas fa-exclamation-circle"></i> ' + (err.message || 'Koneksi gagal.'));
    } finally {
        setLoading('btnVerif', false, '<i class="fas fa-check"></i> Verify');
    }
}
function cancelProcess() {
    currentEmail = '';
    document.getElementById('email').value = '';
    document.getElementById('magicUrl').value = '';
    hideAlert('alert1'); hideAlert('alert2');
    goToStep(1); showToast('Proses dibatalkan');
}
function resetAll() {
    currentEmail = '';
    document.getElementById('email').value = '';
    document.getElementById('magicUrl').value = '';
    hideAlert('alert1'); hideAlert('alert2');
    goToStep(1);
}

/* ─── TikTok ─── */
function setTTMode(mode) {
    ttMode = mode;
    document.querySelectorAll('.mode-chip').forEach(c => c.classList.toggle('active', c.dataset.mode === mode));
    hideAlert('ttAlert');
    document.getElementById('ttResult').classList.remove('show');
}
function isValidTikTokUrl(url) {
    if (!url) return false;
    const u = url.toLowerCase();
    return u.includes('tiktok.com') || u.includes('vt.tiktok.com') || u.includes('vm.tiktok.com') || u.includes('t.tiktok.com');
}
async function forceDownload(url, filename) {
    if (!url) throw new Error('URL kosong');
    try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl; a.download = filename || 'download'; a.style.display = 'none';
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(objUrl); a.remove(); }, 1500);
        return true;
    } catch (err) {
        const a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.download = filename || 'download';
        document.body.appendChild(a); a.click(); a.remove();
        return false;
    }
}
async function downloadTikTok() {
    await notifyToolUsage('TikTok Downloader', `Mode: ${ttMode}`);
    const url = document.getElementById('ttUrl').value.trim();
    hideAlert('ttAlert');
    document.getElementById('ttResult').classList.remove('show');
    if (!url) { showAlert('ttAlert', 'error', '<i class="fas fa-exclamation-circle"></i> Masukkan link TikTok.'); return; }
    if (!isValidTikTokUrl(url)) { showAlert('ttAlert', 'error', '<i class="fas fa-exclamation-circle"></i> Link tidak valid.'); return; }
    const btn = document.getElementById('btnTT');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:24px;height:24px;"></div> Memproses...';
    try {
        if (ttMode === 'mp3') await handleMP3(url);
        else await handleAuto(url);
    } catch (err) {
        showAlert('ttAlert', 'error', '<i class="fas fa-exclamation-circle"></i> ' + (err.message || 'Gagal memproses.'));
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-download"></i> Download';
    }
}
async function handleAuto(url) {
    let data = null;
    try {
        const res = await fetch(TIKWM + '?url=' + encodeURIComponent(url) + '&hd=1');
        const json = await res.json();
        if (json.code === 0 && json.data) data = json.data;
    } catch (e) {}
    if (!data) throw new Error('Gagal mengambil data TikTok.');
    const images = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
    const isSlide = images.length > 0;
    const videoUrl = data.hdplay || data.play || data.download_url || null;
    const musicUrl = (data.music_info && data.music_info.play) || data.music || null;
    const title = data.title || 'TikTok';
    const authorObj = data.author || {};
    const author = String(authorObj.unique_id || authorObj.nickname || authorObj || '-').replace(/^@/, '');
    const cover = data.cover || data.origin_cover || data.thumbnail || (images[0] || '');
    const duration = data.duration || 0;
    document.getElementById('ttTitle').textContent = title;
    document.getElementById('ttAuthor').textContent = '@' + author;
    document.getElementById('ttInfo').textContent = isSlide ? (images.length + ' foto · Slide') : ((duration ? duration + 's · ' : '') + 'No Watermark');
    const badge = document.getElementById('ttTypeBadge');
    if (badge) badge.textContent = isSlide ? 'SLIDE' : 'VIDEO';
    const thumb = document.getElementById('ttThumb');
    if (cover) { thumb.src = cover; thumb.style.display = 'block'; } else { thumb.style.display = 'none'; }
    const body = document.getElementById('ttBody');
    body.innerHTML = '';
    if (isSlide) {
        const grid = document.createElement('div');
        grid.className = 'slide-grid';
        images.forEach((imgUrl, i) => {
            const src = typeof imgUrl === 'string' ? imgUrl : (imgUrl.url || imgUrl);
            if (!src) return;
            const card = document.createElement('div');
            card.className = 'slide-card';
            card.innerHTML = '<div class="slide-img-wrap"><img src="' + src + '" alt="Slide ' + (i + 1) + '" loading="lazy" /><div class="slide-num">' + (i + 1) + '</div></div>';
            const dlBtn = document.createElement('button');
            dlBtn.className = 'slide-dl';
            dlBtn.innerHTML = '↓ Download';
            dlBtn.onclick = async () => {
                dlBtn.disabled = true;
                dlBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;"></div>';
                const ok = await forceDownload(src, 'tiktok-slide-' + (i + 1) + '.jpg');
                showToast(ok ? ('Slide ' + (i + 1) + ' terdownload') : 'Dibuka di tab baru');
                dlBtn.disabled = false; dlBtn.innerHTML = '↓ Download';
            };
            card.appendChild(dlBtn);
            grid.appendChild(card);
        });
        body.appendChild(grid);
        if (musicUrl) {
            const musicBtn = document.createElement('button');
            musicBtn.className = 'btn-download';
            musicBtn.textContent = '🎵 Download Audio (MP3)';
            musicBtn.onclick = async () => {
                musicBtn.disabled = true;
                const ok = await forceDownload(musicUrl, 'tiktok-audio.mp3');
                showToast(ok ? 'Audio terdownload' : 'Dibuka di tab baru');
                musicBtn.disabled = false;
            };
            body.appendChild(musicBtn);
        }
    } else {
        if (!videoUrl) throw new Error('Link video tidak ditemukan.');
        const dlBtn = document.createElement('button');
        dlBtn.className = 'btn-download';
        dlBtn.innerHTML = '⬇ Download Video (No Watermark)';
        dlBtn.onclick = async () => {
            dlBtn.disabled = true;
            dlBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;"></div> Mengunduh...';
            const ok = await forceDownload(videoUrl, 'tiktok-nowm.mp4');
            showToast(ok ? 'Video terdownload!' : 'Dibuka di tab baru');
            dlBtn.disabled = false;
            dlBtn.innerHTML = '⬇ Download Video (No Watermark)';
        };
        body.appendChild(dlBtn);
    }
    document.getElementById('ttResult').classList.add('show');
    showToast(isSlide ? (images.length + ' slide ditemukan') : 'Video siap diunduh');
}
async function handleMP3(url) {
    let musicUrl = null;
    let meta = { title: 'TikTok Audio', author: '-', cover: '' };
    try {
        const res = await fetch(TIKWM + '?url=' + encodeURIComponent(url));
        const json = await res.json();
        if (json.code === 0 && json.data) {
            const d = json.data;
            musicUrl = (d.music_info && d.music_info.play) || d.music || null;
            meta.title = d.title || meta.title;
            meta.author = (d.author && (d.author.unique_id || d.author.nickname)) || meta.author;
            meta.cover = d.cover || '';
        }
    } catch (e) {}
    if (!musicUrl) throw new Error('Audio tidak tersedia.');
    document.getElementById('ttTitle').textContent = meta.title;
    document.getElementById('ttAuthor').textContent = '@' + String(meta.author).replace(/^@/, '');
    document.getElementById('ttInfo').textContent = 'MP3 · Audio only';
    const badge = document.getElementById('ttTypeBadge');
    if (badge) badge.textContent = 'MP3';
    const thumb = document.getElementById('ttThumb');
    if (meta.cover) { thumb.src = meta.cover; thumb.style.display = 'block'; } else { thumb.style.display = 'none'; }
    const body = document.getElementById('ttBody');
    body.innerHTML = '';
    const dlBtn = document.createElement('button');
    dlBtn.className = 'btn-download';
    dlBtn.innerHTML = '⬇ Download MP3';
    dlBtn.onclick = async () => {
        dlBtn.disabled = true;
        const ok = await forceDownload(musicUrl, 'tiktok-audio.mp3');
        showToast(ok ? 'MP3 terdownload!' : 'Dibuka di tab baru');
        dlBtn.disabled = false;
        dlBtn.innerHTML = '⬇ Download MP3';
    };
    body.appendChild(dlBtn);
    document.getElementById('ttResult').classList.add('show');
}

/* ─── Encryption ─── */
function selectEncMethod(el) {
    document.querySelectorAll('#toolEncryption .chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    encMethod = el.dataset.method;
}
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, c => {
        const base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    });
}
async function processEncryption() {
    const input = document.getElementById('encInput').value;
    let output = '';
    let methodName = '';
    try {
        switch (encMethod) {
            case 'base64enc': output = btoa(unescape(encodeURIComponent(input))); methodName = 'Base64 Encode'; break;
            case 'base64dec': output = decodeURIComponent(escape(atob(input))); methodName = 'Base64 Decode'; break;
            case 'md5': output = CryptoJS.MD5(input).toString(); methodName = 'MD5 Hash'; break;
            case 'sha256': output = CryptoJS.SHA256(input).toString(); methodName = 'SHA256 Hash'; break;
            case 'sha512': output = CryptoJS.SHA512(input).toString(); methodName = 'SHA512 Hash'; break;
            case 'rot13': output = rot13(input); methodName = 'ROT13'; break;
            default: output = 'Invalid method';
        }
        if (output && output !== 'Invalid method' && input) await notifyToolUsage('Encryption Tools', `Method: ${methodName}`);
    } catch (e) { output = 'Error: ' + e.message; }
    document.getElementById('encOutput').textContent = output;
    document.getElementById('encResult').classList.add('active');
}
function copyEncOutput() {
    const text = document.getElementById('encOutput').textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector('#encResult .copy-btn');
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 2000);
    });
}

/* ─── Preset Finder ─── */
const PF_BASE = 'https://amfinder.web.id';
// Isi dengan URL Cloudflare Worker kamu, contoh: 'https://preset-finder.namamu.workers.dev'
const PF_ENDPOINT = (window.API_BASE || '') + '/api/preset';
const PF_ROUTES = [{ name: 'Server API', api: true }];
function pfEsc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function pfDeviceId() {
    try {
        let id = localStorage.getItem('pf_did');
        if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : '267f6fd3-34f4-4d9a-8d90-5aa28db8922b'); localStorage.setItem('pf_did', id); }
        return id;
    } catch (e) { return '267f6fd3-34f4-4d9a-8d90-5aa28db8922b'; }
}
function pfEnv() {
    return {
        c: -787480068,
        sw: screen.width, sh: screen.height, cd: screen.colorDepth,
        dpr: window.devicePixelRatio || 1,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        tzo: new Date().getTimezoneOffset(),
        hc: navigator.hardwareConcurrency || 4,
        mtp: navigator.maxTouchPoints || 0,
        w: true, d: true
    };
}
const pfHex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
async function pfBsig(cid, salt, env) {
    const raw = `${cid}|${salt}|${env.c}|${env.sw}x${env.sh}|${env.cd}|${env.tz}|${env.tzo}|${env.hc}`;
    return pfHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)));
}
async function pfProof(saltHex, message, rounds) {
    const saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g).map(h => parseInt(h, 16)));
    const key = await crypto.subtle.importKey('raw', saltBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    let data = new TextEncoder().encode(message);
    const n = Math.max(1, Math.min(100000, Math.floor(Number(rounds) || 1)));
    for (let i = 0; i < n; i++) data = new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
    return pfHex(data);
}
async function pfFetch(route, url, opts, timeout) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout || 30000);
    try {
        const res = await fetch(route.wrap(url), Object.assign({}, opts, { signal: ctrl.signal }));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res;
    } finally { clearTimeout(t); }
}
async function pfHandshake(route) {
    const did = pfDeviceId(), env = pfEnv();
    const hs = PF_BASE + '/api/v/7f91a2e4';
    const jsonHeaders = { 'Content-Type': 'application/json' };
    const ch = await (await pfFetch(route, hs, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ did }) })).json();
    const { cid, salt, ts, rounds } = ch;
    if (!cid || !salt || !ts) throw new Error('Challenge tidak lengkap');
    const bsig = await pfBsig(cid, salt, env);
    const proof = await pfProof(salt, `${cid}|${did}|${ts}|${bsig}`, rounds);
    const vr = await (await pfFetch(route, hs, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ cid, did, ts, proof, bsig, env, score: 0, reasons: [] }) })).json();
    if (!vr || !vr.token) throw new Error('Token tidak valid');
    return vr.token;
}
function pfParseSse(raw, isUrl) {
    let ev = 'message', candidates = [], finalJson = null;
    raw.split(/\r?\n/).forEach(l => {
        l = l.trim();
        if (!l) return;
        if (l.startsWith('event:')) ev = l.slice(6).trim();
        else if (l.startsWith('data:')) {
            const d = l.slice(5).trim();
            let p = d; try { p = JSON.parse(d); } catch (_) {}
            if (ev === 'candidates' && p && Array.isArray(p.items)) candidates = p.items;
            else if (ev === 'result') finalJson = p;
        }
    });
    if (finalJson && typeof finalJson === 'object') return isUrl ? finalJson : (candidates.length ? { total: candidates.length, items: candidates } : finalJson);
    if (!isUrl && candidates.length) return { total: candidates.length, items: candidates };
    return null;
}
async function pfQuery(route, input) {
    if (route.api) {
        const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 90000);
        try {
            const res = await fetch(PF_ENDPOINT + '?q=' + encodeURIComponent(input), { signal: ctrl.signal });
            const j = await res.json().catch(() => null);
            if (!res.ok || !j || !j.status) throw new Error((j && j.message) || 'HTTP ' + res.status);
            return j.result;
        } finally { clearTimeout(t); }
    }
    const isUrl = /^https?:\/\//i.test(input);
    const token = await pfHandshake(route);
    const q = isUrl
        ? `${PF_BASE}/api/find?url=${encodeURIComponent(input)}&bat=46&chg=0&t=${encodeURIComponent(token)}`
        : `${PF_BASE}/api/search?mode=pick&q=${encodeURIComponent(input)}&t=${encodeURIComponent(token)}`;
    const raw = await (await pfFetch(route, q, { method: 'GET', headers: { 'Accept': 'text/event-stream' } }, 65000)).text();
    const parsed = pfParseSse(raw, isUrl);
    if (!parsed) throw new Error('Gagal memparsing hasil dari server');
    return parsed;
}
function pfCollectLinks(obj, out) {
    if (typeof obj === 'string') { if (/^https?:\/\//i.test(obj) && out.indexOf(obj) === -1) out.push(obj); }
    else if (Array.isArray(obj)) obj.forEach(v => pfCollectLinks(v, out));
    else if (obj && typeof obj === 'object') Object.values(obj).forEach(v => pfCollectLinks(v, out));
    return out;
}
function pfPick(o, keys) {
    for (const k of keys) if (o && typeof o[k] === 'string' && o[k]) return o[k];
    return '';
}
function initPresetFinderTool() {
    const form = document.getElementById('presetFinderForm');
    if (!form) return;
    const input = document.getElementById('pfInput');
    const loading = document.getElementById('pfLoader');
    const resultSection = document.getElementById('pfResult');
    const codeContent = document.getElementById('pfCodeContent');
    const copyBtn = document.getElementById('pfCopyBtn');
    const errorMessage = document.getElementById('pfError');
    const errorText = document.getElementById('pfErrorText');
    const sizeEl = document.getElementById('pfSize');
    const status = document.getElementById('pfProxyStatus');
    const dlSection = document.getElementById('pfDownloadSection');
    const dlBtn = document.getElementById('pfDownloadBtn');
    const candBox = document.getElementById('pfCandidates');
    const linkBox = document.getElementById('pfLinks');
    let lastJson = '';
    const cardStyle = 'display:flex;align-items:center;gap:12px;padding:12px;margin-bottom:8px;border-radius:14px;border:1.2px solid var(--c-borderLit);background:var(--c-card);cursor:pointer;';
    function fmtSize(b) { if (!b) return '0 B'; const s = ['B','KB','MB']; const i = Math.floor(Math.log(b) / Math.log(1024)); return parseFloat((b / Math.pow(1024, i)).toFixed(1)) + ' ' + s[i]; }
    function reset() {
        resultSection.classList.remove('active'); errorMessage.classList.remove('active');
        dlSection.classList.remove('active'); status.classList.remove('active');
        candBox.style.display = 'none'; candBox.innerHTML = '';
        linkBox.style.display = 'none'; linkBox.innerHTML = '';
    }
    function renderCandidates(items) {
        candBox.innerHTML = `<div style="margin-bottom:8px;color:var(--c-textSub);font-family:var(--font-mono);font-size:11px;font-weight:700;text-transform:uppercase;">Pilih video (${items.length})</div>` +
            items.map((it, idx) => {
                const title = pfEsc(pfPick(it, ['title','name','caption','desc','description']) || ('Item ' + (idx + 1)));
                const thumb = pfPick(it, ['thumbnail','thumb','cover','image','img','poster']);
                const link = pfPick(it, ['url','link','href','webpage_url']);
                const author = pfEsc(pfPick(it, ['author','channel','uploader','user']));
                return `<div class="pf-item" data-link="${pfEsc(link)}" style="${cardStyle}">
                    ${/^https?:/i.test(thumb) ? `<img src="${pfEsc(thumb)}" alt="" referrerpolicy="no-referrer" style="width:52px;height:52px;border-radius:10px;object-fit:cover;flex-shrink:0;">` : ''}
                    <div style="flex:1;text-align:left;min-width:0;">
                        <div style="font-size:12px;font-weight:700;color:var(--c-text);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${title}</div>
                        ${author ? `<div style="font-size:10px;color:var(--c-textSub);font-family:var(--font-mono);margin-top:2px;">${author}</div>` : ''}
                    </div>
                    <i class="fas fa-chevron-right" style="color:var(--c-textDim);font-size:12px;"></i>
                </div>`;
            }).join('');
        candBox.style.display = 'block';
        candBox.querySelectorAll('.pf-item').forEach(el => el.addEventListener('click', () => {
            const link = el.getAttribute('data-link');
            if (/^https?:\/\//i.test(link)) { input.value = link; run(link); } else showToast('Item ini tidak punya link');
        }));
    }
    function renderLinks(links) {
        if (!links.length) return;
        linkBox.innerHTML = `<div style="margin-bottom:8px;color:var(--c-textSub);font-family:var(--font-mono);font-size:11px;font-weight:700;text-transform:uppercase;">Link ditemukan</div>` +
            links.slice(0, 15).map(l => `<a href="${pfEsc(l)}" target="_blank" rel="noopener" style="${cardStyle}text-decoration:none;"><i class="fas fa-link" style="color:var(--c-textDim);"></i><div style="flex:1;text-align:left;min-width:0;font-size:11px;font-family:var(--font-mono);color:var(--c-text);word-break:break-all;">${pfEsc(l)}</div><i class="fas fa-external-link-alt" style="color:var(--c-textDim);font-size:12px;"></i></a>`).join('');
        linkBox.style.display = 'block';
    }
    async function run(text) {
        await notifyToolUsage('Preset Finder', `Query: ${text}`);
        loading.style.display = 'block';
        reset();
        status.classList.add('active');
        status.innerHTML = '<div style="margin-bottom:6px;color:var(--c-textSub);font-family:var(--font-mono);font-weight:700;font-size:11px;text-transform:uppercase;">CONNECTION STATUS</div>' +
            PF_ROUTES.map((r, i) => `<div class="proxy-status-item"><span class="proxy-dot pending" id="pfProxy${i}"></span> ${r.name}</div>`).join('');
        const dots = PF_ROUTES.map((r, i) => document.getElementById('pfProxy' + i));
        const errs = []; let data = null;
        for (let i = 0; i < PF_ROUTES.length && !data; i++) {
            if (dots[i]) dots[i].className = 'proxy-dot trying';
            try { data = await pfQuery(PF_ROUTES[i], text); if (dots[i]) dots[i].className = 'proxy-dot success'; }
            catch (e) { errs.push(PF_ROUTES[i].name + ': ' + e.message); if (dots[i]) dots[i].className = 'proxy-dot fail'; }
        }
        try {
            if (!data) throw new Error(errs.join(' | ') || 'Unknown error');
            lastJson = JSON.stringify(data, null, 2);
            codeContent.textContent = lastJson;
            sizeEl.textContent = fmtSize(new Blob([lastJson]).size);
            if (data.items && Array.isArray(data.items) && !/^https?:\/\//i.test(text)) renderCandidates(data.items);
            else renderLinks(pfCollectLinks(data, []));
            resultSection.classList.add('active');
            dlSection.classList.add('active');
            showToast('Selesai!');
        } catch (e) {
            errorMessage.classList.add('active');
            errorText.innerHTML = `<strong>Pencarian Gagal</strong><br>${pfEsc(e.message)}`;
            showToast('Gagal mencari preset');
        } finally { loading.style.display = 'none'; }
    }
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const v = input.value.trim();
        if (!v) { showToast('Masukkan link atau kata kunci'); return; }
        run(v);
    });
    copyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(codeContent.textContent).then(() => {
            copyBtn.innerHTML = '<i class="fas fa-check"></i> COPIED!';
            setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i> COPY'; }, 2000);
            showToast('Copied!');
        });
    });
    dlBtn.addEventListener('click', function () {
        if (!lastJson) return;
        const url = URL.createObjectURL(new Blob([lastJson], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = 'preset_result.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        showToast('File downloaded!');
    });
}

/* ─── QR ─── */
function generateQRCode() {
    const text = document.getElementById('qrInput').value.trim();
    const errorToast = document.getElementById('qrError');
    if (!text) {
        errorToast.textContent = 'Masukkan text atau URL!';
        errorToast.classList.add('visible');
        setTimeout(() => errorToast.classList.remove('visible'), 3000);
        return;
    }
    errorToast.classList.remove('visible');
    notifyToolUsage('QR Generator', `Data: ${text.substring(0, 50)}`);
    const container = document.getElementById('qrcode');
    const qrWrapper = document.getElementById('qrWrapper');
    const qrPlaceholder = document.getElementById('qrPlaceholder');
    const qrActions = document.getElementById('qrActions');
    container.innerHTML = '';
    qrWrapper.classList.remove('active');
    qrActions.classList.remove('active');
    qrPlaceholder.style.display = 'flex';
    if (qrInstance) qrInstance = null;
    try {
        qrInstance = new QRCode(container, { text: text, width: 200, height: 200, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
        setTimeout(() => {
            qrPlaceholder.style.display = 'none';
            qrWrapper.classList.add('active');
            qrActions.classList.add('active');
            showToast('QR Code berhasil di-generate!');
        }, 100);
    } catch (err) {
        errorToast.textContent = 'Gagal membuat QR Code.';
        errorToast.classList.add('visible');
        setTimeout(() => errorToast.classList.remove('visible'), 3000);
    }
}
function downloadQRCode() {
    const img = document.querySelector('#qrcode img');
    const canvas = document.querySelector('#qrcode canvas');
    let url = null;
    if (img) url = img.src; else if (canvas) url = canvas.toDataURL('image/png');
    if (!url) { showToast('Tidak ada QR Code'); return; }
    const link = document.createElement('a');
    link.href = url; link.download = `QR_Code_${Date.now()}.png`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast('Download dimulai!');
}
function resetQRCode() {
    const container = document.getElementById('qrcode');
    const qrWrapper = document.getElementById('qrWrapper');
    const qrPlaceholder = document.getElementById('qrPlaceholder');
    const qrActions = document.getElementById('qrActions');
    const inputField = document.getElementById('qrInput');
    if (qrInstance) { qrInstance.clear(); qrInstance = null; }
    container.innerHTML = '';
    qrWrapper.classList.remove('active');
    qrActions.classList.remove('active');
    qrPlaceholder.style.display = 'flex';
    inputField.value = ''; inputField.focus();
    document.getElementById('qrError').classList.remove('visible');
    showToast('QR Generator di-reset');
}

/* ─── CapCut ─── */
function quickCapCut(el, q) {
    document.querySelectorAll('#toolCapCut .chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('ccSearchInput').value = q;
    searchCapCut(q || 'trending');
    if (q) document.getElementById('capcutLink').href = 'https://www.capcut.com/templates/search?query=' + encodeURIComponent(q);
}
function searchCapCut(query) {
    if (query === undefined) query = document.getElementById('ccSearchInput').value.trim();
    if (!query) query = 'trending';
    notifyToolUsage('CapCut Search', `Query: ${query}`);
    const loading = document.getElementById('ccLoading');
    const results = document.getElementById('ccTemplateResults');
    loading.classList.add('show');
    results.innerHTML = '';
    setTimeout(() => { loading.classList.remove('show'); renderCapCutFallback(query); }, 800);
}
function renderCapCutFallback(query) {
    const categories = [
        { name: 'Trending Now', desc: 'Most popular templates', icon: '🔥', url: 'https://www.capcut.com/templates' },
        { name: 'Lyrics Templates', desc: 'Music & lyrics video', icon: '🎵', url: 'https://www.capcut.com/templates/search?query=lyrics' },
        { name: 'Transition Pack', desc: 'Smooth transitions', icon: '✨', url: 'https://www.capcut.com/templates/search?query=transition' },
        { name: 'Vlog Templates', desc: 'For daily vlogs', icon: '📹', url: 'https://www.capcut.com/templates/search?query=vlog' },
        { name: 'Cinematic Edit', desc: 'Film-style templates', icon: '🎬', url: 'https://www.capcut.com/templates/search?query=cinematic' },
    ];
    document.getElementById('ccResultCount').textContent = 'Browse popular template categories';
    document.getElementById('ccTemplateResults').innerHTML = categories.map(c => `
        <div style="display:flex;align-items:center;gap:12px;padding:14px;margin-bottom:8px;border-radius:14px;border:1.2px solid var(--c-borderLit);background:var(--c-card);cursor:pointer;" onclick="window.open('${c.url}','_blank')">
            <div style="width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(225,29,46,.15);border:1.2px solid rgba(225,29,46,.5);font-size:20px;flex-shrink:0;">${c.icon}</div>
            <div style="flex:1;text-align:left;">
                <div style="font-family:var(--font-evolve);font-size:13px;font-weight:700;color:var(--c-text);margin-bottom:2px;text-transform:uppercase;">${c.name}</div>
                <div style="font-size:10px;color:var(--c-textSub);font-family:var(--font-mono);">${c.desc}</div>
            </div>
            <i class="fas fa-chevron-right" style="color:var(--c-textDim);font-size:12px;"></i>
        </div>
    `).join('') + `<div class="suggestion-text">Search results open directly on CapCut.</div>`;
}

/* ─── iPhone Quote ─── */
function initiPhoneQuote() {
    const timeInput = document.getElementById('iqTimeInput');
    if (!timeInput) return;
    const batteryInput = document.getElementById('iqBatteryInput');
    const carrierInput = document.getElementById('iqCarrierInput');
    const messageInput = document.getElementById('iqMessageInput');
    const generateBtn = document.getElementById('iqGenerateBtn');
    const loader = document.getElementById('iqLoader');
    const resultCard = document.getElementById('iqResultCard');
    const resultImg = document.getElementById('iqResultImg');
    const downloadBtn = document.getElementById('iqDownloadBtn');
    const resetBtn = document.getElementById('iqResetBtn');
    const errorToast = document.getElementById('iqErrorToast');
    let currentApiUrl = '';
    const now = new Date();
    timeInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    batteryInput.value = '100';
    carrierInput.value = 'Telkomsel';
    function showError(message) {
        errorToast.textContent = message;
        errorToast.classList.add('visible');
        setTimeout(() => errorToast.classList.remove('visible'), 3000);
    }
    generateBtn.addEventListener('click', async function() {
        const time = timeInput.value.trim();
        const battery = batteryInput.value.trim();
        const carrier = carrierInput.value.trim();
        const message = messageInput.value.trim();
        if (!time || !battery || !carrier || !message) { showError("All fields must be filled!"); return; }
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(time)) { showError("Invalid time format!"); return; }
        const batteryNum = parseInt(battery);
        if (isNaN(batteryNum) || batteryNum < 1 || batteryNum > 100) { showError("Battery 1-100!"); return; }
        errorToast.classList.remove('visible');
        resultCard.classList.remove('active');
        loader.style.display = 'block';
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        await notifyToolUsage('iPhone Quote Generator', `Time: ${time}, Battery: ${battery}%`);
        currentApiUrl = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(time)}&batteryPercentage=${battery}&carrierName=${encodeURIComponent(carrier)}&messageText=${encodeURIComponent(message)}&emojiStyle=apple`;
        resultImg.src = currentApiUrl;
        resultImg.onload = () => {
            loader.style.display = 'none';
            resultCard.classList.add('active');
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-bolt"></i> Generate Quote';
            resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
        resultImg.onerror = () => {
            loader.style.display = 'none';
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-bolt"></i> Generate Quote';
            showError("Failed to generate image.");
        };
    });
    downloadBtn.addEventListener('click', () => {
        if (!currentApiUrl) { showError("No quote to download."); return; }
        const link = document.createElement('a');
        link.href = currentApiUrl;
        link.download = `iphone_quote_${Date.now()}.png`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    });
    resetBtn.addEventListener('click', () => {
        messageInput.value = '';
        resultCard.classList.remove('active');
        resultImg.src = '';
        currentApiUrl = '';
        messageInput.focus();
    });
}

/* ─── Telegram Spam ─── */
function initTelegramSpam() {
    const tgEl = {
        statusMsgCount: document.getElementById('tgStatusMsgCount'),
        statusBot: document.getElementById('tgStatusBot'),
        heroMsgCount: document.getElementById('tgHeroMsgCount'),
        heroBotStatus: document.getElementById('tgHeroBotStatus'),
        heroSpamStatus: document.getElementById('tgHeroSpamStatus'),
        botToken: document.getElementById('tgBotToken'),
        targetId: document.getElementById('tgTargetId'),
        testBtn: document.getElementById('tgTestBtn'),
        spamText: document.getElementById('tgSpamText'),
        messagePreview: document.getElementById('tgMessagePreview'),
        count: document.getElementById('tgCount'),
        countRange: document.getElementById('tgCountRange'),
        delay: document.getElementById('tgDelay'),
        delayRange: document.getElementById('tgDelayRange'),
        startBtn: document.getElementById('tgStartBtn'),
        stopBtn: document.getElementById('tgStopBtn'),
        logContainer: document.getElementById('tgLogContainer')
    };
    if (!tgEl.botToken) return;
    const tgState = { botToken: '', targetId: '', isConnected: false, isSpamming: false, messageCount: 0, customMessage: 'Hallo' };
    function tgShowToast(message, type) {
        showToast(message);
    }
    function tgLogMessage(message, type) {
        type = type || 'info';
        const entry = document.createElement('div');
        entry.className = 'tg-log-entry tg-log-' + type;
        const now = new Date();
        const time = now.toLocaleTimeString('en-GB', { hour12: false });
        entry.textContent = '[' + time + '] ' + message;
        tgEl.logContainer.appendChild(entry);
        tgEl.logContainer.scrollTop = tgEl.logContainer.scrollHeight;
    }
    function tgUpdateBotStatus(online) {
        tgState.isConnected = online;
        if (online) {
            tgEl.statusBot.textContent = 'Online';
            tgEl.statusBot.className = 'tg-status-value tg-online';
            tgEl.heroBotStatus.textContent = 'Online';
            tgEl.heroBotStatus.style.color = 'var(--success)';
        } else {
            tgEl.statusBot.textContent = 'Offline';
            tgEl.statusBot.className = 'tg-status-value tg-offline';
            tgEl.heroBotStatus.textContent = 'Offline';
            tgEl.heroBotStatus.style.color = 'var(--danger)';
        }
    }
    function tgUpdateMessageCount(count) {
        tgState.messageCount = count;
        tgEl.statusMsgCount.textContent = count;
        tgEl.heroMsgCount.textContent = count;
    }
    function tgSyncInputs(rangeId, numberId) {
        const range = document.getElementById(rangeId);
        const number = document.getElementById(numberId);
        range.addEventListener('input', () => { number.value = range.value; });
        number.addEventListener('input', () => {
            let val = parseInt(number.value);
            if (isNaN(val)) val = parseInt(range.min);
            val = Math.min(parseInt(range.max), Math.max(parseInt(range.min), val));
            number.value = val; range.value = val;
        });
    }
    function tgUpdateMessagePreview() {
        const text = tgEl.spamText.value.trim();
        if (text) { tgEl.messagePreview.textContent = text; tgState.customMessage = text; }
        else { tgEl.messagePreview.textContent = 'No message entered'; tgState.customMessage = ''; }
    }
    function tgLoadConfig() {
        const token = localStorage.getItem('tg_bot_token');
        const target = localStorage.getItem('tg_chat_id');
        if (token) tgEl.botToken.value = token;
        if (target) tgEl.targetId.value = target;
    }
    window.tgSwitchTab = function(tabName) {
        document.querySelectorAll('#toolSpamTelegram .feature-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tgTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1)).classList.add('active');
        document.querySelectorAll('#toolSpamTelegram .feature-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('tgPanel' + tabName.charAt(0).toUpperCase() + tabName.slice(1)).classList.add('active');
    };
    window.tgTestConnection = async function() {
        const token = tgEl.botToken.value.trim();
        if (!token) { tgShowToast('Enter bot token first!', 'error'); return; }
        tgState.botToken = token;
        tgState.targetId = tgEl.targetId.value.trim();
        tgLogMessage('Testing connection...', 'info');
        tgEl.testBtn.disabled = true;
        tgEl.testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        try {
            const response = await fetch('https://api.telegram.org/bot' + token + '/getMe');
            const data = await response.json();
            if (data.ok && data.result) {
                tgUpdateBotStatus(true);
                tgLogMessage('Bot connected: @' + data.result.username, 'success');
                tgShowToast('Connected: @' + data.result.username, 'success');
            } else throw new Error(data.description || 'Connection failed');
        } catch (error) {
            tgUpdateBotStatus(false);
            tgLogMessage('Connection failed: ' + error.message, 'error');
            tgShowToast('Connection failed', 'error');
        } finally {
            tgEl.testBtn.disabled = false;
            tgEl.testBtn.innerHTML = '<i class="fas fa-network-wired"></i> Test Connection';
        }
    };
    window.tgSaveConfig = function() {
        const token = tgEl.botToken.value.trim();
        const target = tgEl.targetId.value.trim();
        if (!token) { tgShowToast('Enter bot token first!', 'warning'); return; }
        localStorage.setItem('tg_bot_token', token);
        localStorage.setItem('tg_chat_id', target);
        tgState.botToken = token; tgState.targetId = target;
        tgLogMessage('Configuration saved', 'success');
        tgShowToast('Configuration saved', 'success');
    };
    window.tgStartSpam = async function() {
        if (!tgState.isConnected) { tgShowToast('Connect bot first!', 'error'); return; }
        const message = tgEl.spamText.value.trim();
        if (!message) { tgShowToast('Enter a message!', 'error'); return; }
        let count = parseInt(tgEl.count.value) || 10;
        let delayMs = parseInt(tgEl.delay.value) || 0;
        count = Math.max(1, Math.min(100, count));
        delayMs = Math.max(0, Math.min(5000, delayMs));
        tgState.isSpamming = true;
        tgState.customMessage = message;
        tgEl.startBtn.style.display = 'none';
        tgEl.stopBtn.style.display = 'inline-flex';
        tgEl.heroSpamStatus.textContent = 'Active';
        tgLogMessage('--- SPAM STARTED ---', 'warning');
        let successCount = 0, failCount = 0;
        for (let i = 0; i < count; i++) {
            if (!tgState.isSpamming) break;
            try {
                const resp = await fetch('https://api.telegram.org/bot' + tgState.botToken + '/sendMessage', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: tgState.targetId, text: tgState.customMessage })
                });
                const respData = await resp.json();
                if (resp.ok && respData.ok) {
                    successCount++;
                    tgUpdateMessageCount(tgState.messageCount + 1);
                    if ((i + 1) % 5 === 0 || i === 0) tgLogMessage('Sent ' + (i + 1) + '/' + count, 'success');
                } else { failCount++; tgLogMessage('Failed #' + (i + 1), 'error'); }
            } catch (err) { failCount++; tgLogMessage('Error #' + (i + 1) + ': ' + err.message, 'error'); }
            if (delayMs > 0 && i < count - 1 && tgState.isSpamming) await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        tgFinishSpam(successCount, failCount, count);
    };
    window.tgStopSpam = function() {
        if (tgState.isSpamming) {
            tgState.isSpamming = false;
            tgLogMessage('Spam stopped by user', 'warning');
            tgShowToast('Spam stopped', 'warning');
        }
    };
    function tgFinishSpam(success, failed, total) {
        tgState.isSpamming = false;
        tgEl.startBtn.style.display = 'inline-flex';
        tgEl.stopBtn.style.display = 'none';
        tgEl.heroSpamStatus.textContent = 'Idle';
        tgLogMessage('--- SPAM COMPLETED ---', 'warning');
        tgLogMessage('Results: ' + success + '/' + total, 'success');
        tgShowToast('Done: ' + success + '/' + total, 'success');
    }
    tgSyncInputs('tgCountRange', 'tgCount');
    tgSyncInputs('tgDelayRange', 'tgDelay');
    tgLoadConfig();
    tgEl.spamText.addEventListener('input', tgUpdateMessagePreview);
    setTimeout(function() {
        tgLogMessage('Telegram Bot Spam Tool ready', 'success');
        tgUpdateMessagePreview();
    }, 400);
}

/* ─── Toast / Notification ─── */
function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const toastMsg = document.getElementById('toastMsg');
    if (toastMsg) toastMsg.textContent = msg;
    toast.classList.add('show');
    clearTimeout(_toastTimeout);
    _toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
}
function showNotification(message, icon = 'fa-circle-check') {
    const n = document.createElement('div');
    n.className = 'notification';
    n.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    document.body.appendChild(n);
    setTimeout(() => { if (n.parentNode) document.body.removeChild(n); }, 2500);
}

/* ─── Modals ─── */
function openModal(id) { const el = document.getElementById(id); if (el) el.classList.add('show'); }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('show'); }
function showInfoDialog() { openModal('infoModal'); }
function openQRIS() { const el = document.getElementById('qrisModal'); if (el) el.classList.add('show'); document.body.style.overflow = 'hidden'; }
function closeQRIS(e) {
    if (e && e.target !== e.currentTarget) return;
    const el = document.getElementById('qrisModal');
    if (el) el.classList.remove('show');
    document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeQRIS(); });

/* ─── Background ─── */
function renderBgThumbnails() {
    const container = document.getElementById('bgThumbnails');
    if (!container) return;
    container.innerHTML = '';
    STATE.defaultBgPaths.forEach((path, idx) => {
        const div = document.createElement('div');
        div.className = 'bg-thumb' + (idx === STATE.bgIndex && !STATE.isBgFromGallery ? ' active' : '');
        div.innerHTML = `
            <img src="${path}" alt="BG ${idx+1}" onerror="this.src='https://placehold.co/70x70/FFD600/111111?text=BG${idx+1}'" />
            ${idx === STATE.bgIndex && !STATE.isBgFromGallery ? '<div class="check"><i class="fas fa-check-circle"></i></div>' : ''}
        `;
        div.onclick = () => selectBg(idx);
        container.appendChild(div);
    });
}
function selectBg(idx) {
    STATE.bgIndex = idx;
    STATE.isBgFromGallery = false;
    STATE.bgPath = STATE.defaultBgPaths[idx];
    applyBackground(STATE.bgPath);
    renderBgThumbnails();
    showToast('Background diubah!');
    closeModal('bgModal');
}
function applyBackground(path) {
    document.body.style.backgroundImage = `url(${path})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundColor = 'transparent';
    const overlay = document.getElementById('bgOverlayStyle');
    if (overlay) overlay.remove();
    const style = document.createElement('style');
    style.id = 'bgOverlayStyle';
    style.textContent = `body::before { content: ''; position: fixed; inset: 0; background: rgba(5,7,12,0.75); z-index: -1; pointer-events: none; }`;
    document.head.appendChild(style);
}
function resetBackground() {
    STATE.isBgFromGallery = false;
    STATE.bgPath = STATE.defaultBgPaths[0];
    STATE.bgIndex = 0;
    const style = document.getElementById('bgOverlayStyle');
    if (style) style.remove();
    document.body.style.backgroundImage = '';
    document.body.style.backgroundColor = 'var(--c-bg)';
    renderBgThumbnails();
    showToast('Background direset!');
    closeModal('bgModal');
}
function pickFromGallery() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            STATE.isBgFromGallery = true;
            STATE.bgPath = ev.target.result;
            applyBackground(STATE.bgPath);
            showToast('Gambar dari galeri dipilih!');
            closeModal('bgModal');
        };
        reader.readAsDataURL(file);
    };
    input.click();
}
function openBgPicker() { renderBgThumbnails(); openModal('bgModal'); }

/* ─── Logout ─── */
function handleLogout() { openModal('logoutModal'); }
function confirmLogout() {
    closeModal('logoutModal');
    localStorage.removeItem('4vell_session');
    localStorage.removeItem('4vell_username');
    showToast('Logout berhasil!');
    setTimeout(() => { location.reload(); }, 500);
}

/* ─── AI Bubble ─── */
const AI_MESSAGES = [
    "Halo! Selamat datang di 4VELL 🚀",
    "Ayo buka fitur canggih nya! 🔥",
    "BTC Chart real-time! 📈",
    "Gabung channel 4VELL untuk info update! 📢",
    "Selamat berkarya dengan 4VELL! ✨",
    "Fitur terbaru sudah menunggumu! 🎯",
    "Ayo eksplor semua tools yang tersedia! 🛠️",
];
let aiIndex = 0;
function rotateAI() {
    aiIndex = (aiIndex + 1) % AI_MESSAGES.length;
    const el = document.getElementById('aiMessage');
    if (el) el.textContent = AI_MESSAGES[aiIndex];
}
let isDragging = false, startX, startY, origX, origY;
const aiBubble = document.getElementById('aiBubble');
if (aiBubble) {
    aiBubble.addEventListener('mousedown', (e) => {
        if (e.target.closest('.avatar') || e.target.closest('.message')) {
            isDragging = true;
            const rect = aiBubble.getBoundingClientRect();
            startX = e.clientX; startY = e.clientY;
            origX = rect.left; origY = rect.top;
            aiBubble.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newX = origX + dx;
        let newY = origY + dy;
        const maxX = window.innerWidth - aiBubble.offsetWidth - 10;
        const maxY = window.innerHeight - aiBubble.offsetHeight - 80;
        newX = Math.max(10, Math.min(maxX, newX));
        newY = Math.max(80, Math.min(maxY, newY));
        aiBubble.style.left = newX + 'px';
        aiBubble.style.top = newY + 'px';
        aiBubble.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => { isDragging = false; aiBubble.style.cursor = 'grab'; });
    aiBubble.addEventListener('click', () => {
        if (isDragging) return;
        aiBubble.classList.toggle('expanded');
        const icon = aiBubble.querySelector('.expand-icon i');
        if (aiBubble.classList.contains('expanded')) {
            icon.className = 'fas fa-chevron-up';
            aiBubble.style.maxWidth = '260px';
        } else {
            icon.className = 'fas fa-chevron-down';
            aiBubble.style.maxWidth = '200px';
        }
    });
}

console.log('🚀 4VELL Oblivion Dashboard loaded!');
