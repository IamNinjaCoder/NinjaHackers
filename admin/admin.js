// ═══════════════════════════════════════
//  NINJAHACKERS ADMIN — JS
// ═══════════════════════════════════════

let currentTags = [];
let deleteTargetId = null;
let deleteTargetType = '';
let easyMDE = null;
let currentCoverImage = '';
let currentTab = 'blogs';
let allStudents = [];
let currentStudentId = null;
let allPayments = [];

// ─── INIT ───
document.addEventListener('DOMContentLoaded', async () => {
  const res = await fetch('/api/admin/check');
  const data = await res.json();
  if (data.authenticated) showDashboard();

  // ─── STATIC EVENT LISTENERS ───
  
  // Auth
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Blogs
  const newBlogBtn = document.getElementById('newBlogBtn');
  if (newBlogBtn) newBlogBtn.addEventListener('click', () => openBlogEditor());
  
  const cancelBlogBtn = document.getElementById('cancelBlogBtn');
  if (cancelBlogBtn) cancelBlogBtn.addEventListener('click', closeBlogEditor);
  
  const saveBlogBtn = document.getElementById('saveBlogBtn');
  if (saveBlogBtn) saveBlogBtn.addEventListener('click', saveBlog);
  
  const addTagBtn = document.getElementById('addTagBtn');
  if (addTagBtn) addTagBtn.addEventListener('click', addTag);
  
  const coverUploadInput = document.getElementById('coverUploadInput');
  if (coverUploadInput) coverUploadInput.addEventListener('change', handleCoverUpload);
  
  const removeCoverBtn = document.getElementById('removeCoverBtn');
  if (removeCoverBtn) removeCoverBtn.addEventListener('click', removeCover);
  
  const inlineUploadInput = document.getElementById('inlineUploadInput');
  if (inlineUploadInput) inlineUploadInput.addEventListener('change', handleInlineUpload);

  // Courses
  const newCourseBtn = document.getElementById('newCourseBtn');
  if (newCourseBtn) newCourseBtn.addEventListener('click', () => openCourseEditor());
  
  const cancelCourseBtn = document.getElementById('cancelCourseBtn');
  if (cancelCourseBtn) cancelCourseBtn.addEventListener('click', closeCourseEditor);
  
  const saveCourseBtn = document.getElementById('saveCourseBtn');
  if (saveCourseBtn) saveCourseBtn.addEventListener('click', saveCourse);
  
  const addModuleBtn = document.getElementById('addModuleBtn');
  if (addModuleBtn) addModuleBtn.addEventListener('click', addModule);
  
  const courseCoverUploadInput = document.getElementById('courseCoverUploadInput');
  if (courseCoverUploadInput) courseCoverUploadInput.addEventListener('change', handleCourseCoverUpload);
  
  const removeCourseCoverBtn = document.getElementById('removeCourseCoverBtn');
  if (removeCourseCoverBtn) removeCourseCoverBtn.addEventListener('click', removeCourseCover);

  const courseCoverUrl = document.getElementById('courseCoverUrl');
  if (courseCoverUrl) {
    courseCoverUrl.addEventListener('input', (e) => {
      currentCourseCover = e.target.value.trim();
      updateCourseCoverPreview();
    });
  }

  // Students - search
  const studentSearch = document.getElementById('studentSearch');
  if (studentSearch) studentSearch.addEventListener('input', filterStudents);
  
  const closeStudentDetailBtn = document.getElementById('closeStudentDetailBtn');
  if (closeStudentDetailBtn) closeStudentDetailBtn.addEventListener('click', closeStudentDetail);
  
  const assignCourseBtn = document.getElementById('assignCourseBtn');
  if (assignCourseBtn) assignCourseBtn.addEventListener('click', assignCourseToStudent);

  // Enrollments
  const quickEnrollBtn = document.getElementById('quickEnrollBtn');
  if (quickEnrollBtn) quickEnrollBtn.addEventListener('click', showManualEnrollForm);
  
  const manualEnrollSubmit = document.getElementById('manualEnrollSubmit');
  if (manualEnrollSubmit) manualEnrollSubmit.addEventListener('click', manualEnroll);

  // Coupons
  const toggleCouponFormBtn = document.getElementById('toggleCouponFormBtn');
  if (toggleCouponFormBtn) toggleCouponFormBtn.addEventListener('click', toggleCouponForm);
  
  const saveCouponBtn = document.getElementById('saveCouponBtn');
  if (saveCouponBtn) saveCouponBtn.addEventListener('click', saveCoupon);

  // Announcements
  const toggleAnnouncementFormBtn = document.getElementById('toggleAnnouncementFormBtn');
  if (toggleAnnouncementFormBtn) toggleAnnouncementFormBtn.addEventListener('click', toggleAnnouncementForm);
  
  const saveAnnouncementBtn = document.getElementById('saveAnnouncementBtn');
  if (saveAnnouncementBtn) saveAnnouncementBtn.addEventListener('click', saveAnnouncement);

  // Assignments
  const assignmentCourseFilter = document.getElementById('assignmentCourseFilter');
  if (assignmentCourseFilter) assignmentCourseFilter.addEventListener('change', filterAssignments);

  // Works
  const newWorkBtn = document.getElementById('newWorkBtn');
  if (newWorkBtn) newWorkBtn.addEventListener('click', () => openWorkEditor());
  
  const cancelWorkBtn = document.getElementById('cancelWorkBtn');
  if (cancelWorkBtn) cancelWorkBtn.addEventListener('click', closeWorkEditor);
  
  const saveWorkBtn = document.getElementById('saveWorkBtn');
  if (saveWorkBtn) saveWorkBtn.addEventListener('click', saveWork);

  // Videos
  const newVideoBtn = document.getElementById('newVideoBtn');
  if (newVideoBtn) newVideoBtn.addEventListener('click', () => openVideoEditor());
  
  const cancelVideoBtn = document.getElementById('cancelVideoBtn');
  if (cancelVideoBtn) cancelVideoBtn.addEventListener('click', closeVideoEditor);
  
  const saveVideoBtn = document.getElementById('saveVideoBtn');
  if (saveVideoBtn) saveVideoBtn.addEventListener('click', saveVideo);

  // Jobs
  const newJobBtn = document.getElementById('newJobBtn');
  if (newJobBtn) newJobBtn.addEventListener('click', () => openJobEditor());
  
  const jobsFilterSelect = document.getElementById('jobsFilterSelect');
  if (jobsFilterSelect) jobsFilterSelect.addEventListener('change', loadAdminJobs);
  
  const cancelJobBtn = document.getElementById('cancelJobBtn');
  if (cancelJobBtn) cancelJobBtn.addEventListener('click', closeJobEditor);
  
  const saveJobBtn = document.getElementById('saveJobBtn');
  if (saveJobBtn) saveJobBtn.addEventListener('click', saveJob);
  
  const addJobQuestionBtn = document.getElementById('addJobQuestionBtn');
  if (addJobQuestionBtn) addJobQuestionBtn.addEventListener('click', addJobQuestion);
  
  const closeJobAppsBtn = document.getElementById('closeJobAppsBtn');
  if (closeJobAppsBtn) closeJobAppsBtn.addEventListener('click', closeJobApps);
  
  const downloadJobAppsBtn = document.getElementById('downloadJobAppsBtn');
  if (downloadJobAppsBtn) downloadJobAppsBtn.addEventListener('click', downloadJobAppsCSV);

  // Settings
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);

  // Delete Modal
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', confirmDelete);

  // ─── DYNAMIC EVENT DELEGATION ───
  
  // Blog List Actions
  document.getElementById('blogList').addEventListener('click', e => {
    const editBtn = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.btn-delete');
    if (editBtn) {
      const id = editBtn.dataset.id;
      editBlog(id);
    } else if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      openDeleteModal(id, 'blog');
    }
  });

  // Course List Actions
  document.getElementById('courseList').addEventListener('click', e => {
    const editBtn = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.btn-delete');
    if (editBtn) {
      const id = editBtn.dataset.id;
      editCourse(id);
    } else if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      openDeleteModal(id, 'course');
    }
  });

  // Module List Actions
  document.getElementById('moduleList').addEventListener('click', async e => {
    const target = e.target;
    const moduleId = target.closest('[data-module-id]')?.dataset.moduleId;
    const courseId = document.getElementById('editCourseId').value;
    
    if (target.closest('.btn-reorder-up')) {
      const id = target.closest('.btn-reorder-up').dataset.id;
      reorderModule(id, 'up', courseId);
    } else if (target.closest('.btn-reorder-down')) {
      const id = target.closest('.btn-reorder-down').dataset.id;
      reorderModule(id, 'down', courseId);
    } else if (target.closest('.btn-delete-module')) {
      const id = target.closest('.btn-delete-module').dataset.id;
      deleteModule(id, courseId);
    } else if (target.closest('.btn-quiz-builder')) {
      const id = target.closest('.btn-quiz-builder').dataset.id;
      openQuizBuilder(id);
    } else if (target.closest('.btn-view-subs')) {
      const id = target.closest('.btn-view-subs').dataset.id;
      viewSubmissions(id);
    } else if (target.closest('.btn-delete-item')) {
      const id = target.closest('.btn-delete-item').dataset.id;
      deleteItem(id, courseId);
    } else if (target.closest('.btn-add-item')) {
      const modId = target.closest('.btn-add-item').dataset.moduleId;
      addItem(modId, courseId);
    }
  });
  
  document.getElementById('moduleList').addEventListener('change', e => {
    if (e.target.matches('[id^="itemType-"]')) {
      const moduleId = e.target.id.split('-')[1];
      toggleScheduleInput(moduleId);
    }
  });

  // Student List Actions
  document.getElementById('studentList').addEventListener('click', e => {
    const item = e.target.closest('.blog-list-item');
    if (item) {
      const id = item.dataset.id;
      openStudentDetail(id);
    }
  });

  // Student Detail Actions
  document.getElementById('studentEnrolledCourses').addEventListener('click', e => {
    const resetBtn = e.target.closest('.btn-reset-progress');
    const removeBtn = e.target.closest('.btn-remove-course');
    if (resetBtn) {
      const { studentId, courseId } = resetBtn.dataset;
      resetStudentProgress(studentId, courseId);
    } else if (removeBtn) {
      const { enrollmentId, studentId } = removeBtn.dataset;
      removeCourseFromStudent(enrollmentId, studentId);
    }
  });

  // Enrollment Body Actions
  document.getElementById('enrollmentBody').addEventListener('click', e => {
    const studentLink = e.target.closest('.student-link');
    const deleteBtn = e.target.closest('.btn-delete');
    if (studentLink) {
      e.preventDefault();
      const id = studentLink.dataset.id;
      switchTab('students');
      setTimeout(() => openStudentDetail(id), 300);
    } else if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      deleteEnrollment(id);
    }
  });

  // Payment Body Actions (Tab Switching)
  document.getElementById('paymentStats').addEventListener('click', e => {
    const card = e.target.closest('.payment-stat-card');
    if (card) {
      filterPayments(card.dataset.status);
    }
  });

  // Announcement Actions
  document.getElementById('announcementList').addEventListener('click', e => {
    const deleteBtn = e.target.closest('.btn-delete');
    if (deleteBtn) {
      deleteAnnouncement(deleteBtn.dataset.id);
    }
  });

  // Assignment List Actions
  document.getElementById('assignmentList').addEventListener('click', e => {
    const saveBtn = e.target.closest('.btn-save-grade');
    if (saveBtn) {
      saveGrade(saveBtn.dataset.id);
    }
  });

  // Works List Actions
  document.getElementById('worksList').addEventListener('click', e => {
    const editBtn = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.btn-delete');
    if (editBtn) {
      editWork(editBtn.dataset.id);
    } else if (deleteBtn) {
      openDeleteModal(deleteBtn.dataset.id, 'works');
    }
  });

  // Videos List Actions
  document.getElementById('videosList').addEventListener('click', e => {
    const editBtn = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.btn-delete');
    if (editBtn) {
      editVideo(editBtn.dataset.id);
    } else if (deleteBtn) {
      openDeleteModal(deleteBtn.dataset.id, 'videos');
    }
  });

  // Jobs List Actions
  document.getElementById('jobsListAdmin').addEventListener('click', e => {
    const editBtn = e.target.closest('.btn-edit-job');
    const appsBtn = e.target.closest('.btn-view-apps');
    const deleteBtn = e.target.closest('.btn-delete-job');
    if (editBtn) {
      editJob(editBtn.dataset.id);
    } else if (appsBtn) {
      const id = appsBtn.dataset.id;
      const title = appsBtn.dataset.title;
      openJobApps(id, title);
    } else if (deleteBtn) {
      openDeleteModal(deleteBtn.dataset.id, 'job');
    }
  });

  // Global click listeners for tags and quiz buttons (which might be in modals)
  document.addEventListener('click', e => {
    // Tags removal
    if (e.target.closest('.remove-tag')) {
      const index = e.target.closest('.remove-tag').dataset.index;
      removeTag(index);
    }
    
    // Quiz Builder
    if (e.target.closest('#quizBuilderModal .btn-close-modal')) {
      document.getElementById('quizBuilderModal').remove();
    } else if (e.target.closest('#quizBuilderModal .btn-add-quiz-q')) {
      addQuizQuestion();
    } else if (e.target.closest('#quizBuilderModal .btn-save-quiz')) {
      const id = e.target.closest('.btn-save-quiz').dataset.id;
      saveQuiz(id);
    } else if (e.target.closest('.btn-remove-quiz-q')) {
      removeQuizQuestion(e.target.closest('.btn-remove-quiz-q').dataset.index);
    }
    
    // Submissions Modal
    if (e.target.closest('#submissionsModal .btn-close-modal')) {
      document.getElementById('submissionsModal').remove();
    } else if (e.target.closest('.btn-grade-sub')) {
      const subId = e.target.closest('.btn-grade-sub').dataset.subId;
      const itemId = e.target.closest('.btn-grade-sub').dataset.itemId;
      gradeSubmission(subId, itemId);
    }
    
    // Coupon actions
    if (e.target.closest('#couponList .btn-delete')) {
      deleteCoupon(e.target.closest('.btn-delete').dataset.id);
    }

    // Job Question Builder actions
    if (e.target.closest('.btn-remove-job-q')) {
      removeJobQuestion(e.target.closest('.btn-remove-job-q').dataset.index);
    } else if (e.target.closest('.btn-add-select-opt')) {
      addSelectOption(e.target.closest('.btn-add-select-opt').dataset.index);
    } else if (e.target.closest('.btn-remove-select-opt')) {
      const qIdx = e.target.closest('.btn-remove-select-opt').dataset.qIndex;
      const optIdx = e.target.closest('.btn-remove-select-opt').dataset.optIndex;
      removeSelectOption(qIdx, optIdx);
    }
    
    // Job Apps Actions
    if (e.target.closest('.btn-view-answers')) {
      viewCustomAnswers(e.target.closest('.btn-view-answers').dataset.appId);
    } else if (e.target.closest('.btn-view-cover')) {
      e.preventDefault();
      const cover = e.target.closest('.btn-view-cover').dataset.cover;
      alert('Cover Letter:\n\n' + cover);
    } else if (e.target.closest('.btn-verify-app')) {
      const jobId = e.target.closest('.btn-verify-app').dataset.jobId;
      const appId = e.target.closest('.btn-verify-app').dataset.appId;
      verifyJobApplication(jobId, appId);
    }
  });

  // Global change listeners
  document.addEventListener('change', e => {
    if (e.target.matches('#quizQuestionsContainer input, #quizQuestionsContainer select')) {
      // Logic handled within renderQuizQuestions via onchange usually, 
      // but since we want to remove inline onchange, we handle it here.
      const container = e.target.closest('[data-index]');
      if (container) {
        const index = container.dataset.index;
        const q = quizQuestions[index];
        if (e.target.placeholder === "Question text") q.question = e.target.value;
        else if (e.target.placeholder === "A)") q.optionA = e.target.value;
        else if (e.target.placeholder === "B)") q.optionB = e.target.value;
        else if (e.target.placeholder === "C) (optional)") q.optionC = e.target.value;
        else if (e.target.placeholder === "D) (optional)") q.optionD = e.target.value;
        else if (e.target.tagName === "SELECT") q.correctOption = e.target.value;
      }
    }
    
    // Job Question updates
    if (e.target.closest('.job-q-item')) {
      const qIdx = e.target.closest('.job-q-item').dataset.index;
      if (e.target.placeholder === "Question Text") updateJobQuestion(qIdx, 'question', e.target.value);
      else if (e.target.matches('select.q-type')) { updateJobQuestion(qIdx, 'type', e.target.value); renderJobQuestions(); }
      else if (e.target.matches('select.q-req')) updateJobQuestion(qIdx, 'required', e.target.value);
    }
    if (e.target.matches('.opt-input')) {
      const qIdx = e.target.dataset.qIndex;
      const optIdx = e.target.dataset.optIndex;
      updateSelectOption(qIdx, optIdx, e.target.value);
    }
  });

  // Global listeners for CSP compliance
  document.addEventListener('error', e => {
    if (e.target.tagName === 'IMG') {
        const logoText = document.getElementById('logoText') || document.getElementById('lt');
        if (logoText && (e.target.classList.contains('logo-img') || e.target.classList.contains('header-logo-img'))) {
            e.target.style.display = 'none';
            logoText.style.display = 'flex';
        } else if (e.target.classList.contains('img-fallback')) {
            e.target.style.display = 'none';
        }
    }
  }, true);

  document.addEventListener('contextmenu', e => {
    if (e.target.closest('.no-context')) {
        e.preventDefault();
    }
  });
});

