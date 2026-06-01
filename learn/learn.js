// ═══════════════════════════════════════
//  NINJAHACKERS STUDENT PORTAL — JS
// ═══════════════════════════════════════

let currentStudent = null;
let enrolledCourses = [];
let currentCourse = null;
let isSignupMode = false;
let pendingVerifyEmail = '';

// ─── INIT ───
document.addEventListener('DOMContentLoaded', async () => {
  // Navigation & UI Listeners
  const curriculumToggle = document.getElementById('curriculumToggleBtn');
  if (curriculumToggle) curriculumToggle.addEventListener('click', toggleModuleSidebar);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  const forgotLink = document.getElementById('forgotLink');
  if (forgotLink) forgotLink.addEventListener('click', showForgotForm);

  const backToLoginOtp = document.getElementById('backToLoginOtp');
  if (backToLoginOtp) backToLoginOtp.addEventListener('click', showLoginForm);

  const backToLoginForgot = document.getElementById('backToLoginForgot');
  if (backToLoginForgot) backToLoginForgot.addEventListener('click', showLoginForm);

  const backToLoginReset = document.getElementById('backToLoginReset');
  if (backToLoginReset) backToLoginReset.addEventListener('click', showLoginForm);

  const resendOtpBtn = document.getElementById('resendOtpBtn');
  if (resendOtpBtn) resendOtpBtn.addEventListener('click', resendOTP);

  const toggleAuthBtn = document.getElementById('toggleAuthBtn');
  if (toggleAuthBtn) toggleAuthBtn.addEventListener('click', toggleAuthMode);

  const openProfileBtn = document.getElementById('openProfileBtn');
  if (openProfileBtn) openProfileBtn.addEventListener('click', openProfile);

  const backToDashboardBtn = document.getElementById('backToDashboardBtn');
  if (backToDashboardBtn) backToDashboardBtn.addEventListener('click', showDashboardHome);

  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', toggleSidebar);

  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeAllSidebars);

  // Form Listeners
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const signupForm = document.getElementById('signupForm');
  if (signupForm) signupForm.addEventListener('submit', handleSignup);

  const otpForm = document.getElementById('otpForm');
  if (otpForm) otpForm.addEventListener('submit', handleVerifyOTP);

  const forgotForm = document.getElementById('forgotForm');
  if (forgotForm) forgotForm.addEventListener('submit', handleForgotPassword);

  const resetForm = document.getElementById('resetForm');
  if (resetForm) resetForm.addEventListener('submit', handleResetPassword);

  // Event Delegation for Courses & Sidebar
  const sidebarCourses = document.getElementById('sidebarCourses');
  if (sidebarCourses) {
    sidebarCourses.addEventListener('click', (e) => {
      const el = e.target.closest('.sidebar-course');
      if (el) {
        const id = el.getAttribute('data-id');
        if (id) openCourse(parseInt(id));
      }
    });
  }

  const courseGrid = document.getElementById('courseGrid');
  if (courseGrid) {
    courseGrid.addEventListener('click', (e) => {
      const el = e.target.closest('.course-card');
      if (el) {
        const id = el.getAttribute('data-id');
        if (id) openCourse(parseInt(id));
      }
    });
  }

  const moduleSidebar = document.getElementById('moduleSidebar');
  if (moduleSidebar) {
    moduleSidebar.addEventListener('click', (e) => {
      const title = e.target.closest('.module-title');
      if (title) {
        const mi = title.getAttribute('data-index');
        if (mi !== null) toggleModule(mi);
        return;
      }
      const item = e.target.closest('.module-item');
      if (item) {
        const id = item.getAttribute('data-item-id');
        if (id) openItem(parseInt(id));
      }
    });
  }

  // Delegation for Dynamic Content (Submissions, Quizzes)
  const contentArea = document.getElementById('contentArea');
  if (contentArea) {
    contentArea.addEventListener('click', (e) => {
      // Assignment Submit
      const subBtn = e.target.closest('.btn-submit-assignment');
      if (subBtn) {
        const id = subBtn.getAttribute('data-id');
        if (id) submitAssignment(parseInt(id));
        return;
      }
      // Assignment Delete
      const delBtn = e.target.closest('.btn-delete-assignment');
      if (delBtn) {
        const subId = delBtn.getAttribute('data-sub-id');
        const itemId = delBtn.getAttribute('data-item-id');
        if (subId && itemId) deleteAssignment(parseInt(subId), parseInt(itemId));
        return;
      }
      // Quiz Reattempt
      const reBtn = e.target.closest('.btn-quiz-reattempt');
      if (reBtn) {
        const id = reBtn.getAttribute('data-id');
        if (id && currentQuizQuestions) renderQuizForm(parseInt(id), currentQuizQuestions);
        return;
      }
      // Quiz View Results
      const viewBtn = e.target.closest('.btn-quiz-burn');
      if (viewBtn) {
        const id = viewBtn.getAttribute('data-id');
        if (id) burnAttemptsAndViewResults(parseInt(id));
        return;
      }
      // Quiz Submit
      const qSubBtn = e.target.closest('.btn-quiz-submit');
      if (qSubBtn) {
        const id = qSubBtn.getAttribute('data-id');
        if (id && currentQuizQuestionIds) submitQuiz(parseInt(id), currentQuizQuestionIds);
        return;
      }
    });
  }

  // Initial Auth Check
  try {
    const res = await fetch('/api/student/check');
    const data = await res.json();
    if (data.authenticated) {
      currentStudent = data.student;
      showDashboard();
    }
  } catch (e) { }
});

