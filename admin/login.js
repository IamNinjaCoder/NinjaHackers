document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('loginError');
    if (errorEl) errorEl.textContent = '';
    
    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            window.location.href = '/admin/';
        } else {
            if (errorEl) errorEl.textContent = data.error || 'Login failed.';
        }
    } catch (err) {
        if (errorEl) errorEl.textContent = 'Connection error. Please try again.';
    }
}