// ─── AUTH ───
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';
  try {
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (res.ok && data.success) showDashboard();
    else errorEl.textContent = data.error || 'Login failed.';
  } catch (e) { errorEl.textContent = 'Connection error.'; }
}

async function handleLogout() {
  await fetch('/api/admin/logout', { method: 'POST' });
  const login = document.getElementById('loginScreen');
  if (login) {
    document.getElementById('adminDashboard').style.display = 'none';
    login.style.display = 'flex';
  } else {
    window.location.href = '/admin/login.html';
  }
}

function showDashboard() {
  const login = document.getElementById('loginScreen');
  if (login) login.style.display = 'none';
  const dash = document.getElementById('adminDashboard');
  if (dash) dash.style.display = 'block';
  switchTab('blogs');
}

async function checkSession() {
  try {
    const res = await fetch('/api/admin/check');
    const data = await res.json();
    if (!data.authenticated) handleLogout();
  } catch (e) {}
}

// ─── TABS ───
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => { c.style.display = 'none'; c.classList.remove('active'); });
  const el = document.getElementById(`tab-${tab}`);
  if (el) { el.style.display = 'block'; el.classList.add('active'); }
  // Hide editors/details
  document.getElementById('blogEditorView').style.display = 'none';
  document.getElementById('courseEditorView').style.display = 'none';
  document.getElementById('studentDetailView').style.display = 'none';
  document.getElementById('worksListView').style.display = 'block';
  document.getElementById('workEditorView').style.display = 'none';
  document.getElementById('videosListView').style.display = 'block';
  document.getElementById('videoEditorView').style.display = 'none';
  document.getElementById('jobAppsView').style.display = 'none';
  document.getElementById('jobEditorView').style.display = 'none';
  document.getElementById('jobsListView').style.display = 'block';

  // Load data
  switch (tab) {
    case 'blogs': loadBlogs(); break;
    case 'courses': loadCourses(); break;
    case 'students': loadStudents(); break;
    case 'enrollments': loadEnrollments(); break;
    case 'payments': loadPayments(); break;
    case 'messages': loadMessages(); break;
    case 'security': loadSecurityLogs(); break;
    case 'analytics': loadAnalytics(); break;
    case 'coupons': loadCoupons(); break;
    case 'announcements': loadAnnouncements(); break;
    case 'assignments': loadAssignments(); break;
    case 'videos': loadVideos(); break;
    case 'jobs': loadAdminJobs(); break;
    case 'settings': loadSettings(); break;
  }
}

// ═══════════════════════════════════════
//  BLOGS
// ═══════════════════════════════════════
async function loadBlogs() {
  try {
    const res = await fetch('/api/admin/blogs');
    if (res.status === 401) { handleLogout(); return; }
    const blogs = await res.json();
    const listEl = document.getElementById('blogList');
    document.getElementById('blogCount').textContent = `${blogs.length} total · ${blogs.filter(b => b.published).length} published`;
    if (!blogs.length) { listEl.innerHTML = '<div class="empty-state"><i class="fas fa-pen-nib"></i><p>No blog posts yet.</p></div>'; return; }
    listEl.innerHTML = blogs.map(b => `
      <div class="blog-list-item">
        <div class="blog-list-info">
          <div class="blog-list-title">${esc(b.title)}</div>
          <div class="blog-list-meta">
            ${b.published ? '<span class="status-published"><i class="fas fa-check-circle"></i> Published</span>' : '<span class="status-draft"><i class="fas fa-eye-slash"></i> Draft</span>'}
            ${b.featured ? '<span style="color:var(--green);"><i class="fas fa-star"></i> Featured</span>' : ''}
            <span>${esc(b.author)}</span><span>${esc(b.date)}</span>
            ${b.tags.map(t => `<span class="tag ${t.cls}">${esc(t.label)}</span>`).join('')}
          </div>
        </div>
        <div class="blog-list-actions">
          <button class="btn-edit" data-id="${b.id}"><i class="fas fa-pen"></i></button>
          <button class="btn-delete" data-id="${b.id}"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>`).join('');
  } catch (e) { showToast('Failed to load blogs.', true); }
}

function openBlogEditor(blog = null) {
  document.getElementById('tab-blogs').style.display = 'none';
  document.getElementById('blogEditorView').style.display = 'block';
  if (!easyMDE) {
    easyMDE = new EasyMDE({ element: document.getElementById('blogContent'), spellChecker: false, placeholder: 'Write in Markdown...', toolbar: ['bold', 'italic', 'heading', '|', 'code', 'quote', 'unordered-list', '|', 'link', 'image', 'table', '|', 'preview', 'side-by-side', 'guide'], status: ['lines', 'words', 'cursor'] });
  }
  if (blog) {
    document.getElementById('editorTitle').innerHTML = '<i class="fas fa-edit" style="color:var(--green);margin-right:.5rem;"></i>Edit Blog Post';
    document.getElementById('editBlogId').value = blog.id;
    console.log('[DEBUG] openBlogEditor SET editBlogId to:', blog.id, 'type:', typeof blog.id);
    console.log('[DEBUG] editBlogId.value now:', document.getElementById('editBlogId').value);
    document.getElementById('blogTitleInput').value = blog.title;
    document.getElementById('blogAuthor').value = blog.author || '';
    document.getElementById('blogExcerpt').value = blog.excerpt;
    document.getElementById('blogReadTime').value = blog.readTime;
    document.getElementById('blogDate').value = blog.date;
    document.getElementById('blogPublished').value = blog.published ? '1' : '0';
    document.getElementById('blogFeatured').checked = !!blog.featured;
    currentCoverImage = blog.coverImage || '';
    easyMDE.value(blog.content || '');
    currentTags = blog.tags || [];
  } else {
    document.getElementById('editorTitle').innerHTML = '<i class="fas fa-plus" style="color:var(--green);margin-right:.5rem;"></i>New Blog Post';
    document.getElementById('editBlogId').value = '';
    document.getElementById('blogTitleInput').value = '';
    document.getElementById('blogAuthor').value = '';
    document.getElementById('blogExcerpt').value = '';
    document.getElementById('blogReadTime').value = '';
    document.getElementById('blogDate').value = '';
    document.getElementById('blogPublished').value = '1';
    document.getElementById('blogFeatured').checked = false;
    currentCoverImage = '';
    easyMDE.value('');
    currentTags = [];
  }
  updateCoverPreview();
  renderTags();
  setTimeout(() => easyMDE.codemirror.refresh(), 100);
}

function closeBlogEditor() { document.getElementById('blogEditorView').style.display = 'none'; switchTab('blogs'); }

async function editBlog(id) {
  console.log('[DEBUG] editBlog called with id:', id, 'type:', typeof id);
  const res = await fetch('/api/admin/blogs');
  const blogs = await res.json();
  console.log('[DEBUG] fetched blogs:', blogs.map(b => ({ id: b.id, idType: typeof b.id, title: b.title })));
  const blog = blogs.find(b => b.id == id);
  console.log('[DEBUG] found blog:', blog ? { id: blog.id, title: blog.title } : 'NOT FOUND');
  if (blog) openBlogEditor(blog);
  else showToast('Blog not found.', true);
}

async function saveBlog() {
  const id = document.getElementById('editBlogId').value;
  console.log('[DEBUG] saveBlog - editBlogId value:', JSON.stringify(id), 'truthy:', !!id);
  const title = document.getElementById('blogTitleInput').value.trim();
  const author = document.getElementById('blogAuthor').value.trim();
  const excerpt = document.getElementById('blogExcerpt').value.trim();
  const readTime = document.getElementById('blogReadTime').value.trim();
  const date = document.getElementById('blogDate').value.trim();
  const published = document.getElementById('blogPublished').value === '1';
  const featured = document.getElementById('blogFeatured').checked;
  const content = easyMDE.value();
  if (!title || !content) { showToast('Title and content required.', true); return; }
  const payload = { title, author, excerpt, readTime, date, published, featured, content, tags: currentTags, coverImage: currentCoverImage };
  try {
    const url = id ? `/api/admin/blogs/${id}` : '/api/admin/blogs';
    const res = await fetch(url, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) { showToast(id ? 'Blog updated!' : 'Blog published!'); closeBlogEditor(); }
    else showToast(data.error || 'Save failed.', true);
  } catch (e) { showToast('Connection error.', true); }
}

