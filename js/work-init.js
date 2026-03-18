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

    // Initial load
    loadWorks();

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

function toggleMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('open');
}

function escapeHTML(str) {
    return String(str || '').replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": "&#39;", '"': "&quot;" }[tag]));
}

async function loadWorks() {
    try {
        const res = await fetch('/api/works');
        const works = await res.json();
        const grid = document.querySelector('.work-grid');
        if (!grid) return;
        if (!works.length) {
            grid.innerHTML = '<div style="color:var(--muted);text-align:center;grid-column:1/-1;padding:2rem;">No works found. Projects will appear here soon.</div>';
            return;
        }

        grid.innerHTML = works.map(w => {
            let statusIcon = '<i class="fas fa-check-circle"></i>';
            let statusClass = 'status-done';
            if (w.status === 'In Progress') { statusIcon = '<i class="fas fa-code"></i>'; statusClass = 'status-wip'; }
            else if (w.status === 'Idea') { statusIcon = '<i class="fas fa-lightbulb"></i>'; statusClass = 'status-idea'; }

            const tagsHtml = (w.tags || []).map(t => `<span class="tag tag-cyan">${escapeHTML(t)}</span>`).join('');

            return `
                <div class="work-card">
                    <div class="work-icon ${escapeHTML(w.iconColor)}"><i class="${escapeHTML(w.icon)}"></i></div>
                    <div class="work-title">
                        ${w.link ? `<a href="${escapeHTML(w.link)}" target="_blank" style="color:inherit;text-decoration:none;">${escapeHTML(w.title)} <i class="fas fa-external-link-alt" style="font-size:0.75rem;opacity:0.6;"></i></a>` : escapeHTML(w.title)}
                    </div>
                    <div class="work-desc">${escapeHTML(w.description)}</div>
                    <div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;">
                        <span class="work-status ${statusClass}">${statusIcon} ${escapeHTML(w.status)}</span>
                        ${tagsHtml}
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading works:', err);
    }
}
