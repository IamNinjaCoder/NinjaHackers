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
    loadVideos();

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

function escapeHTML(str) {
    return String(str || '').replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": "&#39;", '"': "&quot;" }[tag]));
}

async function loadVideos() {
    try {
        const res = await fetch('/api/videos');
        const videos = await res.json();
        const grid = document.getElementById('videoGrid');
        if (!grid) return;

        if (!videos.length) {
            grid.innerHTML = '<div style="color:var(--muted);text-align:center;grid-column:1/-1;padding:2rem;">No videos found. Coming soon.</div>';
            return;
        }

        grid.innerHTML = videos.map(v => {
            const vid = v.videoId || v.videoid;
            return `
      <div class="video-card">
        <div class="video-thumb">
          ${vid
                ? `<iframe src="https://www.youtube.com/embed/${escapeHTML(vid)}" allowfullscreen loading="lazy"></iframe>`
                : `<div class="video-placeholder">
                 <i class="fab fa-youtube"></i>
                 <span>Coming Soon</span>
               </div>`
            }
        </div>
        <div class="video-info">
          <div style="margin-bottom:.5rem;"><span class="tag tag-cyan" style="font-size:.65rem;">${escapeHTML(v.tag)}</span></div>
          <div class="video-title">${escapeHTML(v.title)}</div>
          <div class="video-meta"><i class="far fa-clock"></i> ${escapeHTML(v.meta)}</div>
        </div>
      </div>`;
        }).join('');
    } catch (err) {
        console.error('Error loading videos:', err);
    }
}

function toggleMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('open');
}