// Image uploads
async function handleCoverUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('Max 5MB.', true); return; }
  const b64 = await fileToBase64(file);
  try {
    const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: b64, filename: file.name.replace(/\.[^.]+$/, '') }) });
    const data = await res.json();
    if (data.success) { currentCoverImage = data.url; updateCoverPreview(); showToast('Uploaded!'); }
  } catch (e) { showToast('Upload error.', true); }
  e.target.value = '';
}

async function handleInlineUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  const b64 = await fileToBase64(file);
  try {
    const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: b64, filename: file.name.replace(/\.[^.]+$/, '') }) });
    const data = await res.json();
    if (data.success) {
      easyMDE.codemirror.replaceSelection(`![${file.name}](${data.url})`);
      easyMDE.codemirror.focus();
      document.getElementById('inlineUploadResult').style.display = 'block';
      document.getElementById('inlineUploadResult').innerHTML = '<span class="inline-upload-result">✓ Inserted</span>';
      showToast('Image inserted!');
    }
  } catch (e) { showToast('Upload error.', true); }
  e.target.value = '';
}

function removeCover() { currentCoverImage = ''; updateCoverPreview(); }
function updateCoverPreview() {
  const p = document.getElementById('coverPreview');
  if (currentCoverImage) { p.style.display = 'block'; document.getElementById('coverPreviewImg').src = currentCoverImage; }
  else p.style.display = 'none';
}
function fileToBase64(file) { return new Promise((r, e) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = e; fr.readAsDataURL(file); }); }

// Tags
function addTag() { const i = document.getElementById('tagInput'), c = document.getElementById('tagColor').value, l = i.value.trim(); if (!l) return; currentTags.push({ label: l, cls: c }); i.value = ''; renderTags(); }
function removeTag(i) { currentTags.splice(i, 1); renderTags(); }
function renderTags() {
  document.getElementById('tagsList').innerHTML = currentTags.length ? currentTags.map((t, i) => `<span class="tag-item ${t.cls}">${esc(t.label)} <span class="remove-tag" data-index="${i}"><i class="fas fa-times"></i></span></span>`).join('') : '<span style="font-size:.75rem;color:var(--muted);">No tags</span>';
}

