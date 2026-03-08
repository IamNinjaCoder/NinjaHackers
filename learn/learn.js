// ═══════════════════════════════════════
//  NINJAHACKERS STUDENT PORTAL — JS
// ═══════════════════════════════════════

let currentStudent = null;
let enrolledCourses = [];
let currentCourse = null;
let isSignupMode = false;
let pendingVerifyEmail = '';

function safeHref(url) {
  if (!url) return '#';
  try {
    const u = new URL(url);
    return ['https:', 'http:'].includes(u.protocol) ? url : '#';
  } catch { return '#'; }
}

// ─── INIT ───
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/student/check');
    const data = await res.json();
    if (data.authenticated) {
      currentStudent = data.student;
      showDashboard();
    }
  } catch (e) { }
});

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
  document.getElementById('toggleBtn').textContent = isSignupMode ? 'Login' : 'Sign Up';
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
  document.getElementById('toggleBtn').textContent = 'Sign Up';
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
  document.getElementById('resetEmailDisplay').textContent = email;
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
  document.getElementById('otpEmailDisplay').textContent = email;
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
      showToast('Reset code sent! Check your email 📧');
    } else {
      errorEl.textContent = data.error || 'Failed.';
    }
  } catch (err) { errorEl.textContent = 'Connection error.'; }
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
      // Not verified yet — show OTP form
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
  document.getElementById('sidebarToggle').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  showLoginForm();
}

// ─── DASHBOARD ───
async function showDashboard() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'flex';
  document.getElementById('sidebarToggle').style.display = '';
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
    <div class="sidebar-course ${currentCourse && currentCourse.id === c.id ? 'active' : ''}" onclick="openCourse(${c.id})">
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
    <div class="course-card" onclick="openCourse(${c.id})">
      <div class="course-card-cover">
        ${c.coverImage ? `<img src="${c.coverImage}" alt=""/>` : '<i class="fas fa-laptop-code course-card-cover-icon"></i>'}
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
  document.getElementById('courseViewer').style.display = 'block';
  document.getElementById('viewerCourseTitle').textContent = currentCourse.title;
  document.getElementById('viewerCourseMeta').innerHTML =
    `<i class="fas fa-user"></i> ${esc(currentCourse.instructor)} · <i class="fas fa-clock"></i> ${esc(currentCourse.duration)} · <i class="fas fa-signal"></i> ${esc(currentCourse.level)}`;
  renderModuleSidebar();
  renderSidebar();
  document.getElementById('contentArea').innerHTML = '<div class="content-placeholder"><i class="fas fa-play-circle"></i><p>Select a class or resource from the sidebar to begin</p></div>';
  closeSidebar();
  loadProgressBar(currentCourse.id);
}