// Global state for delegation
let currentQuizQuestions = null;
let currentQuizQuestionIds = null;

function safeHref(url) {
  if (!url) return '#';
  try {
    const u = new URL(url);
    return ['https:', 'http:'].includes(u.protocol) ? url : '#';
  } catch { return '#'; }
}

function safeSrc(u) {
  try {
    const url = new URL(u, location.origin);
    return (['http:', 'https:'].includes(url.protocol) || url.pathname.startsWith('/uploads/'))
      ? url.href
      : '';
  } catch { return ''; }
}

// ─── AUTH FORM SWITCHING ───
function toggleAuthMode() {
  isSignupMode = !isSignupMode;
  document.getElementById('loginForm').style.display = isSignupMode ? 'none' : 'block';
  document.getElementById('signupForm').style.display = isSignupMode ? 'block' : 'none';
  document.getElementById('otpForm').style.display = 'none';
  document.getElementById('forgotForm').style.display = 'none';
  document.getElementById('resetForm').style.display = 'none';
  document.getElementById('authToggle').style.display = 'block';
  document.getElementById('toggleText').textContent = isSignupMode ? 'Already have an account?' : "Don't have an account?";
  const btn = document.getElementById('toggleAuthBtn');
  if (btn) btn.textContent = isSignupMode ? 'Login' : 'Sign Up';
  clearErrors();
}

function showLoginForm() {
  isSignupMode = false;
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('signupForm').style.display = 'none';
  document.getElementById('otpForm').style.display = 'none';
  document.getElementById('forgotForm').style.display = 'none';
  document.getElementById('resetForm').style.display = 'none';
  document.getElementById('authToggle').style.display = 'block';
  document.getElementById('toggleText').textContent = "Don't have an account?";
  const btn = document.getElementById('toggleAuthBtn');
  if (btn) btn.textContent = 'Sign Up';
  clearErrors();
}

function showForgotForm() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('signupForm').style.display = 'none';
  document.getElementById('otpForm').style.display = 'none';
  document.getElementById('forgotForm').style.display = 'block';
  document.getElementById('resetForm').style.display = 'none';
  document.getElementById('authToggle').style.display = 'none';
  clearErrors();
}

function showResetForm(email) {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('signupForm').style.display = 'none';
  document.getElementById('otpForm').style.display = 'none';
  document.getElementById('forgotForm').style.display = 'none';
  document.getElementById('resetForm').style.display = 'block';
  document.getElementById('authToggle').style.display = 'none';
  const display = document.getElementById('resetEmailDisplay');
  if (display) display.textContent = email;
  pendingVerifyEmail = email;
  clearErrors();
}

function showOTPForm(email) {
  pendingVerifyEmail = email;
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('signupForm').style.display = 'none';
  document.getElementById('otpForm').style.display = 'block';
  document.getElementById('forgotForm').style.display = 'none';
  document.getElementById('resetForm').style.display = 'none';
  document.getElementById('authToggle').style.display = 'none';
  const display = document.getElementById('otpEmailDisplay');
  if (display) display.textContent = email;
  document.getElementById('otpInput').value = '';
  document.getElementById('otpError').textContent = '';
  document.getElementById('otpInput').focus();
}

