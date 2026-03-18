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

    // Image Fallback Handler
    document.querySelectorAll('img[data-fallback]').forEach(img => {
        img.addEventListener('error', () => {
            img.style.display = 'none';
            const fallback = document.getElementById(img.getAttribute('data-fallback'));
            if (fallback) fallback.style.display = 'flex';
        });
    });

    // Form Event Listener
    const contactForm = document.getElementById('contactForm');
    if (contactForm) contactForm.addEventListener('submit', handleSubmit);

    // Scroll listener
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (nav) {
            nav.style.boxShadow = window.scrollY > 20 ? '0 4px 30px rgba(0,0,0,0.4)' : '';
        }
    });

    // Mobile menu listener
    const hamburger = document.getElementById('hamburger');
    if (hamburger) hamburger.addEventListener('click', toggleMenu);
});

async function handleSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value.trim();
    if (!name || !email || !message) return;

    const btn = e.target.querySelector('button[type="submit"]');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, subject, message })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('contactForm').style.display = 'none';
            document.getElementById('formSuccess').style.display = 'block';
        } else {
            alert(data.error || 'Failed to send message.');
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        }
    } catch (err) {
        alert('Connection error. Please try again.');
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
}

function toggleMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('open');
}
