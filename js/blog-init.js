let blogs = [];
let activeFilter = 'all';
let currentBlogId = null;

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

    // Initial load
    fetchBlogs();

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

    // Filter listeners (Event Delegation)
    const filterContainer = document.getElementById('blogFilters');
    if (filterContainer) {
        filterContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (btn) {
                const tag = btn.getAttribute('data-tag');
                if (tag) filterBlogs(tag, btn);
            }
        });
    }

    // Grid listeners (Event Delegation for opening blogs)
    const grid = document.getElementById('blogGrid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            const card = e.target.closest('.blog-card');
            if (card) {
                const id = card.getAttribute('data-id');
                if (id) openBlog(parseInt(id));
            }
        });
    }

    // Reader closing listeners
    const closeReaderBtn = document.getElementById('closeReader');
    if (closeReaderBtn) closeReaderBtn.addEventListener('click', closeBlog);

    const overlay = document.getElementById('blogOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeBlog();
        });
    }

    // Comment form listener
    const commentForm = document.getElementById('commentForm');
    if (commentForm) commentForm.addEventListener('submit', submitComment);

    // Escape key for overlay
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBlog(); });
});

async function fetchBlogs() {
    try {
        const res = await fetch('/api/blogs');
        blogs = await res.json();
        renderBlogs();
    } catch (err) {
        const grid = document.getElementById('blogGrid');
        if (grid) {
            grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--muted);font-family:'Share Tech Mono',monospace;">
                <i class="fas fa-server" style="font-size:2rem;margin-bottom:1rem;display:block;opacity:.4;"></i>
                Could not connect to the server.
            </div>`;
        }
    }
}

function filterBlogs(tag, btn) {
    activeFilter = tag;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderBlogs();
}

function renderBlogs() {
    const grid = document.getElementById('blogGrid');
    if (!grid) return;

    const filtered = activeFilter === 'all' ? blogs : blogs.filter(b => b.tags.some(t => t.label === activeFilter));
    grid.innerHTML = filtered.length ? filtered.map(b => `
    <div class="blog-card" data-id="${b.id}">
      ${b.coverImage
        ? `<div class="blog-card-cover-wrap"><img src="${b.coverImage}" alt="" loading="lazy"/></div>`
        : '<div class="blog-card-no-cover"></div>'}
      <div class="blog-card-header">
        <div class="blog-tags">${b.tags.map(t => `<span class="tag ${t.cls}">${t.label}</span>`).join('')}</div>
        <div class="blog-title">${escapeHtml(b.title)}</div>
      </div>
      <div class="blog-card-body">
        <p class="blog-excerpt">${escapeHtml(b.excerpt)}</p>
        <div class="blog-meta">
          <span><i class="fas fa-user" style="margin-right:.3rem;"></i>${escapeHtml(b.author || 'NinjaHacker')} · <i class="far fa-calendar"></i> ${b.date} · ${b.readTime}</span>
          <button class="read-more-btn">Read <i class="fas fa-arrow-right"></i></button>
        </div>
      </div>
    </div>`).join('') : `<div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--muted);font-family:'Share Tech Mono',monospace;">No posts in this category yet.</div>`;
}

function openBlog(id) {
    const post = blogs.find(b => b.id === id);
    if (!post) return;
    currentBlogId = id;

    const coverWrap = document.getElementById('readerCoverWrap');
    const coverImg = document.getElementById('readerCoverImg');
    if (post.coverImage) { coverImg.src = post.coverImage; coverWrap.style.display = 'flex'; }
    else { coverWrap.style.display = 'none'; }

    document.getElementById('readerTags').innerHTML = post.tags.map(t => `<span class="tag ${t.cls}">${t.label}</span>`).join('');
    document.getElementById('readerTitle').textContent = post.title;
    document.getElementById('readerMeta').style.display = 'none';

    const authorName = post.author || 'NinjaHacker';
    document.getElementById('readerAvatar').textContent = authorName.charAt(0).toUpperCase();
    document.getElementById('readerAuthorName').textContent = authorName;
    document.getElementById('readerDate').innerHTML = `<i class="far fa-calendar"></i> ${post.date}`;
    document.getElementById('readerReadTime').innerHTML = `<i class="far fa-clock"></i> ${post.readTime}`;
    document.getElementById('readerBody').innerHTML = post.content;
    document.getElementById('readerBottomTags').innerHTML = post.tags.map(t => `<span class="tag ${t.cls}">${t.label}</span>`).join('');

    // Trigger Prism.js highlighting
    if (window.Prism) {
        document.querySelectorAll('#readerBody pre code').forEach(block => {
            if (!block.className && block.parentElement.tagName === 'PRE') {
                block.classList.add('language-plaintext');
            }
            Prism.highlightElement(block);
        });
    }

    const ov = document.getElementById('blogOverlay');
    ov.classList.add('open');
    ov.scrollTop = 0;
    document.body.style.overflow = 'hidden';

    loadComments(id);
}

function closeBlog() {
    const ov = document.getElementById('blogOverlay');
    if (ov) ov.classList.remove('open');
    document.body.style.overflow = '';
    currentBlogId = null;
}

async function loadComments(blogId) {
    try {
        const res = await fetch(`/api/blogs/${blogId}/comments`);
        const comments = await res.json();
        const countEl = document.getElementById('commentCount');
        if (countEl) countEl.textContent = comments.length > 0 ? `(${comments.length})` : '';

        const listEl = document.getElementById('commentList');
        if (!listEl) return;
        if (comments.length === 0) {
            listEl.innerHTML = '<div class="no-comments"><i class="fas fa-comment-slash" style="margin-right:.4rem;"></i>No comments yet. Be the first!</div>';
            return;
        }

        listEl.innerHTML = comments.map(c => `
      <div class="comment-item">
        <div class="comment-header">
          <span class="comment-name"><i class="fas fa-user" style="font-size:.7rem;margin-right:.3rem;"></i>${escapeHtml(c.name)}</span>
          <span class="comment-date">${formatDate(c.createdAt)}</span>
        </div>
        <div class="comment-body">${escapeHtml(c.comment)}</div>
      </div>
    `).join('');
    } catch (err) {
        const listEl = document.getElementById('commentList');
        if (listEl) listEl.innerHTML = '<div class="no-comments">Could not load comments.</div>';
    }
}

async function submitComment(e) {
    e.preventDefault();
    if (!currentBlogId) return;

    const name = document.getElementById('commentName').value.trim();
    const comment = document.getElementById('commentText').value.trim();
    if (!name || !comment) return;

    try {
        const res = await fetch(`/api/blogs/${currentBlogId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, comment })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('commentText').value = '';
            loadComments(currentBlogId);
        }
    } catch (err) {
        console.error('Comment error:', err);
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function toggleMenu() { 
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('open'); 
}