function clearErrors() {
  ['loginError', 'signupError', 'otpError', 'forgotError', 'resetError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

// ─── SIGNUP ───
async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const errorEl = document.getElementById('signupError');
  errorEl.textContent = '';

  try {
    const res = await fetch('/api/student/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      if (data.requiresVerification) {
        showOTPForm(data.email);
        showToast('Check your email for the verification code! 📧');
      } else {
        currentStudent = data.student;
        showDashboard();
        showToast('Account created! Welcome aboard 🥷');
      }
    } else {
      errorEl.textContent = data.error || 'Signup failed.';
    }
  } catch (err) { errorEl.textContent = 'Connection error.'; }
}

// ─── OTP ───
async function handleVerifyOTP(e) {
  e.preventDefault();
  const otp = document.getElementById('otpInput').value.trim();
  const errorEl = document.getElementById('otpError');
  errorEl.textContent = '';

  if (!otp || otp.length !== 6) { errorEl.textContent = 'Enter the 6-digit code.'; return; }

  try {
    const res = await fetch('/api/student/verify-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingVerifyEmail, otp })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      currentStudent = data.student;
      showDashboard();
      showToast('Email verified! Welcome 🥷');
    } else {
      errorEl.textContent = data.error || 'Verification failed.';
    }
  } catch (err) { errorEl.textContent = 'Connection error.'; }
}

async function resendOTP() {
  try {
    const res = await fetch('/api/student/resend-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingVerifyEmail })
    });
    const data = await res.json();
    if (data.success) showToast('New code sent! Check your email.');
    else showToast(data.error || 'Failed to resend.', true);
  } catch (err) { showToast('Connection error.', true); }
}

// ─── FORGOT PASSWORD ───
async function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('forgotEmail').value.trim();
  const errorEl = document.getElementById('forgotError');
  errorEl.textContent = '';

  if (!email) { errorEl.textContent = 'Enter your email.'; return; }

  try {
    const res = await fetch('/api/student/forgot-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showResetForm(email);
      showToast(data.message || 'Reset code sent! Check your email 📧');
    } else {
      errorEl.textContent = data.error || 'Failed.';
    }
  } catch (err) { errorEl.textContent = 'Connection error: ' + err.message; }
}

async function handleResetPassword(e) {
  e.preventDefault();
  const otp = document.getElementById('resetOtp').value.trim();
  const newPassword = document.getElementById('resetNewPassword').value;
  const errorEl = document.getElementById('resetError');
  errorEl.textContent = '';

  if (!otp || otp.length !== 6) { errorEl.textContent = 'Enter the 6-digit code.'; return; }
  if (newPassword.length < 8) { errorEl.textContent = 'Password must be at least 8 characters.'; return; }

  try {
    const res = await fetch('/api/student/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingVerifyEmail, otp, newPassword })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showLoginForm();
      showToast('Password reset! You can now log in ✅');
    } else {
      errorEl.textContent = data.error || 'Reset failed.';
    }
  } catch (err) { errorEl.textContent = 'Connection error.'; }
}

// ─── LOGIN ───
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  try {
    const res = await fetch('/api/student/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      currentStudent = data.student;
      showDashboard();
    } else if (data.requiresVerification) {
      showOTPForm(data.email);
      showToast('Please verify your email first.', true);
      resendOTP();
    } else {
      errorEl.textContent = data.error || 'Login failed.';
    }
  } catch (err) { errorEl.textContent = 'Connection error.'; }
}

async function handleLogout() {
  await fetch('/api/student/logout', { method: 'POST' });
  currentStudent = null;
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('sidebarToggleBtn').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  showLoginForm();
}

// ─── DASHBOARD ───
async function showDashboard() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'flex';
  document.getElementById('sidebarToggleBtn').style.display = '';
  document.getElementById('navStudentName').textContent = currentStudent.name;
  document.getElementById('welcomeName').textContent = `Welcome back, ${currentStudent.name.split(' ')[0]}!`;
  await loadEnrolledCourses();
  showDashboardHome();
  loadAnnouncements();
}

async function loadEnrolledCourses() {
  try {
    const res = await fetch('/api/student/courses');
    if (res.status === 401) { handleLogout(); return; }
    enrolledCourses = await res.json();
    renderSidebar();
    renderCourseGrid();
  } catch (err) { showToast('Failed to load courses.', true); }
}

function renderSidebar() {
  const el = document.getElementById('sidebarCourses');
  if (!enrolledCourses.length) {
    el.innerHTML = '<div class="sidebar-empty"><i class="fas fa-book" style="font-size:1.5rem;opacity:.3;margin-bottom:.5rem;display:block;"></i>No courses yet</div>';
    return;
  }
  el.innerHTML = enrolledCourses.map(c => `
    <div class="sidebar-course ${currentCourse && currentCourse.id === c.id ? 'active' : ''}" data-id="${c.id}">
      <div class="sidebar-course-title">${esc(c.title)}</div>
      <div class="sidebar-course-meta">${c.code || ''} · ${c.duration || ''}</div>
    </div>
  `).join('');
}

