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
    const signupForm = document.getElementById('signupForm');
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    const otpForm = document.getElementById('otpForm');
    if (otpForm) otpForm.addEventListener('submit', handleVerifyOTP);

    // Button Listeners
    const resendBtn = document.getElementById('resendOtpBtn');
    if (resendBtn) resendBtn.addEventListener('click', resendOTP);

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
    ['signupError', 'otpError'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });
}

function showOTPForm(email) {
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('otpForm').style.display = 'block';
    document.getElementById('otpEmailDisplay').textContent = email;
    pendingVerifyEmail = email;
    document.querySelector('.auth-title').textContent = 'Verify Email';
    document.querySelector('.auth-sub').textContent = 'Please enter the verification code';
    clearErrors();
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const errorEl = document.getElementById('signupError');
    if (errorEl) errorEl.textContent = '';

    const btn = e.target.querySelector('button[type="submit"]');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/student/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            if (data.requiresVerification) {
                showOTPForm(data.email);
                showToast('Check your email for the verification code! 📧');
            } else {
                showToast('Account created! Welcome aboard 🥷');
                setTimeout(() => { window.location.href = '/learn'; }, 1000);
            }
        } else {
            if (errorEl) errorEl.textContent = data.error || 'Signup failed.';
        }
    } catch (err) {
        if (errorEl) errorEl.textContent = 'Connection error.';
    }
    btn.innerHTML = oldHtml;
    btn.disabled = false;
}

async function handleVerifyOTP(e) {
    e.preventDefault();
    const otp = document.getElementById('otpInput').value.trim();
    const errorEl = document.getElementById('otpError');
    if (errorEl) errorEl.textContent = '';

    const btn = e.target.querySelector('button[type="submit"]');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    btn.disabled = true;

    if (!otp || otp.length !== 6) {
        if (errorEl) errorEl.textContent = 'Enter the 6-digit code.';
        btn.innerHTML = oldHtml;
        btn.disabled = false;
        return;
    }

    try {
        const res = await fetch('/api/student/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: pendingVerifyEmail, otp })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast('Email verified! Redirecting to Dashboard... 🥷');
            setTimeout(() => { window.location.href = '/learn'; }, 1000);
        } else {
            if (errorEl) errorEl.textContent = data.error || 'Verification failed.';
        }
    } catch (err) {
        if (errorEl) errorEl.textContent = 'Connection error.';
    }
    btn.innerHTML = oldHtml;
    btn.disabled = false;
}

async function resendOTP() {
    if (!pendingVerifyEmail) return;
    try {
        const res = await fetch('/api/student/resend-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: pendingVerifyEmail })
        });
        const data = await res.json();
        if (res.ok && data.success) showToast('Verification code resent! 📧');
        else showToast(data.error || 'Failed to resend code.', true);
    } catch (err) {
        showToast('Connection error.', true);
    }
}