function renderModuleSidebar() {
  const el = document.getElementById('moduleSidebar');
  if (!currentCourse.modules?.length) { el.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted);font-size:.82rem;">No modules yet</div>'; return; }
  el.innerHTML = currentCourse.modules.map((m, mi) => `
    <div class="module-group">
      <div class="module-title" onclick="toggleModule(${mi})">
        <i class="fas fa-folder" style="font-size:.75rem;"></i> ${esc(m.title)}
        <i class="fas fa-chevron-right chevron ${mi === 0 ? 'open' : ''}" id="chevron-${mi}"></i>
      </div>
      <div class="module-items ${mi === 0 ? 'open' : ''}" id="module-items-${mi}">
        ${m.items.map(item => `
          <div class="module-item item-type-${item.type} sidebar-item" onclick="openItem(${item.id})" id="item-${item.id}" data-item-id="${item.id}">
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
  document.getElementById(`module-items-${i}`).classList.toggle('open');
  document.getElementById(`chevron-${i}`).classList.toggle('open');
}

function openItem(itemId) {
  let item = null;
  for (const m of currentCourse.modules) { for (const i of m.items) { if (i.id === itemId) { item = i; break; } } if (item) break; }
  if (!item) return;

  document.querySelectorAll('.module-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`item-${itemId}`);
  if (activeEl) activeEl.classList.add('active');

  const area = document.getElementById('contentArea');
  let html = '';

  switch (item.type) {
    case 'live_class':
      if (item.scheduledAt && item.isLive === false) {
        // Class hasn't started — show countdown, NO link available
        html = `<div class="content-header"><div class="content-title">${esc(item.title)}</div><div class="content-type-badge type-live_class"><i class="fas fa-broadcast-tower"></i> LIVE CLASS</div></div>
          ${item.description ? `<div class="content-description">${esc(item.description)}</div>` : ''}
          <div style="text-align:center;padding:2rem;">
            <div style="font-size:1.1rem;color:var(--orange);margin-bottom:.5rem;"><i class="fas fa-clock"></i> Class scheduled for</div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--text);margin-bottom:1.5rem;font-family:'Share Tech Mono',monospace;">${new Date(item.scheduledAt).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            <div id="countdown-${item.id}" style="font-size:2rem;font-weight:700;color:var(--green);font-family:'Share Tech Mono',monospace;letter-spacing:2px;"></div>
            <p style="margin-top:1.5rem;font-size:.78rem;color:var(--muted);font-family:'Share Tech Mono',monospace;"><i class="fas fa-lock"></i> The join link will appear when the class starts</p>
          </div>`;
        // Start countdown
        setTimeout(() => startCountdown(item.id, item.scheduledAt), 100);
      } else {
        // Class is live or no schedule — show join button
        html = `<div class="content-header"><div class="content-title">${esc(item.title)}</div><div class="content-type-badge type-live_class"><i class="fas fa-broadcast-tower"></i> LIVE CLASS</div></div>
          ${item.description ? `<div class="content-description">${esc(item.description)}</div>` : ''}
          <div style="text-align:center;padding:1rem;"><span style="display:inline-block;background:rgba(0,255,136,.1);border:1px solid var(--green);border-radius:20px;padding:.3rem 1rem;font-size:.75rem;color:var(--green);margin-bottom:1rem;"><i class="fas fa-circle" style="font-size:.5rem;"></i> Class is live now!</span></div>
          <a href="${safeHref(item.link)}" target="_blank" rel="noopener" class="content-action action-live"><i class="fas fa-video"></i> Join Live Session</a>
          <p style="margin-top:1rem;font-size:.78rem;color:var(--muted);font-family:'Share Tech Mono',monospace;"><i class="fas fa-info-circle"></i> Opens TeamViewer / meeting link in a new tab</p>`;
      }
      break;
    case 'recorded_class':
      const driveEmbed = getDriveEmbedUrl(item.link);
      html = `<div class="content-header"><div class="content-title">${esc(item.title)}</div><div class="content-type-badge type-recorded_class"><i class="fas fa-play-circle"></i> RECORDED CLASS</div></div>
        ${item.description ? `<div class="content-description">${esc(item.description)}</div>` : ''}
        ${driveEmbed ? `<div class="video-container" oncontextmenu="return false" style="position:relative;">
          <iframe src="${driveEmbed}" allowfullscreen allow="autoplay" style="pointer-events:auto;"></iframe>
          <div style="position:absolute;top:8px;right:8px;font-size:.55rem;color:rgba(255,255,255,.3);font-family:'Share Tech Mono',monospace;pointer-events:none;z-index:10;">NinjaHackers</div>
        </div>` : ''}
        <a href="${safeHref(item.link)}" target="_blank" rel="noopener" class="content-action action-video"><i class="fas fa-external-link-alt"></i> Open in Drive</a>`;
      // Track progress
      fetch(`/api/student/progress/${item.id}`, { method: 'POST' });
      break;
    case 'notes':
      html = `<div class="content-header"><div class="content-title">${esc(item.title)}</div><div class="content-type-badge type-notes"><i class="fas fa-file-alt"></i> NOTES</div></div>
        ${item.description ? `<div class="content-description" style="background:var(--surface);padding:1rem;border-radius:8px;border:1px solid rgba(0,212,255,.1);line-height:1.6;">${item.description}</div>` : ''}
        ${item.link ? `<a href="${safeHref(item.link)}" target="_blank" rel="noopener" class="content-action action-notes"><i class="fas fa-external-link-alt"></i> View / Download Notes</a>` : ''}`;
      fetch(`/api/student/progress/${item.id}`, { method: 'POST' });
      break;
    case 'assignment':
      html = `<div class="content-header"><div class="content-title">${esc(item.title)}</div><div class="content-type-badge type-assignment"><i class="fas fa-tasks"></i> ASSIGNMENT</div></div>
        ${item.description ? `<div class="content-description">${esc(item.description)}</div>` : ''}
        ${item.link ? `<a href="${safeHref(item.link)}" target="_blank" rel="noopener" class="content-action action-assignment" style="margin-bottom:1rem;"><i class="fas fa-external-link-alt"></i> View Assignment Brief</a>` : ''}
        <div style="background:var(--surface);border:1px solid rgba(255,160,0,.15);border-radius:8px;padding:1rem;margin-top:.5rem;">
          <h4 style="color:var(--orange);font-size:.85rem;margin:0 0 .5rem;"><i class="fas fa-upload"></i> Submit Your Work</h4>
          <div id="assignmentStatus-${item.id}" style="margin-bottom:.5rem;font-size:.75rem;color:var(--muted);"></div>
          <form id="assignForm-${item.id}" style="display:flex;gap:.5rem;align-items:center;">
            <input type="file" id="assignFile-${item.id}" accept=".pdf,.zip,.rar,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif" style="flex:1;font-size:.7rem;"/>
            <button type="button" onclick="submitAssignment(${item.id})" style="background:var(--orange);color:#000;border:none;padding:.4rem .8rem;border-radius:6px;cursor:pointer;font-weight:600;font-size:.75rem;"><i class="fas fa-paper-plane"></i> Submit</button>
          </form>
        </div>`;
      setTimeout(() => loadAssignmentStatus(item.id), 100);
      break;
    case 'quiz':
      html = `<div class="content-header"><div class="content-title">${esc(item.title)}</div><div class="content-type-badge" style="background:rgba(168,85,247,.15);color:#a855f7;border-color:rgba(168,85,247,.3);"><i class="fas fa-question-circle"></i> QUIZ</div></div>
        ${item.description ? `<div class="content-description">${esc(item.description)}</div>` : ''}
        <div id="quizArea-${item.id}" style="margin-top:1rem;"><div style="text-align:center;color:var(--muted);"><i class="fas fa-spinner fa-spin"></i> Loading quiz...</div></div>`;
      setTimeout(() => loadQuiz(item.id), 100);
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

async function loadAssignmentStatus(itemId) {
  try {
    const data = await (await fetch(`/api/student/assignment/${itemId}/status`)).json();
    const el = document.getElementById(`assignmentStatus-${itemId}`);
    if (!el) return;
    if (data.submission) {
      el.innerHTML = `<div style="background:rgba(0,255,136,.05);border:1px solid rgba(0,255,136,.15);border-radius:6px;padding:.6rem;">
        <div style="color:var(--green);font-size:.75rem;font-weight:600;"><i class="fas fa-check-circle"></i> Submitted: ${esc(data.submission.fileName)}</div>
        <div style="font-size:.6rem;color:var(--muted);margin-top:.2rem;">Submitted: ${new Date(data.submission.submittedAt).toLocaleString('en-IN')}</div>
        ${data.submission.grade ? `<div style="margin-top:.4rem;padding:.3rem .5rem;background:rgba(0,212,255,.1);border-radius:4px;"><span style="color:var(--cyan);font-weight:700;">Grade: ${esc(data.submission.grade)}</span>${data.submission.feedback ? ` — <span style="color:var(--muted);font-size:.7rem;">${esc(data.submission.feedback)}</span>` : ''}</div>` : '<div style="color:var(--orange);font-size:.65rem;margin-top:.3rem;"><i class="fas fa-clock"></i> Pending review</div>'}
      </div>`;
    }
  } catch (e) { }
}

// ─── QUIZ SYSTEM ───
async function loadQuiz(itemId) {
  try {
    const res = await fetch(`/api/student/quiz/${itemId}`);
    const data = await res.json();
    const area = document.getElementById(`quizArea-${itemId}`);
    if (!area) return;
    if (data.error) { area.innerHTML = `<p style="color:var(--muted);text-align:center;padding:1rem;">${data.error}</p>`; return; }

    const { quiz, questions, attempts, attemptsUsed } = data;
    const canAttempt = attemptsUsed < quiz.maxAttempts;
    const lastAttempt = attempts[0];

    let html = `<div style="display:flex;gap:1rem;margin-bottom:1rem;font-size:.7rem;">
      <span style="color:var(--muted);"><i class="fas fa-percentage"></i> Pass: ${quiz.passingPercent}%</span>
      <span style="color:var(--muted);"><i class="fas fa-redo"></i> Attempts: ${attemptsUsed}/${quiz.maxAttempts}</span>
      ${lastAttempt ? `<span style="color:${lastAttempt.passed ? 'var(--green)' : 'var(--red)'};">${lastAttempt.passed ? '<i class="fas fa-check-circle"></i> Passed' : '<i class="fas fa-times-circle"></i> Failed'} (${Math.round(lastAttempt.score / lastAttempt.totalQuestions * 100)}%)</span>` : ''}
    </div>`;

    if (canAttempt) {
      html += questions.map((q, i) => `<div style="background:var(--surface);border:1px solid rgba(168,85,247,.1);border-radius:8px;padding:.8rem;margin-bottom:.5rem;">
        <div style="font-size:.8rem;font-weight:600;color:var(--text);margin-bottom:.5rem;"><span style="color:#a855f7;">Q${i + 1}.</span> ${esc(q.question)}</div>
        <div style="display:grid;gap:.3rem;">
          ${['A', 'B', 'C', 'D'].filter(opt => q['option' + opt]).map(opt => `<label style="display:flex;align-items:center;gap:.4rem;padding:.3rem .5rem;border-radius:4px;cursor:pointer;font-size:.75rem;border:1px solid rgba(168,85,247,.1);transition:all .2s;" onmouseover="this.style.background='rgba(168,85,247,.08)'" onmouseout="this.style.background='transparent'">
            <input type="radio" name="quiz-q-${q.id}" value="${opt}" style="accent-color:#a855f7;"/>
            <span style="color:#a855f7;font-weight:700;min-width:16px;">${opt})</span> ${esc(q['option' + opt])}
          </label>`).join('')}
        </div>
      </div>`).join('');
      const qIds = JSON.stringify(questions.map(q => q.id));
      html += `<button onclick='submitQuiz(${itemId},${qIds})' style="width:100%;padding:.7rem;background:#a855f7;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:.85rem;margin-top:.5rem;"><i class="fas fa-paper-plane"></i> Submit Quiz</button>`;
    } else {
      html += `<div style="text-align:center;padding:1rem;"><span style="color:var(--orange);font-size:.85rem;"><i class="fas fa-ban"></i> No attempts remaining</span></div>`;
    }
    area.innerHTML = html;
  } catch (e) { console.error(e); }
}

async function submitQuiz(itemId, questionIds) {
  const answers = {};
  questionIds.forEach(qId => {
    const checked = document.querySelector(`input[name="quiz-q-${qId}"]:checked`);
    if (checked) answers[qId] = checked.value;
  });
  try {
    const res = await fetch(`/api/student/quiz/${itemId}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }) });
    const data = await res.json();
    if (data.error) { showToast(data.error, true); return; }
    const area = document.getElementById(`quizArea-${itemId}`);
    if (area) {
      area.innerHTML = `<div style="text-align:center;padding:1.5rem;">
        <div style="font-size:3rem;margin-bottom:.5rem;">${data.passed ? '🎉' : '😔'}</div>
        <div style="font-size:1.5rem;font-weight:700;color:${data.passed ? 'var(--green)' : 'var(--red)'};">${data.percent}%</div>
        <div style="font-size:.85rem;color:var(--muted);margin:.3rem 0;">${data.score}/${data.total} correct</div>
        <div style="font-size:.85rem;font-weight:600;color:${data.passed ? 'var(--green)' : 'var(--red)'};">${data.passed ? '✅ PASSED!' : '❌ Not passed'}</div>
        ${data.results ? `<div style="text-align:left;margin-top:1rem;">${data.results.map((r, i) => `<div style="font-size:.75rem;padding:.3rem;border-bottom:1px solid rgba(255,255,255,.05);">
          <span style="color:${r.correct ? 'var(--green)' : 'var(--red)'};">${r.correct ? '✓' : '✗'}</span> Q${i + 1}: Your answer: <b>${r.studentAnswer || '—'}</b> ${!r.correct ? `(Correct: <b style="color:var(--green);">${r.correctOption}</b>)` : ''}
        </div>`).join('')}</div>` : ''}
        <button onclick="loadQuiz(${itemId})" style="margin-top:1rem;padding:.5rem 1rem;background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.3);color:#a855f7;border-radius:6px;cursor:pointer;font-size:.75rem;"><i class="fas fa-redo"></i> Try Again</button>
      </div>`;
    }
  } catch (e) { showToast('Submit failed.', true); }
}

function showDashboardHome() {
  document.getElementById('courseViewer').style.display = 'none';
  document.getElementById('dashboardHome').style.display = 'block';
  currentCourse = null;
  renderSidebar();
}

// ─── SIDEBAR TOGGLE ───
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); }

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
      // Auto-refresh the course to get the live link from server
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
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => { el.className = 'toast'; }, 3000);
}

// ═══════════════════════════════════════
//  STUDENT PROFILE
// ═══════════════════════════════════════
async function openProfile() {
  try {
    const data = await (await fetch('/api/student/profile')).json();
    const modal = document.createElement('div');
    modal.id = 'profileModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
    modal.innerHTML = `<div style="background:var(--surface);border:1px solid rgba(0,255,136,.2);border-radius:12px;padding:1.5rem;max-width:500px;width:100%;max-height:85vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h3 style="color:var(--green);margin:0;"><i class="fas fa-user-circle"></i> My Profile</h3>
        <button onclick="document.getElementById('profileModal').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.2rem;"><i class="fas fa-times"></i></button>
      </div>
      <div style="margin-bottom:1rem;">
        <label style="font-size:.65rem;color:var(--muted);">Name</label>
        <div style="display:flex;gap:.5rem;"><input type="text" id="profileName" value="${esc(data.student.name)}" style="flex:1;"/><button onclick="updateProfileName()" style="background:var(--green);color:#000;border:none;padding:.3rem .6rem;border-radius:4px;cursor:pointer;font-size:.7rem;"><i class="fas fa-save"></i></button></div>
      </div>
      <div style="margin-bottom:1rem;">
        <label style="font-size:.65rem;color:var(--muted);">Email</label>
        <div style="font-size:.85rem;color:var(--text);padding:.4rem;background:var(--bg);border-radius:4px;">${esc(data.student.email)}</div>
      </div>
      <div style="margin-bottom:1rem;border-top:1px solid rgba(255,255,255,.05);padding-top:1rem;">
        <label style="font-size:.65rem;color:var(--muted);">Change Password</label>
        <input type="password" id="currentPwd" placeholder="Current password" style="width:100%;margin-bottom:.3rem;font-size:.75rem;"/>
        <input type="password" id="newPwd" placeholder="New password (min 8 chars)" style="width:100%;margin-bottom:.3rem;font-size:.75rem;"/>
        <button onclick="changePassword()" style="background:rgba(255,80,80,.15);color:var(--red);border:1px solid rgba(255,80,80,.3);padding:.3rem .8rem;border-radius:4px;cursor:pointer;font-size:.7rem;"><i class="fas fa-key"></i> Change Password</button>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,.05);padding-top:1rem;">
        <label style="font-size:.65rem;color:var(--muted);">Enrolled Courses (${data.enrollments.length})</label>
        ${data.enrollments.map(e => `<div style="font-size:.75rem;padding:.3rem 0;border-bottom:1px solid rgba(255,255,255,.03);display:flex;justify-content:space-between;"><span>${esc(e.title)}</span><span style="color:var(--muted);font-size:.6rem;">${new Date(e.enrolledAt).toLocaleDateString('en-IN')}</span></div>`).join('')}
      </div>
    </div>`;
    document.body.appendChild(modal);
  } catch (e) { showToast('Failed to load profile.', true); }
}

async function updateProfileName() {
  const name = document.getElementById('profileName').value;
  const res = await fetch('/api/student/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
  const data = await res.json();
  if (data.success) showToast('Name updated!'); else showToast(data.error, true);
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

// ═══════════════════════════════════════
//  COURSE REVIEWS
// ═══════════════════════════════════════
async function showReviewForm(courseId) {
  const modal = document.createElement('div');
  modal.id = 'reviewModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
  modal.innerHTML = `<div style="background:var(--surface);border:1px solid rgba(255,160,0,.2);border-radius:12px;padding:1.5rem;max-width:400px;width:100%;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
      <h3 style="color:var(--orange);margin:0;"><i class="fas fa-star"></i> Rate Course</h3>
      <button onclick="document.getElementById('reviewModal').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;"><i class="fas fa-times"></i></button>
    </div>
    <div style="display:flex;gap:.3rem;justify-content:center;margin-bottom:1rem;" id="starRating">
      ${[1, 2, 3, 4, 5].map(n => `<span onclick="setRating(${n})" style="cursor:pointer;font-size:1.5rem;color:var(--muted);transition:color .2s;" id="star-${n}">★</span>`).join('')}
    </div>
    <input type="hidden" id="ratingValue" value="5"/>
    <textarea id="reviewText" placeholder="Write your review (optional)" rows="3" style="width:100%;background:var(--bg);color:var(--text);border:1px solid rgba(255,160,0,.2);border-radius:6px;padding:.5rem;margin-bottom:.5rem;"></textarea>
    <button onclick="submitReview(${courseId})" style="width:100%;padding:.5rem;background:var(--orange);color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:700;"><i class="fas fa-paper-plane"></i> Submit Review</button>
  </div>`;
  document.body.appendChild(modal);
  setRating(5);
}

function setRating(n) {
  document.getElementById('ratingValue').value = n;
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`star-${i}`).style.color = i <= n ? '#ffa000' : 'var(--muted)';
  }
}

async function submitReview(courseId) {
  const rating = parseInt(document.getElementById('ratingValue').value);
  const review = document.getElementById('reviewText').value;
  const res = await fetch(`/api/student/reviews/${courseId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, review }) });
  const data = await res.json();
  if (data.success) { showToast('Review submitted!'); document.getElementById('reviewModal').remove(); }
  else showToast(data.error, true);
}

// ═══════════════════════════════════════
//  PROGRESS BAR
// ═══════════════════════════════════════
let courseProgress = { completedItems: [] };

async function loadProgressBar(courseId) {
  try {
    const data = await (await fetch(`/api/student/progress/${courseId}`)).json();
    courseProgress = data;
    const bar = document.getElementById('progressBar');
    if (bar) {
      bar.innerHTML = `<div style="display:flex;align-items:center;gap:.6rem;padding:.5rem 0;">
        <div style="flex:1;height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;"><div style="height:100%;background:var(--green);border-radius:3px;width:${data.percent}%;transition:width .5s;"></div></div>
        <span style="font-family:'Share Tech Mono',monospace;font-size:.7rem;color:${data.percent >= 100 ? 'var(--green)' : 'var(--muted)'};">${data.percent}%</span>
      </div>`;
    }
    // Update checkmarks on sidebar items
    document.querySelectorAll('.sidebar-item').forEach(el => {
      const itemId = parseInt(el.dataset.itemId);
      if (data.completedItems.includes(itemId)) el.classList.add('completed');
    });
  } catch (e) { }
}

// ═══════════════════════════════════════
//  ANNOUNCEMENTS (Student Dashboard)
// ═══════════════════════════════════════
async function loadAnnouncements() {
  try {
    const anns = await (await fetch('/api/student/announcements')).json();
    const container = document.getElementById('announcementsBanner');
    if (!container || !anns.length) return;
    container.innerHTML = anns.slice(0, 3).map(a => `<div style="background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.15);border-radius:8px;padding:.6rem .8rem;margin-bottom:.4rem;">
      <div style="display:flex;align-items:center;gap:.4rem;">
        <i class="fas fa-bullhorn" style="color:#a855f7;font-size:.65rem;"></i>
        <span style="font-weight:600;font-size:.8rem;color:var(--text);">${esc(a.title)}</span>
        <span style="font-size:.55rem;color:var(--muted);margin-left:auto;font-family:'Share Tech Mono',monospace;">${new Date(a.createdAt).toLocaleDateString('en-IN')}</span>
      </div>
      <p style="font-size:.7rem;color:var(--muted);margin:.2rem 0 0 1rem;">${esc(a.message)}</p>
    </div>`).join('');
    container.style.display = 'block';
  } catch (e) { }
}