function renderCourseGrid() {
  const el = document.getElementById('courseGrid');
  if (!enrolledCourses.length) {
    el.innerHTML = `<div class="no-courses"><i class="fas fa-graduation-cap"></i><p>You haven't enrolled in any courses yet.</p><a href="/courses.html"><i class="fas fa-search"></i> Browse Courses</a></div>`;
    return;
  }
  el.innerHTML = enrolledCourses.map(c => `
    <div class="course-card" data-id="${c.id}">
      <div class="course-card-cover">
        ${c.coverImage ? `<img src="${safeSrc(c.coverImage)}" alt=""/>` : '<i class="fas fa-laptop-code course-card-cover-icon"></i>'}
        <span class="course-card-badge badge-enrolled">ENROLLED</span>
      </div>
      <div class="course-card-body">
        <div class="course-card-code">${esc(c.code)}</div>
        <div class="course-card-title">${esc(c.title)}</div>
        <div class="course-card-meta">
          <span><i class="fas fa-user"></i> ${esc(c.instructor)}</span>
          <span><i class="fas fa-clock"></i> ${esc(c.duration)}</span>
          <span><i class="fas fa-signal"></i> ${esc(c.level)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ─── COURSE VIEWER ───
async function openCourse(courseId) {
  try {
    const res = await fetch(`/api/student/courses/${courseId}`);
    if (res.status === 401) { handleLogout(); return; }
    if (res.status === 403) { showToast('Not enrolled.', true); return; }
    currentCourse = await res.json();
    renderCourseViewer();
  } catch (err) { showToast('Failed to load course.', true); }
}

function renderCourseViewer() {
  document.getElementById('dashboardHome').style.display = 'none';
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('mainContent').style.marginLeft = '0';
  document.getElementById('courseViewer').style.display = 'flex';
  document.getElementById('viewerCourseTitle').textContent = currentCourse.title;
  document.getElementById('viewerCourseMeta').innerHTML =
    `<i class="fas fa-user"></i> ${esc(currentCourse.instructor)} · <i class="fas fa-clock"></i> ${esc(currentCourse.duration)} · <i class="fas fa-signal"></i> ${esc(currentCourse.level)}`;
  renderModuleSidebar();
  renderSidebar();
  document.getElementById('contentArea').innerHTML = '<div class="content-placeholder"><i class="fas fa-play-circle"></i><p>Select a class or resource from the sidebar to begin</p></div>';
  document.getElementById('curriculumToggleBtn').style.display = '';
  closeAllSidebars();
  loadProgressBar(currentCourse.id);
}

function renderModuleSidebar() {
  const el = document.getElementById('moduleSidebar');
  if (!currentCourse.modules?.length) { el.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted);font-size:.82rem;">No modules yet</div>'; return; }
  el.innerHTML = currentCourse.modules.map((m, mi) => `
    <div class="module-group">
      <div class="module-title" data-index="${mi}">
        <i class="fas fa-folder" style="font-size:.75rem;"></i> ${esc(m.title)}
        <i class="fas fa-chevron-right chevron ${mi === 0 ? 'open' : ''}" id="chevron-${mi}"></i>
      </div>
      <div class="module-items ${mi === 0 ? 'open' : ''}" id="module-items-${mi}">
        ${m.items.map(item => `
          <div class="module-item item-type-${item.type} sidebar-item" id="item-${item.id}" data-item-id="${item.id}">
            <span class="module-item-icon">${getItemIcon(item.type)}</span>
            <span>${esc(item.title)}</span>
            ${(item.type === 'live_class' && item.scheduledAt && !item.isLive) ? `<span style="font-size:.55rem;color:var(--orange);margin-left:auto;font-family:'Share Tech Mono',monospace;"><i class="fas fa-clock"></i> ${new Date(item.scheduledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>` : ''}
            ${(item.type === 'live_class' && item.isLive) ? '<span style="font-size:.55rem;color:#00ff88;margin-left:auto;"><i class="fas fa-circle" style="font-size:.4rem;"></i> LIVE</span>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function toggleModule(i) {
  const items = document.getElementById(`module-items-${i}`);
  const chevron = document.getElementById(`chevron-${i}`);
  if (items) items.classList.toggle('open');
  if (chevron) chevron.classList.toggle('open');
}

function openItem(itemId) {
  let item = null;
  for (const m of currentCourse.modules) { for (const i of m.items) { if (i.id === itemId) { item = i; break; } } if (item) break; }
  if (!item) return;

  document.querySelectorAll('.module-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`item-${itemId}`);
  if (activeEl) activeEl.classList.add('active');
  closeAllSidebars();

  const area = document.getElementById('contentArea');
  let html = '';

  switch (item.type) {
    case 'live_class':
      if (item.scheduledAt && item.isLive === false) {
        html = `<div class="content-header">
          <div class="content-title">${esc(item.title)}</div>
          <div class="content-type-badge type-live_class"><i class="fas fa-broadcast-tower"></i> LIVE CLASS</div>
        </div>
        ${item.description ? `<div class="content-description">${esc(item.description)}</div>` : ''}
        <div class="scheduled-card">
          <div class="schedule-icon"><i class="fas fa-calendar-alt"></i></div>
          <div style="color:var(--orange);font-size:.9rem;font-weight:600;"><i class="fas fa-clock"></i> Class Scheduled</div>
          <div class="schedule-date">${new Date(item.scheduledAt).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          <div class="countdown" id="countdown-${item.id}"></div>
          <div class="lock-msg"><i class="fas fa-lock"></i> Join link will appear when class begins</div>
        </div>`;
        setTimeout(() => startCountdown(item.id, item.scheduledAt), 100);
      } else {
        html = `<div class="content-header">
          <div class="content-title">${esc(item.title)}</div>
          <div class="content-type-badge type-live_class"><i class="fas fa-broadcast-tower"></i> LIVE CLASS</div>
        </div>
        ${item.description ? `<div class="content-description">${esc(item.description)}</div>` : ''}
        <div class="live-status-card">
          <div class="live-badge"><div class="pulse-dot"></div> Class is Live Now</div>
          <p style="color:var(--text-secondary);font-size:.85rem;">Join the session using the button below. It will open in a new tab.</p>
          <a href="${safeHref(item.link)}" target="_blank" rel="noopener" class="content-action action-live"><i class="fas fa-video"></i> Join Live Session</a>
        </div>`;
      }
      break;
    case 'recorded_class':
      const driveEmbed = getDriveEmbedUrl(item.link);
      html = `<div class="content-header">
        <div class="content-title">${esc(item.title)}</div>
        <div class="content-type-badge type-recorded_class"><i class="fas fa-play-circle"></i> RECORDED CLASS</div>
      </div>
      ${item.description ? `<div class="content-description">${esc(item.description)}</div>` : ''}
      ${driveEmbed ? `<div class="video-container no-context">
        <iframe src="${driveEmbed}" allowfullscreen allow="autoplay"></iframe>
      </div>` : ''}
      <a href="${safeHref(item.link)}" target="_blank" rel="noopener" class="content-action action-video"><i class="fas fa-external-link-alt"></i> Watch on Google Drive</a>`;
      fetch(`/api/student/progress/${item.id}`, { method: 'POST' });
      break;
    case 'notes':
      html = `<div class="content-header">
        <div class="content-title">${esc(item.title)}</div>
        <div class="content-type-badge type-notes"><i class="fas fa-file-alt"></i> NOTES</div>
      </div>
      ${item.description ? `<div class="notes-content-box">${item.description}</div>` : ''}
      ${item.link ? `<div style="margin-top:1rem;"><a href="${safeHref(item.link)}" target="_blank" rel="noopener" class="content-action action-notes"><i class="fas fa-download"></i> View / Download Notes</a></div>` : ''}`;
      fetch(`/api/student/progress/${item.id}`, { method: 'POST' });
      break;
    case 'assignment':
      html = `<div class="content-header">
        <div class="content-title">${esc(item.title)}</div>
        <div class="content-type-badge type-assignment"><i class="fas fa-tasks"></i> ASSIGNMENT</div>
      </div>
      ${item.description ? `<div class="content-description">${esc(item.description)}</div>` : ''}
      ${item.link ? `<a href="${safeHref(item.link)}" target="_blank" rel="noopener" class="content-action action-assignment" style="margin-bottom:1rem;"><i class="fas fa-external-link-alt"></i> View Assignment Brief</a>` : ''}
      <div class="assignment-box">
        <h4><i class="fas fa-upload"></i> Submit Your Work</h4>
        <div id="assignmentStatus-${item.id}" style="margin-bottom:.5rem;font-size:.75rem;color:var(--muted);"></div>
        <form id="assignForm-${item.id}">
          <input type="file" id="assignFile-${item.id}" accept=".pdf,.zip,.rar,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"/>
          <button type="button" class="btn-submit-assignment" data-id="${item.id}"><i class="fas fa-paper-plane"></i> Submit</button>
        </form>
      </div>`;
      setTimeout(() => loadAssignmentStatus(item.id), 100);
      break;
    case 'quiz':
      html = `<div class="content-header">
        <div class="content-title">${esc(item.title)}</div>
        <div class="content-type-badge" style="background:rgba(168,85,247,.12);color:#a855f7;border:1px solid rgba(168,85,247,.25);"><i class="fas fa-question-circle"></i> QUIZ</div>
      </div>
      ${item.description ? `<div class="content-description">${esc(item.description)}</div>` : ''}
      <div class="live-status-card" style="border-color:rgba(168,85,247,.2);">
        <i class="fas fa-brain" style="font-size:2.5rem;color:var(--purple);opacity:.6;"></i>
        <p style="color:var(--text-secondary);font-size:.88rem;">Test your knowledge with this quiz. Your answers are graded automatically.</p>
        <a href="/learn/quiz.html?itemId=${item.id}" class="content-action action-live" style="background:linear-gradient(135deg,var(--purple),#7c3aed);text-decoration:none;"><i class="fas fa-rocket"></i> Launch Quiz</a>
      </div>`;
      break;
    default:
      html = `<div class="content-header"><div class="content-title">${esc(item.title)}</div></div>
        ${item.link ? `<a href="${safeHref(item.link)}" target="_blank" class="content-action action-notes"><i class="fas fa-external-link-alt"></i> Open</a>` : ''}`;
  }
  area.innerHTML = html;
}

// ─── ASSIGNMENT SUBMISSION ───
async function submitAssignment(itemId) {
  const fileInput = document.getElementById(`assignFile-${itemId}`);
  if (!fileInput?.files[0]) { showToast('Select a file first.', true); return; }
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  try {
    const res = await fetch(`/api/student/assignment/${itemId}/submit`, { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) { showToast('Assignment submitted!'); loadAssignmentStatus(itemId); fetch(`/api/student/progress/${itemId}`, { method: 'POST' }); }
    else showToast(data.error || 'Upload failed.', true);
  } catch (e) { showToast('Upload failed.', true); }
}

async function deleteAssignment(subId, itemId) {
  if (!confirm('Are you sure you want to delete your submission?')) return;
  try {
    const res = await fetch(`/api/student/assignment/${subId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { showToast('Submission deleted'); loadAssignmentStatus(itemId); }
    else showToast(data.error || 'Failed to delete', true);
  } catch (e) { showToast('Error deleting', true); }
}

async function loadAssignmentStatus(itemId) {
  try {
    const data = await (await fetch(`/api/student/assignment/${itemId}/status`)).json();
    const el = document.getElementById(`assignmentStatus-${itemId}`);
    if (!el) return;
    if (data.submission) {
      const isGraded = !!data.submission.grade;
      el.innerHTML = `<div style="background:var(--dark);border:1px solid var(--green);border-radius:6px;padding:.6rem;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="color:var(--green);font-size:.75rem;font-weight:600;"><i class="fas fa-check-circle"></i> ${esc(data.submission.fileName)}</div>
          <div style="font-size:.6rem;color:var(--muted);margin-top:.2rem;">Submitted: ${new Date(data.submission.submittedAt).toLocaleString('en-IN')}</div>
          ${isGraded ? `<div style="margin-top:.4rem;padding:.3rem .5rem;background:rgba(0,212,255,.1);border-radius:4px;"><span style="color:var(--cyan);font-weight:700;">Grade: ${esc(data.submission.grade)}</span>${data.submission.feedback ? ` — <span style="color:var(--muted);font-size:.7rem;">${esc(data.submission.feedback)}</span>` : ''}</div>` : '<div style="color:var(--orange);font-size:.65rem;margin-top:.3rem;"><i class="fas fa-clock"></i> Pending review</div>'}
        </div>
        ${!isGraded ? `<button type="button" class="btn-delete-assignment" data-sub-id="${data.submission.id}" data-item-id="${itemId}" style="background:none;border:none;color:var(--red);cursor:pointer;padding:.5rem;" title="Delete submission"><i class="fas fa-trash-alt"></i></button>` : ''}
      </div>`;
      const form = document.getElementById(`assignForm-${itemId}`);
      if (form) form.style.display = 'none';
    } else {
      el.innerHTML = '';
      const form = document.getElementById(`assignForm-${itemId}`);
      if (form) form.style.display = 'flex';
      const fileInput = document.getElementById(`assignFile-${itemId}`);
      if (fileInput) fileInput.value = '';
    }
  } catch (e) { }
}

async function burnAttemptsAndViewResults(itemId) {
  if (!confirm('This will end your remaining attempts instantly so you can view the correct answers. Proceed?')) return;
  try {
    await fetch(`/api/student/quiz/${itemId}/burn`, { method: 'POST' });
    // This logic would come from quiz.js if it was a separate page, but here it's integrated? No, it's a separate page.
    // Wait, learn.js has quiz logic too? The HTML says <a href="/learn/quiz.html">. 
    // Let's check quiz.js.
  } catch (e) { }
}

function showDashboardHome() {
  const viewer = document.getElementById('courseViewer');
  if (viewer) viewer.style.display = 'none';
  const dash = document.getElementById('dashboardHome');
  if (dash) dash.style.display = 'block';
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.style.display = 'flex';
  const main = document.getElementById('mainContent');
  if (main) main.style.marginLeft = '260px';
  const cur = document.getElementById('curriculumToggleBtn');
  if (cur) cur.style.display = 'none';
  currentCourse = null;
  renderSidebar();
}

// ─── SIDEBAR TOGGLES ───
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const isOpen = sidebar.classList.toggle('open');
  overlay.classList.toggle('open', isOpen);
}

function toggleModuleSidebar() {
  const sidebar = document.getElementById('moduleSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const isOpen = sidebar.classList.toggle('open');
  overlay.classList.toggle('open', isOpen);
}

function closeAllSidebars() {
  const s = document.getElementById('sidebar');
  if (s) s.classList.remove('open');
  const m = document.getElementById('moduleSidebar');
  if (m) m.classList.remove('open');
  const o = document.getElementById('sidebarOverlay');
  if (o) o.classList.remove('open');
}

// ─── COUNTDOWN TIMER ───
let countdownInterval = null;
function startCountdown(itemId, scheduledAt) {
  if (countdownInterval) clearInterval(countdownInterval);
  const el = document.getElementById(`countdown-${itemId}`);
  if (!el) return;
  const target = new Date(scheduledAt).getTime();
  function update() {
    const diff = target - Date.now();
    if (diff <= 0) {
      clearInterval(countdownInterval);
      el.textContent = '🟢 CLASS IS STARTING...';
      setTimeout(() => { if (currentCourse) openCourse(currentCourse.id); }, 2000);
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    let parts = [];
    if (d > 0) parts.push(`${d}d`);
    parts.push(`${String(h).padStart(2, '0')}h`);
    parts.push(`${String(m).padStart(2, '0')}m`);
    parts.push(`${String(s).padStart(2, '0')}s`);
    el.textContent = parts.join(' : ');
  }
  update();
  countdownInterval = setInterval(update, 1000);
}

// ─── HELPERS ───
function getItemIcon(type) {
  switch (type) {
    case 'live_class': return '<i class="fas fa-broadcast-tower"></i>';
    case 'recorded_class': return '<i class="fas fa-play-circle"></i>';
    case 'notes': return '<i class="fas fa-file-alt"></i>';
    case 'assignment': return '<i class="fas fa-tasks"></i>';
    case 'quiz': return '<i class="fas fa-question-circle"></i>';
    default: return '<i class="fas fa-circle"></i>';
  }
}

function getDriveEmbedUrl(url) {
  if (!url) return null;
  const match = url.match(/\/d\/([\w-]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  return null;
}

function esc(str) { if (!str) return ''; const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

function showToast(msg, isError = false) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => { el.className = 'toast'; }, 3000);
}

// ═══════════════════════════════════════
//  STUDENT PROFILE
// ═══════════════════════════════════════
async function openProfile() {
  try {
    const res = await fetch('/api/student/profile');
    const data = await res.json();
    const modal = document.createElement('div');
    modal.id = 'profileModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeIn .2s ease;';
    const inputStyle = 'width:100%;padding:.55rem .8rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;color:#fff;font-size:.82rem;font-family:inherit;outline:none;box-sizing:border-box;';
    modal.innerHTML = `<div style="background:rgba(10,14,26,.95);border:1px solid rgba(0,255,136,.15);border-radius:16px;padding:2rem;max-width:480px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.6);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
        <h3 style="color:var(--green);margin:0;font-family:'Exo 2',sans-serif;font-size:1.15rem;"><i class="fas fa-user-circle" style="margin-right:.4rem;"></i> My Profile</h3>
        <button id="closeProfileBtn" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:var(--muted);cursor:pointer;font-size:.9rem;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:all .2s;"><i class="fas fa-times"></i></button>
      </div>
      <div style="margin-bottom:1.2rem;">
        <label style="font-size:.7rem;color:var(--muted);display:block;margin-bottom:.3rem;font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:1px;">Name</label>
        <div style="display:flex;gap:.5rem;">
          <input type="text" id="profileName" value="${esc(data.student.name)}" style="${inputStyle}flex:1;"/>
          <button id="saveProfileNameBtn" style="background:var(--green);color:#080c16;border:none;padding:.4rem .7rem;border-radius:8px;cursor:pointer;font-size:.75rem;font-weight:700;"><i class="fas fa-save"></i></button>
        </div>
      </div>
      <div style="margin-bottom:1.2rem;">
        <label style="font-size:.7rem;color:var(--muted);display:block;margin-bottom:.3rem;font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:1px;">Email</label>
        <div style="font-size:.82rem;color:var(--text-secondary);padding:.55rem .8rem;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:8px;font-family:'Share Tech Mono',monospace;">${esc(data.student.email)}</div>
      </div>
      <div style="margin-bottom:1.2rem;border-top:1px solid rgba(255,255,255,.04);padding-top:1.2rem;">
        <label style="font-size:.7rem;color:var(--muted);display:block;margin-bottom:.5rem;font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:1px;">Change Password</label>
        <input type="password" id="currentPwd" placeholder="Current password" style="${inputStyle}margin-bottom:.4rem;"/>
        <input type="password" id="newPwd" placeholder="New password (min 8 chars)" style="${inputStyle}margin-bottom:.6rem;"/>
        <button id="changePasswordBtn" style="background:rgba(255,71,87,.08);color:var(--red);border:1px solid rgba(255,71,87,.2);padding:.45rem 1rem;border-radius:8px;cursor:pointer;font-size:.75rem;font-weight:600;"><i class="fas fa-key"></i> Change Password</button>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,.04);padding-top:1.2rem;">
        <label style="font-size:.7rem;color:var(--muted);display:block;margin-bottom:.5rem;font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:1px;">Enrolled Courses (${data.enrollments.length})</label>
        ${data.enrollments.length ? data.enrollments.map(e => `<div style="font-size:.78rem;padding:.5rem .6rem;margin-bottom:.3rem;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);border-radius:8px;display:flex;justify-content:space-between;align-items:center;"><span style="color:var(--text);">${esc(e.title)}</span><span style="color:var(--muted);font-size:.62rem;font-family:'Share Tech Mono',monospace;">${new Date(e.enrolledAt).toLocaleDateString('en-IN')}</span></div>`).join('') : '<div style="text-align:center;padding:1rem;color:var(--muted);font-size:.8rem;"><i class="fas fa-book-open" style="opacity:.3;"></i><br>No courses enrolled yet</div>'}
      </div>
    </div>`;
    document.body.appendChild(modal);

    // Attach listeners to modal internal buttons
    document.getElementById('closeProfileBtn').addEventListener('click', () => modal.remove());
    document.getElementById('saveProfileNameBtn').addEventListener('click', updateProfileName);
    document.getElementById('changePasswordBtn').addEventListener('click', changePassword);

  } catch (e) { showToast('Failed to load profile.', true); }
}

async function updateProfileName() {
  const nameInput = document.getElementById('profileName');
  if (!nameInput) return;
  const name = nameInput.value;
  const res = await fetch('/api/student/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
  const data = await res.json();
  if (data.success) {
    showToast('Name updated!');
    if (currentStudent) currentStudent.name = name;
    document.getElementById('navStudentName').textContent = name;
  } else showToast(data.error, true);
}

async function changePassword() {
  const currentPassword = document.getElementById('currentPwd').value;
  const newPassword = document.getElementById('newPwd').value;
  if (!currentPassword || !newPassword) { showToast('Fill both fields.', true); return; }
  const res = await fetch('/api/student/change-password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
  const data = await res.json();
  if (data.success) { showToast('Password changed!'); document.getElementById('currentPwd').value = ''; document.getElementById('newPwd').value = ''; }
  else showToast(data.error, true);
}

// Announcements placeholder
async function loadAnnouncements() { }
async function loadProgressBar(cid) { }