// ═══════════════════════════════════════
//  COURSES
// ═══════════════════════════════════════
async function loadCourses() {
  try {
    const res = await fetch('/api/admin/courses');
    const courses = await res.json();
    document.getElementById('courseCount').textContent = `${courses.length} courses`;
    const el = document.getElementById('courseList');
    if (!courses.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-graduation-cap"></i><p>No courses yet.</p></div>'; return; }
    el.innerHTML = courses.map(c => `
      <div class="blog-list-item">
        <div class="blog-list-info">
          <div class="blog-list-title">${esc(c.title)}</div>
          <div class="blog-list-meta">
            ${c.published ? '<span class="status-published"><i class="fas fa-check-circle"></i> Published</span>' : '<span class="status-draft"><i class="fas fa-eye-slash"></i> Draft</span>'}
            <span><i class="fas fa-tag"></i> ${esc(c.code)}</span>
            <span>${c.price === 0 ? '<span class="tag tag-cyan">FREE</span>' : '₹' + c.price}</span>
            <span><i class="fas fa-users"></i> ${c.enrollmentCount} enrolled</span>
            <span><i class="fas fa-sitemap"></i> ${c.moduleCount} modules</span>
          </div>
        </div>
        <div class="blog-list-actions">
          <button class="btn-edit" data-id="${c.id}" title="Edit"><i class="fas fa-pen"></i></button>
          <button class="btn-delete" data-id="${c.id}" title="Delete"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>`).join('');
  } catch (e) { showToast('Failed to load courses.', true); }
}

let currentCourseCover = '';

function openCourseEditor(course = null) {
  document.getElementById('tab-courses').style.display = 'none';
  document.getElementById('courseEditorView').style.display = 'block';
  if (course) {
    document.getElementById('courseEditorTitle').innerHTML = '<i class="fas fa-graduation-cap" style="color:var(--cyan);margin-right:.5rem;"></i>Edit Course';
    document.getElementById('editCourseId').value = course.id;
    document.getElementById('courseTitle').value = course.title;
    document.getElementById('courseCode').value = course.code || '';
    document.getElementById('courseDesc').value = course.description || '';
    document.getElementById('coursePrice').value = course.price;
    document.getElementById('courseInstructor').value = course.instructor || '';
    document.getElementById('courseDuration').value = course.duration || '';
    document.getElementById('courseLevel').value = course.level || 'Beginner';
    document.getElementById('coursePublished').value = course.published ? '1' : '0';
     currentCourseCover = course.coverImage || '';
    updateCourseCoverPreview();
    if (document.getElementById('courseCoverUrl')) document.getElementById('courseCoverUrl').value = currentCourseCover;
    document.getElementById('moduleManager').style.display = 'block';
    loadModules(course.id);
  } else {
    document.getElementById('courseEditorTitle').innerHTML = '<i class="fas fa-plus" style="color:var(--cyan);margin-right:.5rem;"></i>New Course';
    document.getElementById('editCourseId').value = '';
    document.getElementById('courseTitle').value = '';
    document.getElementById('courseCode').value = '';
    document.getElementById('courseDesc').value = '';
    document.getElementById('coursePrice').value = '';
    document.getElementById('courseInstructor').value = '';
    document.getElementById('courseDuration').value = '';
    document.getElementById('courseLevel').value = 'Beginner';
    document.getElementById('coursePublished').value = '1';
     currentCourseCover = '';
    updateCourseCoverPreview();
    if (document.getElementById('courseCoverUrl')) document.getElementById('courseCoverUrl').value = '';
    document.getElementById('moduleManager').style.display = 'none';
    document.getElementById('moduleList').innerHTML = '';
  }
}

function closeCourseEditor() { document.getElementById('courseEditorView').style.display = 'none'; switchTab('courses'); }

function updateCourseCoverPreview() {
  const el = document.getElementById('courseCoverPreview');
  if (currentCourseCover) {
    el.innerHTML = `<img src="${currentCourseCover}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
  } else {
    el.innerHTML = '<i class="fas fa-image" style="color:var(--muted);opacity:.3;font-size:1.5rem;"></i>';
  }
}

async function handleCourseCoverUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('Max 5MB.', true); return; }
  const b64 = await fileToBase64(file);
  try {
    const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: b64, filename: file.name.replace(/\.[^.]+$/, '') }) });
    const data = await res.json();
     if (data.success) { 
      currentCourseCover = data.url; 
      updateCourseCoverPreview(); 
      if (document.getElementById('courseCoverUrl')) document.getElementById('courseCoverUrl').value = currentCourseCover;
      showToast('Cover uploaded!'); 
    }
    else showToast(data.error || 'Upload failed.', true);
  } catch (err) { showToast('Upload error.', true); }
  e.target.value = '';
}

function removeCourseCover() {
   currentCourseCover = '';
  updateCourseCoverPreview();
  if (document.getElementById('courseCoverUrl')) document.getElementById('courseCoverUrl').value = '';
  showToast('Cover removed.');
}

async function editCourse(id) {
  const res = await fetch('/api/admin/courses'); const courses = await res.json();
  const course = courses.find(c => c.id == id);
  if (course) openCourseEditor(course);
  else showToast('Course not found.', true);
}

async function saveCourse() {
  const id = document.getElementById('editCourseId').value;
  const title = document.getElementById('courseTitle').value.trim();
  if (!title) { showToast('Title required.', true); return; }
  const payload = {
    title, code: document.getElementById('courseCode').value.trim(),
    description: document.getElementById('courseDesc').value.trim(),
    price: parseInt(document.getElementById('coursePrice').value) || 0,
    coverImage: currentCourseCover,
    instructor: document.getElementById('courseInstructor').value.trim(),
    duration: document.getElementById('courseDuration').value.trim(),
    level: document.getElementById('courseLevel').value,
    published: document.getElementById('coursePublished').value === '1'
  };
  try {
    const url = id ? `/api/admin/courses/${id}` : '/api/admin/courses';
    const res = await fetch(url, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) {
      showToast(id ? 'Course updated!' : 'Course created!');
      if (!id && data.id) { document.getElementById('editCourseId').value = data.id; document.getElementById('moduleManager').style.display = 'block'; }
    } else showToast(data.error || 'Failed.', true);
  } catch (e) { showToast('Error.', true); }
}

// Modules
async function loadModules(courseId) {
  try { const res = await fetch(`/api/admin/courses/${courseId}/modules`); renderModules(await res.json(), courseId); } catch (e) { }
}

function renderModules(modules, courseId) {
  const el = document.getElementById('moduleList');
  if (!modules.length) { el.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--muted);font-size:.82rem;">No modules yet.</div>'; return; }
  el.innerHTML = modules.map((m, idx) => `
    <div class="module-block">
      <div class="module-block-header">
        <span class="module-block-title"><i class="fas fa-folder" style="margin-right:.4rem;"></i>${esc(m.title)} <span style="color:var(--muted);font-size:.65rem;font-family:'Share Tech Mono',monospace;margin-left:.4rem;">#${idx + 1}</span></span>
        <div class="module-block-actions">
          <button class="btn-edit btn-reorder-up" data-id="${m.id}" style="width:24px;height:24px;font-size:.6rem;" ${idx === 0 ? 'disabled style="opacity:.3;width:24px;height:24px;font-size:.6rem;cursor:default;"' : ''} title="Move up"><i class="fas fa-chevron-up"></i></button>
          <button class="btn-edit btn-reorder-down" data-id="${m.id}" style="width:24px;height:24px;font-size:.6rem;" ${idx === modules.length - 1 ? 'disabled style="opacity:.3;width:24px;height:24px;font-size:.6rem;cursor:default;"' : ''} title="Move down"><i class="fas fa-chevron-down"></i></button>
          <button class="btn-delete btn-delete-module" data-id="${m.id}" style="width:28px;height:28px;font-size:.7rem;"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <div class="module-block-items">
        ${m.items.map(item => `
          <div class="item-row">
            <span class="item-type ${getItemTypeClass(item.type)}">${getItemTypeLabel(item.type)}</span>
            <span class="item-title">${esc(item.title)}</span>
            ${item.scheduledAt ? `<span style="font-size:.6rem;font-family:'Share Tech Mono',monospace;color:var(--orange);margin-left:.3rem;"><i class="fas fa-clock"></i> ${new Date(item.scheduledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>` : ''}
            <span class="item-link" title="${esc(item.link)}">${esc(item.link).substring(0, 40)}</span>
            ${item.type === 'quiz' ? `<button class="btn-edit btn-quiz-builder" data-id="${item.id}" style="width:auto;height:22px;font-size:.55rem;padding:0 .4rem;" title="Build Quiz"><i class="fas fa-question-circle"></i> Quiz</button>` : ''}
            ${item.type === 'assignment' ? `<button class="btn-edit btn-view-subs" data-id="${item.id}" style="width:auto;height:22px;font-size:.55rem;padding:0 .4rem;" title="View Submissions"><i class="fas fa-file-upload"></i> Subs</button>` : ''}
            <button class="btn-delete btn-delete-item" data-id="${item.id}" style="width:24px;height:24px;font-size:.65rem;"><i class="fas fa-times"></i></button>
          </div>
        `).join('')}
        <div class="add-item-row">
          <select id="itemType-${m.id}"><option value="recorded_class">Recorded</option><option value="live_class">Live Class</option><option value="notes">Notes</option><option value="assignment">Assignment</option><option value="quiz">Quiz</option></select>
          <input type="text" id="itemTitle-${m.id}" placeholder="Item title"/>
          <input type="text" id="itemLink-${m.id}" placeholder="Link (Drive/TeamViewer)"/>
          <input type="datetime-local" id="itemSchedule-${m.id}" placeholder="Schedule" style="display:none;font-size:.7rem;padding:.3rem;background:var(--surface);color:var(--text);border:1px solid rgba(0,255,136,.2);border-radius:4px;"/>
          <button class="btn-add-tag btn-add-item" data-module-id="${m.id}"><i class="fas fa-plus"></i></button>
        </div>
      </div>
    </div>`).join('');
}

async function reorderModule(moduleId, direction, courseId) {
  try {
    await fetch('/api/admin/modules/reorder', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId, direction, courseId })
    });
    loadModules(courseId);
  } catch (e) { showToast('Reorder failed.', true); }
}

async function addModule() {
  const courseId = document.getElementById('editCourseId').value;
  const title = document.getElementById('newModuleTitle').value.trim();
  if (!courseId || !title) { showToast('Enter module title.', true); return; }
  const res = await fetch('/api/admin/modules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId: parseInt(courseId), title }) });
  if ((await res.json()).success) { document.getElementById('newModuleTitle').value = ''; loadModules(courseId); showToast('Module added!'); }
}

async function deleteModule(id, courseId) { if (!confirm('Delete this module?')) return; await fetch(`/api/admin/modules/${id}`, { method: 'DELETE' }); loadModules(courseId); showToast('Deleted.'); }

async function addItem(moduleId, courseId) {
  const type = document.getElementById(`itemType-${moduleId}`).value;
  const title = document.getElementById(`itemTitle-${moduleId}`).value.trim();
  const link = document.getElementById(`itemLink-${moduleId}`).value.trim();
  const scheduleEl = document.getElementById(`itemSchedule-${moduleId}`);
  const scheduledAt = (type === 'live_class' && scheduleEl && scheduleEl.value) ? new Date(scheduleEl.value).toISOString() : null;
  if (!title) { showToast('Title required.', true); return; }
  const res = await fetch('/api/admin/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ moduleId, type, title, link, scheduledAt }) });
  if ((await res.json()).success) { document.getElementById(`itemTitle-${moduleId}`).value = ''; document.getElementById(`itemLink-${moduleId}`).value = ''; if (scheduleEl) scheduleEl.value = ''; loadModules(courseId); showToast('Item added!'); }
}

function toggleScheduleInput(moduleId) {
  const type = document.getElementById(`itemType-${moduleId}`).value;
  const scheduleEl = document.getElementById(`itemSchedule-${moduleId}`);
  if (scheduleEl) scheduleEl.style.display = (type === 'live_class') ? 'block' : 'none';
}

async function deleteItem(id, courseId) { await fetch(`/api/admin/items/${id}`, { method: 'DELETE' }); loadModules(courseId); }
function getItemTypeClass(t) { return ({ live_class: 'tag-red', recorded_class: 'tag-green', notes: 'tag-cyan', assignment: 'tag-orange', quiz: 'tag-purple' })[t] || 'tag-green'; }
function getItemTypeLabel(t) { return ({ live_class: 'LIVE', recorded_class: 'VIDEO', notes: 'NOTES', assignment: 'TASK', quiz: 'QUIZ' })[t] || t; }

async function viewSubmissions(itemId) {
  const subs = await (await fetch(`/api/admin/assignments/${itemId}`)).json();
  const modal = document.createElement('div');
  modal.id = 'submissionsModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
  modal.innerHTML = `<div style="background:var(--surface);border:1px solid rgba(0,255,136,.2);border-radius:12px;padding:1.5rem;max-width:700px;width:100%;max-height:85vh;overflow-y:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
      <h3 style="color:var(--cyan);margin:0;"><i class="fas fa-file-upload"></i> Submissions (${subs.length})</h3>
      <button class="btn-close-modal" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.2rem;"><i class="fas fa-times"></i></button>
    </div>
    ${subs.length ? subs.map(s => `<div style="background:var(--bg);border:1px solid rgba(0,255,136,.08);border-radius:8px;padding:.7rem;margin-bottom:.4rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div><span style="color:var(--green);font-size:.8rem;font-weight:600;">${esc(s.name)}</span> <span style="color:var(--muted);font-size:.65rem;">${esc(s.email)}</span></div>
        <a href="/api/admin/assignments/download/${s.id}" style="font-size:.65rem;color:var(--cyan);text-decoration:none;"><i class="fas fa-download"></i> ${esc(s.fileName)}</a>
      </div>
      <div style="display:flex;gap:.5rem;align-items:center;margin-top:.4rem;">
        <input type="text" id="grade-${s.id}" value="${esc(s.grade || '')}" placeholder="Grade (A+, 85%)" style="flex:1;font-size:.7rem;"/>
        <input type="text" id="feedback-${s.id}" value="${esc(s.feedback || '')}" placeholder="Feedback" style="flex:2;font-size:.7rem;"/>
        <button class="btn-save btn-grade-sub" data-sub-id="${s.id}" data-item-id="${itemId}" style="height:28px;font-size:.65rem;padding:0 .5rem;"><i class="fas fa-check"></i></button>
      </div>
      <div style="font-size:.55rem;color:var(--muted);margin-top:.3rem;font-family:'Share Tech Mono',monospace;">Submitted: ${formatDateTime(s.submittedAt)} ${s.gradedAt ? '| Graded: ' + formatDateTime(s.gradedAt) : ''}</div>
    </div>`).join('') : '<p style="color:var(--muted);text-align:center;padding:2rem;">No submissions yet</p>'}
  </div>`;
  document.body.appendChild(modal);
}

async function gradeSubmission(subId, itemId) {
  const grade = document.getElementById(`grade-${subId}`).value;
  const feedback = document.getElementById(`feedback-${subId}`).value;
  await fetch(`/api/admin/assignments/${subId}/grade`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grade, feedback }) });
  showToast('Graded!'); document.getElementById('submissionsModal').remove(); viewSubmissions(itemId);
}

// ═══════════════════════════════════════
//  STUDENTS
// ═══════════════════════════════════════
async function loadStudents() {
  try {
    const res = await fetch('/api/admin/students');
    allStudents = await res.json();
    document.getElementById('studentCount').textContent = `${allStudents.length} registered · ${allStudents.filter(s => s.emailVerified).length} verified`;
    renderStudentList(allStudents);
  } catch (e) { showToast('Failed to load students.', true); }
}

function filterStudents() {
  const q = document.getElementById('studentSearch').value.toLowerCase().trim();
  if (!q) { renderStudentList(allStudents); return; }
  renderStudentList(allStudents.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)));
}

function renderStudentList(students) {
  const el = document.getElementById('studentList');
  if (!students.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-user-graduate"></i><p>No students found.</p></div>'; return; }
  el.innerHTML = students.map(s => `
    <div class="blog-list-item clickable" data-id="${s.id}">
      <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--green),var(--cyan));display:flex;align-items:center;justify-content:center;font-weight:700;color:#000;font-size:.85rem;flex-shrink:0;">${s.name.charAt(0).toUpperCase()}</div>
      <div class="blog-list-info">
        <div class="blog-list-title">${esc(s.name)}</div>
        <div class="blog-list-meta">
          <span style="color:var(--cyan);">${esc(s.email)}</span>
          ${s.emailVerified ? '<span class="status-verified"><i class="fas fa-check-circle"></i> Verified</span>' : '<span class="status-unverified"><i class="fas fa-clock"></i> Unverified</span>'}
          <span><i class="fas fa-book"></i> ${s.enrollmentCount} courses</span>
          <span>${formatDate(s.createdAt)}</span>
        </div>
      </div>
      <div class="blog-list-actions">
        <button class="btn-edit" title="View Details"><i class="fas fa-eye"></i></button>
      </div>
    </div>`).join('');
}

async function openStudentDetail(studentId) {
  currentStudentId = studentId;
  document.getElementById('tab-students').style.display = 'none';
  document.getElementById('studentDetailView').style.display = 'block';

  // Load student info
  const student = allStudents.find(s => s.id === studentId);
  if (!student) return;

  document.getElementById('studentDetailTitle').innerHTML = `<i class="fas fa-user" style="color:var(--green);margin-right:.5rem;"></i>${esc(student.name)}`;

  // Profile
  document.getElementById('studentProfile').innerHTML = `
    <div class="student-avatar">${student.name.charAt(0).toUpperCase()}</div>
    <div class="student-info">
      <h3>${esc(student.name)}</h3>
      <p>${esc(student.email)}</p>
      <p style="margin-top:.2rem;">Joined ${formatDate(student.createdAt)} · ${student.emailVerified ? '✅ Verified' : '❌ Not verified'}</p>
    </div>
    <div class="student-stats">
      <div class="stat-box"><div class="stat-num">${student.enrollmentCount}</div><div class="stat-label">Courses</div></div>
    </div>`;

  // Load enrolled courses
  await loadStudentEnrollments(studentId);

  // Load available courses for assignment
  await loadAssignableCourses(studentId);

  // Load payment history
  await loadStudentPayments(studentId);
}

async function loadStudentEnrollments(studentId) {
  try {
    const res = await fetch(`/api/admin/students/${studentId}/enrollments`);
    const enrollments = await res.json();
    const el = document.getElementById('studentEnrolledCourses');
    if (!enrollments.length) {
      el.innerHTML = '<p style="color:var(--muted);font-size:.82rem;font-family:Share Tech Mono,monospace;">No courses enrolled yet.</p>';
      return;
    }
    el.innerHTML = enrollments.map(e => `
      <div class="enrolled-course-item">
        <div>
          <div class="enrolled-course-title">${esc(e.courseTitle)} <span style="color:var(--muted);font-size:.7rem;">(${esc(e.courseCode)})</span></div>
          <div class="enrolled-course-meta">Enrolled ${formatDate(e.enrolledAt)} · ${e.paidAmount !== null ? (e.paidAmount === 0 ? '<span class="status-badge source-free-tag">FREE</span>' : `<span class="status-badge source-paid">PAID ₹${e.paidAmount}</span>`) : '<span class="status-badge source-admin">ADMIN ASSIGNED</span>'}</div>
        </div>
        <div style="display:flex;gap:.5rem;">
           <button class="btn-remove-course btn-reset-progress" data-student-id="${studentId}" data-course-id="${e.courseid || e.courseId}" style="background:transparent;color:var(--orange);border:1px solid rgba(255,160,0,.3);"><i class="fas fa-undo"></i> Reset Progress</button>
           <button class="btn-remove-course" data-enrollment-id="${e.enrollmentId || e.enrollmentid}" data-student-id="${studentId}"><i class="fas fa-times"></i> Remove</button>
        </div>
      </div>`).join('');
  } catch (e) { }
}

async function resetStudentProgress(studentId, courseId) {
  if (!confirm("Are you sure you want to completely RESET this student's progress for this course? This will delete all quiz attempts and assignments.")) return;
  try {
    const res = await fetch(`/api/admin/students/${studentId}/progress/${courseId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Student course progress fully reset.');
    } else {
      const d = await res.json();
      showToast(d.error || 'Failed to reset progress', true);
    }
  } catch (e) { showToast('Network error', true); }
}

async function loadAssignableCourses(studentId) {
  try {
    const res = await fetch('/api/admin/courses');
    const courses = await res.json();
    const enrollRes = await fetch(`/api/admin/students/${studentId}/enrollments`);
    const enrollments = await enrollRes.json();
    const enrolledIds = new Set(enrollments.map(e => e.courseId));

    const available = courses.filter(c => !enrolledIds.has(c.id));
    const sel = document.getElementById('assignCourseSelect');
    if (!available.length) {
      sel.innerHTML = '<option disabled selected>All courses assigned</option>';
      return;
    }
    sel.innerHTML = available.map(c => `<option value="${c.id}">${esc(c.title)} (${c.code}) — ${c.price === 0 ? 'Free' : '₹' + c.price}</option>`).join('');
  } catch (e) { }
}

async function assignCourseToStudent() {
  const courseId = document.getElementById('assignCourseSelect').value;
  if (!courseId || !currentStudentId) return;
  try {
    const student = allStudents.find(s => s.id === currentStudentId);
    const res = await fetch('/api/admin/enrollments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentEmail: student.email, courseId: parseInt(courseId) })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Course assigned!');
      // Update stats
      student.enrollmentCount = (student.enrollmentCount || 0) + 1;
      await loadStudentEnrollments(currentStudentId);
      await loadAssignableCourses(currentStudentId);
      // Update profile stat
      document.querySelector('.stat-num').textContent = student.enrollmentCount;
    } else showToast(data.error || 'Failed.', true);
  } catch (e) { showToast('Error.', true); }
}

async function removeCourseFromStudent(enrollmentId, studentId) {
  if (!confirm('Remove this enrollment?')) return;
  await fetch(`/api/admin/enrollments/${enrollmentId}`, { method: 'DELETE' });
  showToast('Enrollment removed.');
  const student = allStudents.find(s => s.id === studentId);
  if (student) student.enrollmentCount = Math.max(0, (student.enrollmentCount || 1) - 1);
  await loadStudentEnrollments(studentId);
  await loadAssignableCourses(studentId);
  const statEl = document.querySelector('.stat-num');
  if (statEl && student) statEl.textContent = student.enrollmentCount;
}

async function loadStudentPayments(studentId) {
  try {
    const res = await fetch(`/api/admin/students/${studentId}/payments`);
    const payments = await res.json();
    const el = document.getElementById('studentPayments');
    if (!payments.length) { el.innerHTML = '<p style="color:var(--muted);font-size:.82rem;font-family:Share Tech Mono,monospace;">No payment history.</p>'; return; }
    el.innerHTML = `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Course</th><th>Amount</th><th>Status</th><th>Date</th><th>Payment ID</th></tr></thead><tbody>${payments.map(p => `
      <tr><td>${esc(p.courseTitle)}</td><td>${p.amount === 0 ? 'Free' : '₹' + p.amount}</td>
      <td><span class="status-badge status-${p.status}">${p.status}</span></td>
      <td>${formatDate(p.createdAt)}</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:.65rem;">${esc(p.razorpayPaymentId || '-')}</td></tr>`).join('')}</tbody></table></div>`;
  } catch (e) { }
}

