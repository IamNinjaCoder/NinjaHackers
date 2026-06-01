document.addEventListener('DOMContentLoaded', () => {
    // Matrix Background
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

    // Image fallback handling
    document.addEventListener('error', e => {
        if (e.target.tagName === 'IMG' && e.target.classList.contains('img-fallback')) {
            e.target.style.display = 'none';
            const logotext = document.getElementById('logoText') || document.getElementById('lt');
            if (logotext && e.target.classList.contains('header-logo-img')) {
                logotext.style.display = 'flex';
            }
        }
    }, true);

    // Nav Background scroll
    window.addEventListener('scroll', () => {
        const n = document.getElementById('navbar');
        if (n) {
            n.style.boxShadow = window.scrollY > 20 ? '0 4px 30px rgba(0,0,0,0.4)' : '';
        }
    });

    // Mobile menu listener
    const hamburger = document.getElementById('hamburger');
    if (hamburger) hamburger.addEventListener('click', toggleMenu);

    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        mobileMenu.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') toggleMenu();
        });
    }

    // Delegation for dynamic grid cards
    document.addEventListener('click', e => {
        const card = e.target.closest('.blog-card');
        if (card && card.dataset.url) {
            if (card.dataset.external === 'true') {
                window.open(card.dataset.url, '_blank');
            } else {
                location.href = card.dataset.url;
            }
        }
    });

    // Typing animation
    const text = "Discover tools, writeups and structured learning paths.";
    let i = 0;
    function type() {
        const el = document.getElementById('typed-text');
        if (!el) return;
        if (i < text.length) {
            el.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, 35);
        }
    }
    setTimeout(type, 800);

    // Counter animations
    const counters = [
        { id: 'c1', target: 42, label: 'Blog Posts' },
        { id: 'c2', target: 120, label: 'CTF Solves' },
        { id: 'c3', target: 25, label: 'Tools Built' },
        { id: 'c4', target: 1500, label: 'Students' }
    ];
    counters.forEach(c => {
        let count = 0;
        const inc = Math.ceil(c.target / 60);
        const timer = setInterval(() => {
            count += inc;
            const el = document.getElementById(c.id);
            if (el) {
                if (count >= c.target) {
                    el.innerText = c.target + (c.id === 'c4' ? '+' : '');
                    clearInterval(timer);
                } else {
                    el.innerText = count;
                }
            }
        }, 30);
    });

    // Check auth for navbar
    fetch('/api/student/check')
        .then(r => r.json())
        .then(data => {
            if (data.authenticated) {
                const html = `<li><a href="/learn" class="nav-cta"><i class="fas fa-graduation-cap"></i> My Academy</a></li>`;
                const desktop = document.getElementById('auth-links');
                const mobile = document.getElementById('mobile-auth-link');
                if (desktop) desktop.innerHTML = html;
                if (mobile) {
                    mobile.href = '/learn';
                    mobile.innerHTML = '<i class="fas fa-graduation-cap"></i> My Academy';
                }
            }
        }).catch(e => { });

    // Load previews
    loadPreviews();
});

async function loadPreviews() {
    try {
        // Blogs
        const bres = await fetch('/api/blogs');
        const blogs = await bres.json();
        const bgrid = document.getElementById('featuredBlogsGrid');
        if (bgrid) bgrid.innerHTML = blogs.slice(0, 3).map(b => `
      <div class="blog-card" data-url="blog.html">
        ${b.coverImage ? `<div class="blog-card-cover-wrap"><img src="${b.coverImage}" alt=""/></div>` : '<div class="blog-card-no-cover"></div>'}
        <div class="blog-card-header">
          <div class="blog-tags">${b.tags.map(t => `<span class="tag ${t.cls}">${t.label}</span>`).join('')}</div>
          <div class="blog-title">${escapeHtml(b.title)}</div>
        </div>
        <div class="blog-card-body">
            <p class="blog-excerpt">${escapeHtml(b.excerpt)}</p>
        </div>
      </div>`).join('');

        // Works
        const wres = await fetch('/api/works');
        const works = await wres.json();
        const wgrid = document.getElementById('featuredWorksGrid');
        if (wgrid) wgrid.innerHTML = works.slice(0, 3).map(w => `
      <div class="blog-card" data-url="work.html">
        <div class="blog-card-no-cover" style="background:var(--cyan)"></div>
        <div class="blog-card-header">
           <div class="blog-tags">${w.tags.map(t => `<span class="tag tag-tools">${t}</span>`).join('')}</div>
           <div class="blog-title">${escapeHtml(w.title)}</div>
        </div>
        <div class="blog-card-body">
            <p class="blog-excerpt">${escapeHtml(w.description)}</p>
        </div>
      </div>`).join('');

        // Videos
        const vres = await fetch('/api/videos');
        const videos = await vres.json();
        const vgrid = document.getElementById('latestVideosGrid');
        if (vgrid) vgrid.innerHTML = videos.slice(0, 4).map(v => `
      <div class="blog-card" data-url="${v.link}" data-external="true">
        <div class="blog-card-header" style="height:150px;display:flex;align-items:center;justify-content:center;background:#000;">
            <i class="fab fa-youtube" style="font-size:3rem;color:#f00;opacity:.8;"></i>
        </div>
        <div class="blog-card-body">
            <div class="blog-title" style="font-size:1rem;">${escapeHtml(v.title)}</div>
            <p class="blog-excerpt" style="font-size:.8rem;">${escapeHtml(v.description)}</p>
        </div>
      </div>`).join('');

    } catch (err) { }
}

function escapeHtml(s) { 
    if (!s) return ''; 
    const d = document.createElement('div'); 
    d.textContent = s; 
    return d.innerHTML; 
}

function toggleMenu() { 
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('open'); 
}
