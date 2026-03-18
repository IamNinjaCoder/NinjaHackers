let currentStudent = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Matrix + nav
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

    // Scroll listener
    window.addEventListener('scroll', () => {
        const n = document.getElementById('navbar');
        if (n) n.style.boxShadow = window.scrollY > 20 ? '0 4px 30px rgba(0,0,0,0.4)' : '';
    });

    // Mobile menu helper
    const hamburger = document.getElementById('hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', toggleMenu);
    }

    // Event delegation for course grid (Razorpay Fix)
    const grid = document.getElementById('courseGrid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            const enrollBtn = e.target.closest('.btn-enroll:not(.enrolled)');
            if (enrollBtn) {
                const courseId = enrollBtn.getAttribute('data-course-id');
                if (courseId) handleBuy(parseInt(courseId));
            }
        });
    }

    // Check student auth
    try {
        const res = await fetch('/api/student/check');
        const data = await res.json();
        if (data.authenticated) {
            currentStudent = data.student;
            const bar = document.getElementById('studentBar');
            const nameBar = document.getElementById('studentNameBar');
            if (bar) bar.style.display = 'flex';
            if (nameBar) nameBar.textContent = `Hi, ${data.student.name}`;
        }
    } catch (e) { }

    // Load courses
    loadCourses();
});

async function loadCourses() {
    try {
        const res = await fetch('/api/courses');
        const courses = await res.json();
        const grid = document.getElementById('courseGrid');
        if (!grid) return;

        if (!courses.length) {
            grid.innerHTML = '<div class="loading-state"><i class="fas fa-graduation-cap" style="font-size:2rem;margin-bottom:1rem;display:block;opacity:.3;"></i><p>No courses available yet. Check back soon!</p></div>';
            return;
        }

        grid.innerHTML = courses.map(c => `
            <div class="course-card">
                ${c.enrolled ? '<span class="course-badge badge-enrolled"><i class="fas fa-check"></i> ENROLLED</span>'
                : c.price === 0 ? '<span class="course-badge badge-free">FREE</span>'
                    : `<span class="course-badge badge-price">₹${c.price}</span>`}
                <div class="course-cover">
                    ${c.coverImage ? `<img src="${c.coverImage}" alt=""/>` : '<i class="fas fa-laptop-code course-cover-icon" style="color:var(--green);"></i>'}
                </div>
                <div class="course-body">
                    ${c.code ? `<div class="course-code">${esc(c.code)}</div>` : ''}
                    <div class="course-title">${esc(c.title)}</div>
                    <div class="course-desc">${esc(c.description)}</div>
                    <div class="course-meta">
                        <span><i class="fas fa-user"></i> ${esc(c.instructor)}</span>
                        <span><i class="fas fa-clock"></i> ${esc(c.duration)}</span>
                        <span><i class="fas fa-signal"></i> ${esc(c.level)}</span>
                        <span><i class="fas fa-sitemap"></i> ${c.moduleCount} modules</span>
                    </div>
                    <div class="course-footer">
                        <span class="course-price ${c.price === 0 ? 'free' : ''}">${c.price === 0 ? 'Free' : '₹' + c.price}</span>
                        ${c.enrolled
                        ? `<a href="/learn" class="btn-enroll enrolled"><i class="fas fa-play"></i> Go to Course</a>`
                        : `<button class="btn-enroll" data-course-id="${c.id}"><i class="fas fa-shopping-cart"></i> ${c.price === 0 ? 'Enroll Free' : 'Buy Now'}</button>`
                    }
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        const grid = document.getElementById('courseGrid');
        if (grid) grid.innerHTML = '<div class="loading-state">Failed to load courses.</div>';
    }
}

async function handleBuy(courseId) {
    if (!currentStudent) {
        showToast('Please create an account first!', true);
        setTimeout(() => { window.location.href = '/learn'; }, 1500);
        return;
    }

    try {
        const res = await fetch('/api/payment/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId })
        });
        const data = await res.json();

        if (data.error) { showToast(data.error, true); return; }

        if (data.free) {
            showToast('Enrolled! Redirecting...');
            setTimeout(() => { window.location.href = '/learn'; }, 1200);
            return;
        }

        if (typeof Razorpay === 'undefined') {
            showToast('Razorpay SDK not loaded. Check connection.', true);
            return;
        }

        const options = {
            key: data.key,
            amount: data.order.amount,
            currency: data.order.currency,
            name: 'NinjaHackers',
            description: data.course.title,
            order_id: data.order.id,
            handler: async function (response) {
                const verifyRes = await fetch('/api/payment/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    })
                });
                const verifyData = await verifyRes.json();
                if (verifyData.success) {
                    showToast('Payment successful! Redirecting to course...');
                    setTimeout(() => { window.location.href = '/learn'; }, 1500);
                } else {
                    showToast('Payment verification failed!', true);
                }
            },
            prefill: { name: currentStudent.name, email: currentStudent.email },
            theme: { color: '#00ff88' },
            modal: { ondismiss: function () { showToast('Payment cancelled.', true); } }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response) {
            showToast('Payment failed: ' + response.error.description, true);
        });
        rzp.open();

    } catch (e) {
        showToast('Error processing payment.', true);
    }
}

function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function showToast(msg, err = false) { const e = document.getElementById('toast'); if (!e) return; e.textContent = msg; e.className = 'toast show' + (err ? ' error' : ''); setTimeout(() => { e.className = 'toast'; }, 3000); }
function toggleMenu() { const menu = document.getElementById('mobileMenu'); if (menu) menu.classList.toggle('open'); }