function closeStudentDetail() {
  document.getElementById('studentDetailView').style.display = 'none';
  currentStudentId = null;
  switchTab('students');
}

// ═══════════════════════════════════════
//  ENROLLMENTS
// ═══════════════════════════════════════
async function loadEnrollments() {
  try {
    const res = await fetch('/api/admin/enrollments');
    const data = await res.json();
    document.getElementById('enrollmentCount').textContent = `${data.length} enrollments`;
    document.getElementById('enrollmentBody').innerHTML = data.length ? data.map(e => `
      <tr>
        <td><a href="#" class="student-link" data-id="${e.studentId}" style="color:var(--green);text-decoration:none;font-weight:600;">${esc(e.studentName)}</a></td>
        <td>${esc(e.studentEmail)}</td>
        <td>${esc(e.courseTitle)} <span style="color:var(--muted);font-size:.65rem;">(${esc(e.courseCode)})</span></td>
        <td>${e.paidAmount !== null ? (e.paidAmount === 0 ? '<span class="status-badge source-free-tag">FREE</span>' : `<span class="status-badge source-paid">PAID</span>`) : '<span class="status-badge source-admin">ADMIN</span>'}</td>
        <td>${formatDate(e.enrolledAt)}</td>
        <td><button class="btn-delete" data-id="${e.id}" style="width:24px;height:24px;font-size:.65rem;"><i class="fas fa-times"></i></button></td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem;">No enrollments yet.</td></tr>';

    // Load courses for manual enroll
    const cRes = await fetch('/api/admin/courses');
    const courses = await cRes.json();
    document.getElementById('enrollCourseSelect').innerHTML = courses.map(c => `<option value="${c.id}">${esc(c.title)} (${c.code})</option>`).join('');
  } catch (e) { showToast('Failed.', true); }
}

function showManualEnrollForm() { const el = document.getElementById('manualEnrollForm'); el.style.display = el.style.display === 'none' ? 'block' : 'none'; }

async function manualEnroll() {
  const email = document.getElementById('enrollEmail').value.trim();
  const courseId = document.getElementById('enrollCourseSelect').value;
  if (!email || !courseId) { showToast('Fill both fields.', true); return; }
  try {
    const res = await fetch('/api/admin/enrollments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentEmail: email, courseId: parseInt(courseId) }) });
    const data = await res.json();
    if (data.success) { showToast('Student enrolled!'); document.getElementById('enrollEmail').value = ''; loadEnrollments(); }
    else showToast(data.error || 'Failed.', true);
  } catch (e) { showToast('Error.', true); }
}

async function deleteEnrollment(id) {
  if (!confirm('Remove this enrollment?')) return;
  await fetch(`/api/admin/enrollments/${id}`, { method: 'DELETE' });
  showToast('Removed.');
  loadEnrollments();
}

// ═══════════════════════════════════════
//  PAYMENTS
// ═══════════════════════════════════════
async function loadPayments() {
  try {
    const res = await fetch('/api/admin/payments');
    allPayments = await res.json();
    const total = allPayments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
    const free = allPayments.filter(p => p.status === 'free').length;
    const pending = allPayments.filter(p => p.status === 'pending').length;
    document.getElementById('paymentCount').textContent = `${allPayments.length} payments`;
    document.getElementById('paymentStats').innerHTML = `
      <div class="payment-stat-card" style="cursor:pointer;" data-status="all"><div class="stat-num" style="color:var(--green);">₹${total.toLocaleString()}</div><div class="stat-label">Total Revenue</div></div>
      <div class="payment-stat-card" style="cursor:pointer;" data-status="completed"><div class="stat-num" style="color:var(--cyan);">${allPayments.filter(p => p.status === 'completed').length}</div><div class="stat-label">Paid Orders</div></div>
      <div class="payment-stat-card" style="cursor:pointer;" data-status="free"><div class="stat-num" style="color:var(--cyan);">${free}</div><div class="stat-label">Free Enrolls</div></div>
      <div class="payment-stat-card" style="cursor:pointer;" data-status="pending"><div class="stat-num" style="color:#ffaa00;">${pending}</div><div class="stat-label">Pending</div></div>`;

    filterPayments('all');
  } catch (e) { showToast('Failed.', true); }
}

function filterPayments(status) {
  let displayData = allPayments;
  if (status !== 'all') {
    displayData = allPayments.filter(p => p.status === status);
  }
  document.getElementById('paymentBody').innerHTML = displayData.length ? displayData.map(p => `
    <tr>
      <td>${esc(p.studentName)}<br><span style="font-size:.65rem;color:var(--muted);">${esc(p.studentEmail)}</span></td>
      <td>${esc(p.courseTitle)}</td>
      <td>${p.amount === 0 ? 'Free' : '₹' + p.amount}</td>
      <td><span class="status-badge status-${p.status}">${p.status}</span></td>
      <td>${formatDate(p.createdAt)}</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:.65rem;">${esc(p.razorpayPaymentId || '-')}</td>
    </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem;">No ${status === 'all' ? '' : status + ' '}payments found.</td></tr>`;
}

// ═══════════════════════════════════════
//  MESSAGES
// ═══════════════════════════════════════
async function loadMessages() {
  try {
    const res = await fetch('/api/admin/messages');
    const data = await res.json();
    document.getElementById('messageCount').textContent = `${data.length} messages`;
    const el = document.getElementById('messageList');
    if (!data.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No messages yet.</p></div>'; return; }
    el.innerHTML = data.map(m => `
      <div class="message-card blog-list-item" style="flex-direction:column;align-items:stretch;">
        <div class="message-header">
          <span class="message-from"><i class="fas fa-user" style="margin-right:.3rem;font-size:.75rem;"></i>${esc(m.name)}</span>
          <span class="message-date">${formatDate(m.createdAt)}</span>
        </div>
        <div class="message-email">${esc(m.email)}</div>
        ${m.subject ? `<div class="message-subject">${esc(m.subject)}</div>` : ''}
        <div class="message-body">${esc(m.message)}</div>
      </div>`).join('');
  } catch (e) { showToast('Failed.', true); }
}

// ═══════════════════════════════════════
//  SECURITY LOGS
// ═══════════════════════════════════════
async function loadSecurityLogs() {
  try {
    const res = await fetch('/api/admin/security-logs');
    const data = await res.json();
    document.getElementById('securityCount').textContent = `Last ${data.length} events`;
    document.getElementById('securityBody').innerHTML = data.length ? data.map(l => `
      <tr>
        <td><span class="status-badge ${getEventClass(l.event)}" style="font-size:.58rem;">${l.event}</span></td>
        <td style="font-family:'Share Tech Mono',monospace;font-size:.72rem;">${esc(l.ip)}</td>
        <td style="font-size:.78rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;">${esc(l.details)}</td>
        <td style="font-size:.72rem;">${formatDateTime(l.createdAt)}</td>
      </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:2rem;">No security events.</td></tr>';
  } catch (e) { showToast('Failed.', true); }
}

function getEventClass(event) {
  if (event.includes('OK') || event.includes('VERIFIED')) return 'status-completed';
  if (event.includes('FAIL') || event.includes('TAMPER') || event.includes('LOCKED')) return 'status-badge-red';
  if (event.includes('RATE_LIMIT')) return 'status-pending';
  if (event.includes('SIGNUP') || event.includes('LOGOUT')) return 'source-free-tag';
  return 'source-admin';
}

// ─── DELETE MODAL ───
function openDeleteModal(id, type) { deleteTargetId = id; deleteTargetType = type; document.getElementById('deleteModal').style.display = 'flex'; }
function closeDeleteModal() { deleteTargetId = null; deleteTargetType = ''; document.getElementById('deleteModal').style.display = 'none'; }

async function confirmDelete() {
  if (!deleteTargetId) return;
  let url = '';
  switch (deleteTargetType) {
    case 'blog': url = `/api/admin/blogs/${deleteTargetId}`; break;
    case 'works': url = `/api/admin/works/${deleteTargetId}`; break;
    case 'videos': url = `/api/admin/videos/${deleteTargetId}`; break;
    case 'job': url = `/api/admin/jobs/${deleteTargetId}`; break;
  }
  if (url) { await fetch(url, { method: 'DELETE' }); showToast('Deleted.'); switchTab(currentTab); }
  closeDeleteModal();
}

// ─── UTILS ───
function showToast(msg, err = false) { const e = document.getElementById('toast'); e.textContent = msg; e.className = 'toast show' + (err ? ' error' : ''); setTimeout(() => { e.className = 'toast'; }, 3000); }
function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function formatDate(d) { if (!d) return ''; return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function formatDateTime(d) { if (!d) return ''; const dt = new Date(d); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); }

// ═══════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════
async function loadAnalytics() {
  try {
    const data = await (await fetch('/api/admin/analytics')).json();
    document.getElementById('analyticsCards').innerHTML = [
      { icon: 'fa-user-graduate', label: 'Students', value: data.totalStudents, color: '#00ff88' },
      { icon: 'fa-book', label: 'Courses', value: data.totalCourses, color: '#00d4ff' },
      { icon: 'fa-link', label: 'Enrollments', value: data.totalEnrollments, color: '#ffa000' },
      { icon: 'fa-rupee-sign', label: 'Revenue', value: `₹${data.totalRevenue}`, color: '#a855f7' }
    ].map(c => `<div style="background:var(--surface);border:1px solid ${c.color}22;border-radius:10px;padding:1.2rem;text-align:center;">
      <i class="fas ${c.icon}" style="font-size:1.5rem;color:${c.color};margin-bottom:.5rem;display:block;"></i>
      <div style="font-size:1.8rem;font-weight:700;color:${c.color};font-family:'Share Tech Mono',monospace;">${c.value}</div>
      <div style="font-size:.7rem;color:var(--muted);margin-top:.3rem;">${c.label}</div>
    </div>`).join('');
    document.getElementById('popularCourses').innerHTML = data.popularCourses.map((c, i) => `<div style="display:flex;align-items:center;gap:.6rem;padding:.5rem;border-bottom:1px solid rgba(255,255,255,.05);">
      <span style="color:var(--green);font-weight:700;font-size:.8rem;">#${i + 1}</span>
      <span style="flex:1;font-size:.8rem;">${esc(c.title)}</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:.75rem;color:var(--cyan);">${c.enrollCount} enrolled</span>
    </div>`).join('') || '<p style="color:var(--muted);font-size:.8rem;">No courses yet</p>';
    document.getElementById('recentEnrollments').innerHTML = data.recentEnrollments.map(e => `<div style="display:flex;align-items:center;gap:.6rem;padding:.4rem;border-bottom:1px solid rgba(255,255,255,.05);font-size:.75rem;">
      <span style="color:var(--green);">${esc(e.name)}</span>
      <span style="color:var(--muted);flex:1;">${esc(e.courseTitle)}</span>
      <span style="font-family:'Share Tech Mono',monospace;color:var(--muted);font-size:.65rem;">${formatDate(e.enrolledAt)}</span>
    </div>`).join('') || '<p style="color:var(--muted);font-size:.8rem;">No enrollments yet</p>';
  } catch (e) { showToast('Failed to load analytics.', true); }
}

// ═══════════════════════════════════════
//  COUPONS
// ═══════════════════════════════════════
function toggleCouponForm() { const f = document.getElementById('couponForm'); f.style.display = f.style.display === 'none' ? 'block' : 'none'; }

async function loadCoupons() {
  const coupons = await (await fetch('/api/admin/coupons')).json();
  document.getElementById('couponCount').textContent = `${coupons.length} coupon(s)`;
  document.getElementById('couponList').innerHTML = coupons.map(c => `<div style="display:flex;align-items:center;gap:.8rem;padding:.7rem;background:var(--surface);border:1px solid rgba(255,160,0,.1);border-radius:8px;margin-bottom:.5rem;">
    <span style="font-family:'Share Tech Mono',monospace;font-weight:700;color:var(--orange);font-size:.85rem;letter-spacing:1px;">${esc(c.code)}</span>
    <span style="font-size:.75rem;color:var(--text);">${c.discountType === 'percent' ? c.discountValue + '%' : '₹' + c.discountValue} off</span>
    <span style="font-size:.65rem;color:var(--muted);">${c.usedCount}/${c.maxUses} used</span>
    <span style="flex:1;"></span>
    <button class="btn-delete" data-id="${c.id}" style="width:24px;height:24px;font-size:.65rem;"><i class="fas fa-times"></i></button>
  </div>`).join('') || '<p style="color:var(--muted);text-align:center;padding:2rem;">No coupons yet</p>';
}

async function saveCoupon() {
  const code = document.getElementById('couponCode').value.trim();
  if (!code) { showToast('Enter coupon code.', true); return; }
  const res = await fetch('/api/admin/coupons', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, discountType: document.getElementById('couponType').value, discountValue: parseInt(document.getElementById('couponValue').value), maxUses: parseInt(document.getElementById('couponMaxUses').value) })
  });
  if ((await res.json()).success) { document.getElementById('couponCode').value = ''; loadCoupons(); showToast('Coupon created!'); document.getElementById('couponForm').style.display = 'none'; }
  else showToast('Failed. Code may already exist.', true);
}

async function deleteCoupon(id) { if (!confirm('Delete coupon?')) return; await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' }); loadCoupons(); showToast('Deleted.'); }

// ═══════════════════════════════════════
//  ANNOUNCEMENTS
// ═══════════════════════════════════════
function toggleAnnouncementForm() {
  const f = document.getElementById('announcementForm');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
  if (f.style.display === 'block') loadAnnouncementCourses();
}

async function loadAnnouncementCourses() {
  const courses = await (await fetch('/api/admin/courses')).json();
  const sel = document.getElementById('annCourseId');
  sel.innerHTML = '<option value="">All students (global)</option>' + courses.map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join('');
}

async function loadAnnouncements() {
  const anns = await (await fetch('/api/admin/announcements')).json();
  document.getElementById('announcementCount').textContent = `${anns.length} announcement(s)`;
  document.getElementById('announcementList').innerHTML = anns.map(a => `<div style="background:var(--surface);border:1px solid rgba(168,85,247,.1);border-radius:8px;padding:.8rem;margin-bottom:.5rem;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem;">
      <span style="font-weight:600;color:var(--text);font-size:.85rem;">${esc(a.title)}</span>
      <button class="btn-delete" data-id="${a.id}" style="width:22px;height:22px;font-size:.6rem;"><i class="fas fa-times"></i></button>
    </div>
    <p style="font-size:.75rem;color:var(--muted);margin:0;">${esc(a.message)}</p>
    <div style="font-size:.6rem;color:var(--muted);margin-top:.3rem;font-family:'Share Tech Mono',monospace;">${a.courseTitle ? '📚 ' + esc(a.courseTitle) : '🌐 Global'} • ${formatDate(a.createdAt)}</div>
  </div>`).join('') || '<p style="color:var(--muted);text-align:center;padding:2rem;">No announcements yet</p>';
}

async function saveAnnouncement() {
  const title = document.getElementById('annTitle').value.trim();
  const message = document.getElementById('annMessage').value.trim();
  if (!title || !message) { showToast('Title and message required.', true); return; }
  const courseId = document.getElementById('annCourseId').value || null;
  const res = await fetch('/api/admin/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, message, courseId }) });
  if ((await res.json()).success) { document.getElementById('annTitle').value = ''; document.getElementById('annMessage').value = ''; loadAnnouncements(); showToast('Announcement sent!'); document.getElementById('announcementForm').style.display = 'none'; }
}

async function deleteAnnouncement(id) { if (!confirm('Delete?')) return; await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' }); loadAnnouncements(); showToast('Deleted.'); }

// ═══════════════════════════════════════
//  QUIZ BUILDER
// ═══════════════════════════════════════
let quizQuestions = [];

async function openQuizBuilder(itemId) {
  const data = await (await fetch(`/api/admin/quizzes/${itemId}`)).json();
  quizQuestions = data.questions.length ? data.questions : [{ question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: 'A' }];
  const passing = data.quiz?.passingPercent || data.quiz?.passingpercent || 60;
  const maxAttempts = data.quiz?.maxAttempts || data.quiz?.maxattempts || 3;
  const timerMinutes = data.quiz?.timerMinutes || data.quiz?.timerminutes || 0;
  const modal = document.createElement('div');
  modal.id = 'quizBuilderModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
  modal.innerHTML = `<div style="background:var(--surface);border:1px solid rgba(0,255,136,.2);border-radius:12px;padding:1.5rem;max-width:700px;width:100%;max-height:85vh;overflow-y:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
      <h3 style="color:var(--green);margin:0;"><i class="fas fa-question-circle"></i> Quiz Builder</h3>
      <button class="btn-close-modal" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.2rem;"><i class="fas fa-times"></i></button>
    </div>
    <div style="display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap;">
      <div><label style="font-size:.65rem;color:var(--muted);">Pass %</label><input type="number" id="quizPassPercent" value="${passing}" style="width:60px;"/></div>
      <div><label style="font-size:.65rem;color:var(--muted);">Max Attempts</label><input type="number" id="quizMaxAttempts" value="${maxAttempts}" style="width:60px;"/></div>
      <div><label style="font-size:.65rem;color:var(--muted);">Timer (min)</label><input type="number" id="quizTimerMinutes" value="${timerMinutes}" min="0" placeholder="0 = none" style="width:70px;"/></div>
    </div>
    <div id="quizQuestionsContainer"></div>
    <div style="display:flex;gap:.5rem;margin-top:1rem;">
      <button class="btn-add-tag btn-add-quiz-q" style="flex:1;"><i class="fas fa-plus"></i> Add Question</button>
      <button class="btn-save btn-save-quiz" data-id="${itemId}" style="flex:1;"><i class="fas fa-save"></i> Save Quiz</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  renderQuizQuestions();
}

function renderQuizQuestions() {
  document.getElementById('quizQuestionsContainer').innerHTML = quizQuestions.map((q, i) => `<div style="background:var(--bg);border:1px solid rgba(0,255,136,.1);border-radius:8px;padding:.8rem;margin-bottom:.5rem;" data-index="${i}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;">
      <span style="font-size:.7rem;color:var(--green);font-weight:700;">Q${i + 1}</span>
      ${quizQuestions.length > 1 ? `<button class="btn-remove-quiz-q" data-index="${i}" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.7rem;"><i class="fas fa-trash"></i></button>` : ''}
    </div>
    <input type="text" value="${esc(q.question)}" placeholder="Question text" style="width:100%;margin-bottom:.4rem;font-size:.8rem;"/>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem;">
      <input type="text" value="${esc(q.optionA)}" placeholder="A)" style="font-size:.75rem;"/>
      <input type="text" value="${esc(q.optionB)}" placeholder="B)" style="font-size:.75rem;"/>
      <input type="text" value="${esc(q.optionC || '')}" placeholder="C) (optional)" style="font-size:.75rem;"/>
      <input type="text" value="${esc(q.optionD || '')}" placeholder="D) (optional)" style="font-size:.75rem;"/>
    </div>
    <div style="margin-top:.3rem;"><label style="font-size:.6rem;color:var(--muted);">Correct:</label>
      <select style="font-size:.7rem;">
        <option value="A" ${q.correctOption === 'A' ? 'selected' : ''}>A</option>
        <option value="B" ${q.correctOption === 'B' ? 'selected' : ''}>B</option>
        <option value="C" ${q.correctOption === 'C' ? 'selected' : ''}>C</option>
        <option value="D" ${q.correctOption === 'D' ? 'selected' : ''}>D</option>
      </select>
    </div>
  </div>`).join('');
}

function addQuizQuestion() { quizQuestions.push({ question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: 'A' }); renderQuizQuestions(); }
function removeQuizQuestion(i) { quizQuestions.splice(i, 1); renderQuizQuestions(); }

async function saveQuiz(itemId) {
  const valid = quizQuestions.filter(q => q.question && q.optionA && q.optionB);
  if (!valid.length) { showToast('Add at least one question with A and B options.', true); return; }
  const res = await fetch('/api/admin/quizzes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, passingPercent: parseInt(document.getElementById('quizPassPercent').value) || 60, maxAttempts: parseInt(document.getElementById('quizMaxAttempts').value) || 3, timerMinutes: parseInt(document.getElementById('quizTimerMinutes').value) || 0, questions: valid })
  });
  if ((await res.json()).success) { showToast('Quiz saved!'); document.getElementById('quizBuilderModal')?.remove(); }
  else showToast('Failed to save quiz.', true);
}

// ═══════════════════════════════════════
//  ASSIGNMENTS
// ═══════════════════════════════════════
let allAssignments = [];

async function loadAssignments() {
  try {
    const res = await fetch('/api/admin/assignments/all');
    if (res.status === 401) return handleLogout();
    allAssignments = await res.json();

    // Extract unique courses for the filter dropdown
    const courses = [...new Set(allAssignments.map(a => a.courseTitle))].sort();
    const filterEl = document.getElementById('assignmentCourseFilter');
    const currVal = filterEl.value;
    filterEl.innerHTML = '<option value="">All Courses</option>' + courses.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    if (courses.includes(currVal)) filterEl.value = currVal;

    filterAssignments();
  } catch (e) { }
}

function filterAssignments() {
  const courseFilter = document.getElementById('assignmentCourseFilter').value;
  const filtered = courseFilter ? allAssignments.filter(a => a.courseTitle === courseFilter) : allAssignments;

  document.getElementById('assignmentCount').textContent = `${filtered.length} Total Submissions`;
  const list = document.getElementById('assignmentList');

  if (!filtered.length) { list.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i><p>No assignments found.</p></div>'; return; }

  list.innerHTML = filtered.map(a => `
    <div style="background:var(--surface);border:1px solid rgba(0,212,255,.15);border-radius:8px;padding:1rem;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem;">
        <div>
           <h3 style="color:var(--cyan);font-size:.9rem;margin-bottom:.2rem;">${esc(a.studentName)} (${esc(a.studentEmail)})</h3>
           <div style="font-size:.7rem;color:var(--muted);"><i class="fas fa-book"></i> ${esc(a.courseTitle)} > ${esc(a.itemTitle)}</div>
        </div>
        <div style="text-align:right;">
           <div style="font-size:.7rem;color:var(--muted);margin-bottom:.3rem;">Submitted: ${new Date(a.submittedAt).toLocaleString('en-IN')}</div>
           <a href="/api/admin/assignments/download/${a.id}" class="btn-primary" style="padding:.3rem .6rem;font-size:.7rem;text-decoration:none;display:inline-block;"><i class="fas fa-download"></i> Download</a>
        </div>
      </div>
      <div style="padding-top:.8rem;border-top:1px solid var(--border);margin-top:.5rem;">
         ${a.grade ? `
            <div style="display:flex;gap:1rem;font-size:.8rem;">
               <span style="color:var(--green);font-weight:700;">Grade: ${esc(a.grade)}</span>
               <span style="color:var(--muted);font-style:italic;">"${esc(a.feedback || '')}"</span>
            </div>
         ` : `
            <div style="display:flex;gap:.5rem;align-items:center;">
                <input type="text" id="grade-${a.id}" placeholder="Grade (e.g. A, 95/100)" style="width:140px;padding:.4rem;font-size:.75rem;border:1px solid var(--border);background:var(--bg);color:var(--text);border-radius:4px;" />
                <input type="text" id="feedback-${a.id}" placeholder="Feedback..." style="flex:1;padding:.4rem;font-size:.75rem;border:1px solid var(--border);background:var(--bg);color:var(--text);border-radius:4px;" />
                <button class="btn-save-grade" data-id="${a.id}" style="padding:.4rem .8rem;background:var(--cyan);color:#0B0F19;border:none;border-radius:4px;cursor:pointer;font-weight:700;font-size:.75rem;"><i class="fas fa-check"></i> Submit Grade</button>
            </div>
         `}
      </div>
    </div>
  `).join('');
}

async function saveGrade(id) {
  const grade = document.getElementById(`grade-${id}`).value.trim();
  const feedback = document.getElementById(`feedback-${id}`).value.trim();
  if (!grade) return showToast('Grade is required', true);
  try {
    const res = await fetch(`/api/admin/assignments/${id}/grade`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade, feedback })
    });
    if (res.ok) {
      showToast('Grade saved');
      loadAssignments();
    } else {
      const d = await res.json();
      showToast(d.error || 'Error saving grade', true);
    }
  } catch (e) { showToast('Network error', true); }
}

// ═══════════════════════════════════════
//  WORKS
// ═══════════════════════════════════════
let currentWorkId = null;

async function loadWorks() {
  try {
    const res = await fetch('/api/admin/works');
    if (res.status === 401) return handleLogout();
    const works = await res.json();
    document.getElementById('worksCount').textContent = `${works.length} Projects`;
    const list = document.getElementById('worksList');
    list.innerHTML = works.map(w => `
      <tr>
         <td>
            <div style="display:flex;align-items:center;gap:.8rem;">
               <div style="width:36px;height:36px;border-radius:8px;background:var(--surface);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);">
                  <i class="${esc(w.icon)}" style="color:var(--${esc(w.iconColor)});font-size:1.1rem;"></i>
               </div>
               <div>
                  <div style="font-family:'Rajdhani',sans-serif;font-weight:700;color:#fff;">${esc(w.title)} ${w.featured ? '<span class="status-published" style="display:inline-block;padding:2px 6px;font-size:10px;"><i class="fas fa-star"></i> FEATURED</span>' : ''}</div>
                  <div style="font-size:.65rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">${esc(w.description)}</div>
               </div>
            </div>
         </td>
         <td>
            <span style="font-size:.7rem;padding:.2rem .5rem;border-radius:4px;border:1px solid rgba(255,255,255,.1);">${esc(w.status)}</span>
         </td>
         <td><div style="display:flex;gap:.3rem;flex-wrap:wrap;">${(w.tags || []).map(t => `<span class="tag tag-cyan" style="font-size:.6rem;">${esc(t)}</span>`).join('')}</div></td>
         <td>
            <div class="action-btns">
               <button class="btn-edit" data-id="${w.id}" title="Edit"><i class="fas fa-edit"></i></button>
               <button class="btn-delete" data-id="${w.id}" data-type="works" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
         </td>
      </tr>
    `).join('');
    if (!works.length) list.innerHTML = '<tr><td colspan="4" class="empty-state">No works found.</td></tr>';
  } catch (e) { showToast('Failed to load works.', true); }
}

function openWorkEditor(work = null) {
  currentWorkId = work ? work.id : null;
  if (work) {
    document.getElementById('workEditorTitle').textContent = 'Edit Work';
    document.getElementById('editWorkId').value = work.id;
    document.getElementById('workTitle').value = work.title;
    document.getElementById('workDescription').value = work.description;
    document.getElementById('workIcon').value = work.icon;
    document.getElementById('workIconColor').value = work.iconColor;
    document.getElementById('workStatus').value = work.status;
    document.getElementById('workTags').value = (work.tags || []).join(', ');
    document.getElementById('workLink').value = work.link || '';
    document.getElementById('workFeatured').checked = !!work.featured;
  } else {
    document.getElementById('workEditorTitle').textContent = 'Add Project';
    document.getElementById('editWorkId').value = '';
    document.getElementById('workTitle').value = '';
    document.getElementById('workDescription').value = '';
    document.getElementById('workIcon').value = 'fas fa-cog';
    document.getElementById('workIconColor').value = 'cyan';
    document.getElementById('workStatus').value = 'Completed';
    document.getElementById('workTags').value = '';
    document.getElementById('workLink').value = '';
    document.getElementById('workFeatured').checked = false;
  }

  document.getElementById('worksListView').style.display = 'none';
  document.getElementById('workEditorView').style.display = 'block';
}

function closeWorkEditor() {
  document.getElementById('workEditorView').style.display = 'none';
  document.getElementById('worksListView').style.display = 'block';
}

async function editWork(id) {
  const res = await fetch('/api/admin/works');
  const works = await res.json();
  const work = works.find(w => w.id == id);
  if (work) openWorkEditor(work);
}

async function saveWork() {
  const title = document.getElementById('workTitle').value.trim();
  if (!title) { showToast('Title required.', true); return; }

  const description = document.getElementById('workDescription').value.trim();
  const icon = document.getElementById('workIcon').value.trim() || 'fas fa-cog';
  const iconColor = document.getElementById('workIconColor').value;
  const status = document.getElementById('workStatus').value;
  const tags = document.getElementById('workTags').value.split(',').map(t => t.trim()).filter(t => t);
  const link = document.getElementById('workLink').value;
  const featured = document.getElementById('workFeatured').checked;
  const id = document.getElementById('editWorkId').value;

  try {
    const res = await fetch(id ? `/api/admin/works/${id}` : '/api/admin/works', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, icon, iconColor, status, tags, link, featured })
    });
    const data = await res.json();
    if (data.success) { showToast('Work saved!'); closeWorkEditor(); loadWorks(); }
    else showToast(data.error || 'Failed to save.', true);
  } catch (e) { showToast('Connection error.', true); }
}


// ═══════════════════════════════════════
//  VIDEOS
// ═══════════════════════════════════════
let currentVideoId = null;

async function loadVideos() {
  try {
    const res = await fetch('/api/admin/videos');
    if (res.status === 401) return handleLogout();
    const videos = await res.json();
    document.getElementById('videosCount').textContent = `${videos.length} Videos`;
    const list = document.getElementById('videosList');
    list.innerHTML = videos.map(v => `
      <tr>
         <td style="width:120px;">
            <div style="width:100px;height:56px;border-radius:6px;overflow:hidden;background:#000;border:1px solid var(--border);">
               <img src="https://img.youtube.com/vi/${esc(v.videoId || v.videoid)}/mqdefault.jpg" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'#111\\'/></svg>'"/>
            </div>
         </td>
         <td>
            <div style="font-family:'Rajdhani',sans-serif;font-weight:700;color:#fff;">${esc(v.title)} ${v.featured ? '<span class="status-published" style="display:inline-block;padding:2px 6px;font-size:10px;"><i class="fas fa-star"></i> FEATURED</span>' : ''}</div>
            <div style="font-size:.65rem;color:var(--muted);"><i class="fab fa-youtube" style="color:#ff0000;margin-right:4px;"></i>${esc(v.videoId || v.videoid)}</div>
         </td>
         <td>
            <div style="font-size:.7rem;color:var(--muted);">${esc(v.meta)}</div>
            <span class="tag tag-red" style="font-size:.6rem;margin-top:4px;">${esc(v.tag)}</span>
         </td>
         <td>
            <div class="action-btns">
               <button class="btn-edit" data-id="${v.id}" title="Edit"><i class="fas fa-edit"></i></button>
               <button class="btn-delete" data-id="${v.id}" data-type="videos" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
         </td>
      </tr>
    `).join('');
    if (!videos.length) list.innerHTML = '<tr><td colspan="4" class="empty-state">No videos found.</td></tr>';
  } catch (e) { showToast('Failed to load videos.', true); }
}

function openVideoEditor(video = null) {
  currentVideoId = video ? video.id : null;
  if (video) {
    document.getElementById('videoEditorTitle').textContent = 'Edit Video';
    document.getElementById('editVideoId').value = video.id;
    document.getElementById('videoYtId').value = video.videoId || video.videoid;
    document.getElementById('videoTitle').value = video.title;
    document.getElementById('videoMeta').value = video.meta;
    document.getElementById('videoTag').value = video.tag || '';
    document.getElementById('videoFeatured').checked = !!video.featured;
  } else {
    document.getElementById('videoEditorTitle').textContent = 'Add Video';
    document.getElementById('editVideoId').value = '';
    document.getElementById('videoYtId').value = '';
    document.getElementById('videoTitle').value = '';
    document.getElementById('videoMeta').value = '';
    document.getElementById('videoTag').value = '';
    document.getElementById('videoFeatured').checked = false;
  }

  document.getElementById('videosListView').style.display = 'none';
  document.getElementById('videoEditorView').style.display = 'block';
}

function closeVideoEditor() {
  document.getElementById('videoEditorView').style.display = 'none';
  document.getElementById('videosListView').style.display = 'block';
}

async function editVideo(id) {
  const res = await fetch('/api/admin/videos');
  const videos = await res.json();
  const video = videos.find(v => v.id == id);
  if (video) openVideoEditor(video);
}

async function saveVideo() {
  const title = document.getElementById('videoTitle').value.trim();
  const videoId = document.getElementById('videoYtId').value.trim();
  if (!title || !videoId) { showToast('Title and Video ID required.', true); return; }

  const payload = {
    title,
    videoId: videoId.replace('https://youtube.com/watch?v=', '').replace('https://youtu.be/', '').split('&')[0], // Extract just the ID if full URL pasted
    meta: document.getElementById('videoMeta').value.trim(),
    tag: document.getElementById('videoTag').value.trim(),
    featured: document.getElementById('videoFeatured').checked
  };

  try {
    const method = currentVideoId ? 'PUT' : 'POST';
    const url = currentVideoId ? `/api/admin/videos/${currentVideoId}` : '/api/admin/videos';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) { showToast('Video saved!'); closeVideoEditor(); loadVideos(); }
    else showToast(data.error || 'Failed to save.', true);
  } catch (e) { showToast('Connection error.', true); }
}

// ═══════════════════════════════════════
//  JOBS & APPLICATIONS
// ═══════════════════════════════════════

let currentAdminJobs = [];
let currentJobQuestions = [];
let editJobIdValue = null;
let allCoursesForJobs = [];

async function loadAdminJobs() {
  try {
    const res = await fetch('/api/admin/jobs');
    let jobs = await res.json();
    currentAdminJobs = jobs;

    const filter = document.getElementById('jobsFilterSelect').value;
    if (filter !== 'all') {
      jobs = jobs.filter(j => j.status === filter);
    }

    document.getElementById('jobsCount').textContent = `${jobs.length} total postings`;
    const list = document.getElementById('jobsListAdmin');

    if (!jobs.length) {
      list.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:2rem;">No job postings found.</td></tr>';
      return;
    }

    list.innerHTML = jobs.map(j => `
      <tr>
        <td style="font-family:'Share Tech Mono',monospace;color:var(--muted);">#${j.id}</td>
        <td style="font-weight:600;color:var(--text);">${esc(j.title)}</td>
        <td>${j.courseTitle ? `<span style="color:var(--green);font-size:0.85rem;">${esc(j.courseTitle)}</span>` : '<span style="color:var(--muted);font-size:0.8rem;">None</span>'}</td>
        <td>${j.price > 0 ? `<span style="color:var(--green);font-weight:600;">₹${j.price}</span>` : '<span style="color:var(--muted);">Free</span>'}</td>
        <td><span class="status-badge ${j.status === 'open' ? 'status-completed' : 'status-failed'}">${j.status.toUpperCase()}</span></td>
        <td><span class="tag tag-cyan" style="font-size:0.7rem;">${(j.customQuestions || []).length} Custom</span></td>
        <td>
          <button class="btn-edit btn-edit-job" data-id="${j.id}" title="Edit Job"><i class="fas fa-pen"></i></button>
          <button class="btn-edit btn-view-apps" data-id="${j.id}" data-title="${esc(j.title)}" style="width:auto;padding:0 0.5rem;" title="View Applications"><i class="fas fa-users"></i> Apps</button>
          <button class="btn-delete btn-delete-job" data-id="${j.id}" title="Delete Job"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Failed to load jobs.', true);
  }
}

async function fetchCoursesForJobs() {
  try {
    const res = await fetch('/api/admin/courses');
    allCoursesForJobs = await res.json();
  } catch (e) { allCoursesForJobs = []; }
}

function populateCourseDropdown(selectedId) {
  const sel = document.getElementById('jobLinkedCourse');
  sel.innerHTML = '<option value="">— None (no payment required) —</option>';
  allCoursesForJobs.forEach(c => {
    const selected = (c.id == selectedId) ? 'selected' : '';
    sel.innerHTML += `<option value="${c.id}" ${selected}>${esc(c.title)} (₹${c.price || 0})</option>`;
  });
}

async function openJobEditor(job = null) {
  document.getElementById('jobsListView').style.display = 'none';
  document.getElementById('jobAppsView').style.display = 'none';
  document.getElementById('jobEditorView').style.display = 'block';

  await fetchCoursesForJobs();

  if (job) {
    document.getElementById('jobEditorTitle').innerHTML = '<i class="fas fa-edit" style="color:var(--green);margin-right:.5rem;"></i>Edit Job';
    editJobIdValue = job.id;
    document.getElementById('jobTitle').value = job.title;
    document.getElementById('jobDesc').value = job.description;
    document.getElementById('jobStatus').value = job.status;
    document.getElementById('jobPrice').value = job.price || 0;
    populateCourseDropdown(job.linkedCourseId);
    currentJobQuestions = job.customQuestions || [];
  } else {
    document.getElementById('jobEditorTitle').innerHTML = '<i class="fas fa-plus" style="color:var(--green);margin-right:.5rem;"></i>New Job';
    editJobIdValue = null;
    document.getElementById('jobTitle').value = '';
    document.getElementById('jobDesc').value = '';
    document.getElementById('jobStatus').value = 'open';
    document.getElementById('jobPrice').value = 0;
    populateCourseDropdown(null);
    currentJobQuestions = [];
  }
  renderJobQuestions();
}

function closeJobEditor() {
  document.getElementById('jobEditorView').style.display = 'none';
  document.getElementById('jobsListView').style.display = 'block';
}

function editJob(id) {
  const job = currentAdminJobs.find(j => j.id == id);
  if (job) openJobEditor(job);
}

// Job Question Builder
function addJobQuestion() {
  currentJobQuestions.push({ question: '', type: 'text', required: true, options: [] });
  renderJobQuestions();
}

function removeJobQuestion(index) {
  currentJobQuestions.splice(index, 1);
  renderJobQuestions();
}

function updateJobQuestion(index, field, value) {
  if (field === 'required') {
    currentJobQuestions[index][field] = value === 'true';
  } else {
    currentJobQuestions[index][field] = value;
  }
}

function addSelectOption(qIndex) {
  if (!currentJobQuestions[qIndex].options) currentJobQuestions[qIndex].options = [];
  currentJobQuestions[qIndex].options.push('');
  renderJobQuestions();
}

function removeSelectOption(qIndex, optIndex) {
  currentJobQuestions[qIndex].options.splice(optIndex, 1);
  renderJobQuestions();
}

function updateSelectOption(qIndex, optIndex, value) {
  currentJobQuestions[qIndex].options[optIndex] = value;
}

function renderJobQuestions() {
  const container = document.getElementById('jobQuestionsList');
  if (currentJobQuestions.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);font-style:italic;font-size:0.9rem;">No custom questions added.</p>';
    return;
  }

  container.innerHTML = currentJobQuestions.map((q, i) => {
    let optionsHtml = '';
    if (q.type === 'select') {
      const opts = q.options || [];
      optionsHtml = `
        <div style="margin-top:0.5rem;padding-left:1rem;border-left:2px solid rgba(0,212,255,0.2);">
          <p style="font-size:0.8rem;color:var(--cyan);margin-bottom:0.3rem;">Dropdown Options:</p>
          ${opts.map((opt, oi) => `
            <div style="display:flex;gap:0.5rem;margin-bottom:0.3rem;align-items:center;">
              <input type="text" value="${esc(opt)}" placeholder="Option ${oi + 1}" data-q-index="${i}" data-opt-index="${oi}" class="opt-input" style="flex:1;padding:0.3rem 0.5rem;background:var(--bg);border:1px solid rgba(255,255,255,0.1);color:var(--text);border-radius:4px;font-size:0.85rem;" />
              <button class="btn-remove-select-opt" data-q-index="${i}" data-opt-index="${oi}" style="background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:0.8rem;"><i class="fas fa-times"></i></button>
            </div>
          `).join('')}
          <button class="btn-add-select-opt" data-index="${i}" style="background:transparent;border:1px dashed rgba(0,212,255,0.3);color:var(--cyan);padding:0.2rem 0.6rem;border-radius:4px;font-size:0.75rem;cursor:pointer;margin-top:0.3rem;"><i class="fas fa-plus"></i> Add Option</button>
        </div>
      `;
    }

    return `
    <div class="job-q-item" data-index="${i}" style="background:rgba(0,0,0,0.2);border:1px solid rgba(0,212,255,0.2);padding:1rem;border-radius:6px;display:flex;gap:1rem;align-items:flex-start;margin-bottom:1rem;">
      <div style="flex:1;">
        <input type="text" value="${esc(q.question)}" placeholder="Question Text" class="job-q-text" style="width:100%;margin-bottom:0.5rem;padding:0.5rem;background:var(--bg);border:1px solid rgba(255,255,255,0.1);color:var(--text);border-radius:4px;" />
        <div style="display:flex;gap:1.5rem;flex-wrap:wrap;">
          <label style="font-size:0.85rem;color:var(--muted);"><span style="color:var(--cyan);margin-right:0.3rem;">Type:</span>
            <select class="q-type" style="background:var(--bg);color:var(--text);border:1px solid rgba(255,255,255,0.1);padding:0.2rem;border-radius:4px;">
              <option value="text" ${q.type === 'text' ? 'selected' : ''}>Short Text</option>
              <option value="textarea" ${q.type === 'textarea' ? 'selected' : ''}>Paragraph</option>
              <option value="email" ${q.type === 'email' ? 'selected' : ''}>Email</option>
              <option value="url" ${q.type === 'url' ? 'selected' : ''}>URL</option>
              <option value="number" ${q.type === 'number' ? 'selected' : ''}>Number</option>
              <option value="image" ${q.type === 'image' ? 'selected' : ''}>Image Upload</option>
              <option value="select" ${q.type === 'select' ? 'selected' : ''}>Dropdown</option>
            </select>
          </label>
          <label style="font-size:0.85rem;color:var(--muted);"><span style="color:var(--cyan);margin-right:0.3rem;">Required:</span>
            <select class="q-req" style="background:var(--bg);color:var(--text);border:1px solid rgba(255,255,255,0.1);padding:0.2rem;border-radius:4px;">
              <option value="true" ${q.required ? 'selected' : ''}>Yes</option>
              <option value="false" ${!q.required ? 'selected' : ''}>No</option>
            </select>
          </label>
        </div>
        ${optionsHtml}
      </div>
      <button class="btn-delete btn-remove-job-q" data-index="${i}" style="width:32px;height:32px;"><i class="fas fa-times"></i></button>
    </div>
  `;
  }).join('');
}

async function saveJob() {
  const title = document.getElementById('jobTitle').value.trim();
  if (!title) { showToast('Job Title is required.', true); return; }

  const linkedVal = document.getElementById('jobLinkedCourse').value;

  const payload = {
    title,
    description: document.getElementById('jobDesc').value.trim(),
    status: document.getElementById('jobStatus').value,
    customQuestions: currentJobQuestions.filter(q => q.question.trim().length > 0),
    linkedCourseId: linkedVal ? parseInt(linkedVal) : null,
    price: parseInt(document.getElementById('jobPrice').value) || 0
  };

  try {
    const url = editJobIdValue ? `/api/admin/jobs/${editJobIdValue}` : '/api/admin/jobs';
    const method = editJobIdValue ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast('Job saved successfully!');
      closeJobEditor();
      loadAdminJobs();
    } else {
      showToast('Failed to save job.', true);
    }
  } catch (err) {
    showToast('Network error.', true);
  }
}

// ─── APPLICATIONS VIEWER ───
let currentViewAppsJobId = null;

async function openJobApps(jobId, jobTitle) {
  document.getElementById('jobsListView').style.display = 'none';
  document.getElementById('jobEditorView').style.display = 'none';
  document.getElementById('appsJobTitle').textContent = `Apps: ${jobTitle}`;
  document.getElementById('jobAppsView').style.display = 'block';
  currentViewAppsJobId = jobId;

  // Refresh courses list to ensure we have it for manual enrollment
  await fetchCoursesForJobs();

  try {
    const res = await fetch(`/api/admin/jobs/${jobId}/applications`);
    const apps = await res.json();
    document.getElementById('appsCount').textContent = `${apps.length} Total Applications`;

    const list = document.getElementById('jobAppsList');
    if (!apps.length) {
      list.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:2rem;">No applications yet for this role.</td></tr>';
      return;
    }

    list.innerHTML = apps.map(app => `
      <tr>
        <td style="font-weight:600;">${esc(app.name)}</td>
        <td>
          <a href="mailto:${esc(app.email)}" style="color:var(--cyan);text-decoration:none;">${esc(app.email)}</a>
          ${app.phone ? `<br><span style="font-size:0.8rem;color:var(--muted);">${esc(app.phone)}</span>` : ''}
        </td>
        <td>
          ${app.resumeLink ? `<a href="${esc(app.resumeLink)}" target="_blank" style="display:inline-block;margin-bottom:0.3rem;color:var(--green);font-size:0.8rem;text-decoration:none;"><i class="fas fa-link"></i> Resume</a><br>` : '<span style="color:var(--muted);font-size:0.8rem;">No Resume</span><br>'}
          ${app.coverLetter ? `<a href="#" class="btn-view-cover" data-cover="${esc(app.coverLetter)}" style="color:var(--orange);font-size:0.8rem;text-decoration:none;"><i class="fas fa-file-alt"></i> Cover Letter</a>` : ''}
        </td>
        <td>
          ${app.paymentId ? `
            <div style="font-size:0.8rem;">
              <span style="color:var(--cyan);"><i class="fas fa-receipt"></i> ${esc(app.paymentId)}</span><br>
              ${app.paymentScreenshot ? `<a href="${esc(app.paymentScreenshot)}" target="_blank" style="color:var(--green);font-size:0.75rem;text-decoration:none;"><i class="fas fa-image"></i> Screenshot</a><br>` : ''}
              <span class="status-badge ${app.paymentVerified ? 'status-completed' : 'status-pending'}" style="font-size:0.65rem;margin-top:0.3rem;">${app.paymentVerified ? 'VERIFIED' : 'PENDING'}</span>
            </div>
          ` : '<span style="color:var(--muted);font-size:0.8rem;">N/A</span>'}
        </td>
        <td style="font-size:0.8rem;color:var(--muted);">${new Date(app.appliedAt).toLocaleDateString()}</td>
        <td>
          ${app.customAnswers && Object.keys(app.customAnswers).length > 0
            ? `<button class="btn-view-answers" data-app-id="${app.id}" style="background:transparent;border:1px solid var(--cyan);color:var(--cyan);border-radius:4px;padding:0.2rem 0.5rem;font-size:0.75rem;cursor:pointer;">View Answers</button>`
            : '<span style="color:var(--muted);font-size:0.8rem;">None</span>'}
        </td>
        <td>
          ${!app.paymentVerified ? `
            <button class="btn-verify-app" data-job-id="${jobId}" data-app-id="${app.id}" style="background:rgba(0,255,136,0.1);border:1px solid var(--green);color:var(--green);border-radius:4px;padding:0.3rem 0.6rem;font-size:0.75rem;cursor:pointer;font-weight:600;" title="Verify & Enroll"><i class="fas fa-check"></i> Verify</button>
          ` : '<span style="color:var(--green);font-size:0.8rem;"><i class="fas fa-check-circle"></i> Done</span>'}
        </td>
      </tr>
    `).join('');
    // Store apps for viewing answers
    window._currentApps = apps;
  } catch (err) {
    showToast('Failed to load apps.', true);
  }
}

function viewCustomAnswers(appId) {
  const app = (window._currentApps || []).find(a => a.id === appId);
  if (!app || !app.customAnswers) return;
  let msg = 'Custom Answers:\n\n';
  for (const [key, val] of Object.entries(app.customAnswers)) {
    if (key.startsWith('__image_')) {
      msg += `[Image Upload]: ${val}\n`;
    } else {
      msg += `${key}: ${val}\n`;
    }
  }
  alert(msg);
}

async function verifyJobApplication(jobId, appId) {
  const job = currentAdminJobs.find(j => j.id == jobId);
  let targetCourseId = job ? job.linkedCourseId : null;
  
  // If no course is linked, ask the admin to select one manually
  if (!targetCourseId && allCoursesForJobs.length > 0) {
    let msg = "This job has no linked course. Select a course to assign to the applicant:\n\n";
    allCoursesForJobs.forEach((c, idx) => {
      msg += `${idx + 1}. ${c.title} (ID: ${c.id})\n`;
    });
    msg += "\nEnter the number (e.g. 1) or '0' to skip enrollment:";
    const choice = prompt(msg);
    if (choice === null) return; // Cancelled
    const idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < allCoursesForJobs.length) {
      targetCourseId = allCoursesForJobs[idx].id;
    } else if (choice === '0') {
      targetCourseId = null;
    } else {
      showToast('Invalid choice.', true);
      return;
    }
  }

  const confirmMsg = targetCourseId 
    ? `Verify this application and auto-enroll the applicant?\n\nAn account will be created (if missing) and a notification email will be sent.`
    : `Verify this application and create an account? (No course will be assigned)`;

  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch(`/api/admin/jobs/${jobId}/applications/${appId}/verify`, { 
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: targetCourseId })
    });
    if (res.ok) {
      showToast('Applicant verified & notified!');
      openJobApps(jobId, document.getElementById('appsJobTitle').textContent.replace('Apps: ', ''));
    } else {
      showToast('Verification failed.', true);
    }
  } catch (e) {
    showToast('Network error.', true);
  }
}

