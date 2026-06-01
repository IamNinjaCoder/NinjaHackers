let pendingVerifyEmail = '';

document.addEventListener('DOMContentLoaded', () => {
    // Matrix Canvas Background
    (function () {
        const c = document.getElementById('matrix-canvas');
        if (!c) return;
        const x = c.getContext('2d');
        c.width = window.innerWidth;
        c.height = window.innerHeight;
        const ch = '01アイウエオカキクケコサシスセソ', fs = 14;
        let dr = Array(Math.floor(c.width / fs)).fill(1);
        function d() {
            x.fillStyle = 'rgba(5,10,14,0.05)';
            x.fillRect(0, 0, c.width, c.height);
            x.fillStyle = '#00ff88';
            x.font = fs + 'px Share Tech Mono';
            dr.forEach((y, i) => {
                x.fillText(ch[Math.floor(Math.random() * ch.length)], i * fs, y * fs);
                if (y * fs > c.height && Math.random() > 0.975) dr[i] = 0;
                dr[i]++;
            });
        }
        setInterval(d, 50);
        window.addEventListener('resize', () => {
            c.width = window.innerWidth;
            c.height = window.innerHeight;
            dr = Array(Math.floor(c.width / fs)).fill(1);
        });
    })();

    // Form Event Listeners
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) forgotForm.addEventListener('submit', handleForgotPassword);

    const resetForm = document.getElementById('resetForm');
    if (resetForm) resetForm.addEventListener('submit', handleResetPassword);

    // Button Listeners (Programmatic)
    const forgotLink = document.getElementById('forgotLink');
    if (forgotLink) forgotLink.addEventListener('click', showForgotForm);

    const backToLoginForgot = document.getElementById('backToLoginForgot');
    if (backToLoginForgot) backToLoginForgot.addEventListener('click', showLoginForm);

    const backToLoginReset = document.getElementById('backToLoginReset');
    if (backToLoginReset) backToLoginReset.addEventListener('click', showLoginForm);

    // Auto-redirect if already logged in
    fetch('/api/student/check')
        .then(res => res.json())
        .then(data => {
            if (data.authenticated) window.location.href = '/learn';
        })
        .catch(() => {});
});

function showToast(msg, err = false) {
    const e = document.getElementById('toast');
    if (!e) return;
    e.textContent = msg;
    e.className = 'toast show' + (err ? ' error' : '');
    setTimeout(() => { e.className = 'toast'; }, 3000);
}

function clearErrors() {
    ['loginError', 'forgotError', 'resetError'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('forgotForm').style.display = 'none';
    document.getElementById('resetForm').style.display = 'none';
    document.getElementById('authToggle').style.display = 'block';
    clearErrors();
}

function showForgotForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('forgotForm').style.display = 'block';
    document.getElementById('authToggle').style.display = 'none';
    clearErrors();
}

function showResetForm(email) {
    document.getElementById('forgotForm').style.display = 'none';
    document.getElementById('resetForm').style.display = 'block';
    const display = document.getElementById('resetEmailDisplay');
    if (display) display.textContent = email;
    pendingVerifyEmail = email;
    clearErrors();
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    if (errorEl) errorEl.textContent = '';

    const btn = e.target.querySelector('button[type="submit"]');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/student/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast('Welcome back! Redirecting...');
            setTimeout(() => { window.location.href = '/learn'; }, 1000);
        } else {
            if (errorEl) errorEl.textContent = data.error || 'Login failed.';
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        }
    } catch (err) {
        if (errorEl) errorEl.textContent = 'Connection error.';
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();
    const errorEl = document.getElementById('forgotError');
    if (errorEl) errorEl.textContent = '';

    const btn = e.target.querySelector('button[type="submit"]');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/student/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('Reset code sent to your email 📧');
            showResetForm(email);
        } else {
            if (errorEl) errorEl.textContent = data.error || 'Error requesting reset.';
        }
    } catch (err) {
        if (errorEl) errorEl.textContent = 'Connection error.';
    }
    btn.innerHTML = oldHtml;
    btn.disabled = false;
}

async function handleResetPassword(e) {
    e.preventDefault();
    const otp = document.getElementById('resetOtp').value.trim();
    const newPassword = document.getElementById('resetNewPassword').value;
    const errorEl = document.getElementById('resetError');
    if (errorEl) errorEl.textContent = '';

    const btn = e.target.querySelector('button[type="submit"]');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/student/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: pendingVerifyEmail, otp, newPassword })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast('Password reset! Please login.');
            showLoginForm();
        } else {
            if (errorEl) errorEl.textContent = data.error || 'Reset failed.';
        }
    } catch (err) {
        if (errorEl) errorEl.textContent = 'Connection error.';
    }
    btn.innerHTML = oldHtml;
    btn.disabled = false;
}