function closeJobApps() {
  document.getElementById('jobAppsView').style.display = 'none';
  document.getElementById('jobsListView').style.display = 'block';
  currentViewAppsJobId = null;
}

function downloadJobAppsCSV() {
  if (currentViewAppsJobId) {
    window.location.href = `/api/admin/jobs/${currentViewAppsJobId}/applications/download`;
  }
}

setInterval(checkSession, 1000 * 60);
// ═══════════════════════════════════════
//  SETTINGS MANAGMENT
// ═══════════════════════════════════════
async function loadSettings() {
  try {
    const res = await fetch('/api/public/stats');
    const stats = await res.json();
    document.getElementById('setting_stat_blogs').value = stats.stat_blogs || '0';
    document.getElementById('setting_stat_ctf').value = stats.stat_ctf || '0';
    document.getElementById('setting_stat_tools').value = stats.stat_tools || '0';
    document.getElementById('setting_stat_students').value = stats.stat_students || '0';
  } catch (e) { showToast('Failed to load settings.', true); }
}

async function saveSettings() {
  const stat_blogs = document.getElementById('setting_stat_blogs').value;
  const stat_ctf = document.getElementById('setting_stat_ctf').value;
  const stat_tools = document.getElementById('setting_stat_tools').value;
  const stat_students = document.getElementById('setting_stat_students').value;
  try {
    const res = await fetch('/api/admin/settings/stats', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stat_blogs, stat_ctf, stat_tools, stat_students })
    });
    const data = await res.json();
    if (data.success) showToast('Settings saved successfully!');
    else showToast(data.error || 'Failed to save.', true);
  } catch (e) { showToast('Connection error.', true); }
}
