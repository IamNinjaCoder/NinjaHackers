let currentJobs = [];

document.addEventListener('DOMContentLoaded', () => {
    // Initial load
    loadJobs();

    // Event delegation for "Apply Now" buttons
    const list = document.getElementById('jobsList');
    if (list) {
        list.addEventListener('click', (e) => {
            const btn = e.target.closest('.apply-btn');
            if (btn) {
                const id = btn.getAttribute('data-id');
                if (id) openModal(parseInt(id));
            }
        });
    }

    // Modal close listeners
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    const modal = document.getElementById('applyModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Form submission listener
    const form = document.getElementById('applyForm');
    if (form) form.addEventListener('submit', submitApplication);

    // Escape key for modal
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
});

async function loadJobs() {
    try {
        const res = await fetch('/api/jobs');
        currentJobs = await res.json();
        renderJobs(currentJobs);
    } catch (err) {
        const list = document.getElementById('jobsList');
        if (list) list.innerHTML = '<div class="loading">Failed to load careers. Please try again.</div>';
    }
}

function renderJobs(jobs) {
    const list = document.getElementById('jobsList');
    if (!list) return;
    if (!jobs.length) {
        list.innerHTML = '<div class="loading">No open roles currently. Check back later!</div>';
        return;
    }
    list.innerHTML = jobs.map(j => `
        <div class="job-card">
            <div class="job-header">
                <div class="job-title">${escapeHTML(j.title)}</div>
                <div class="job-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${escapeHTML(j.location)}</span>
                    <span><i class="fas fa-briefcase"></i> ${escapeHTML(j.type)}</span>
                    ${j.price > 0 ? `<span style="color:var(--green);"><i class="fas fa-tag"></i> Fee: ₹${j.price}</span>` : ''}
                </div>
            </div>
            <div class="job-desc">${escapeHTML(j.description)}</div>
            <button class="apply-btn" data-id="${j.id}">Apply Now <i class="fas fa-arrow-right"></i></button>
        </div>
    `).join('');
}

function openModal(id) {
    const job = currentJobs.find(j => j.id === id);
    if (!job) return;

    document.getElementById('modalJobTitle').textContent = `Apply for: ${job.title}`;
    document.getElementById('applyJobId').value = job.id;

    // Handle payment section
    const paySec = document.getElementById('paymentSection');
    if (job.price > 0) {
        paySec.style.display = 'block';
        document.getElementById('paymentPriceLabel').textContent = `Requirement: This role requires an application processing fee of ₹${job.price}. Please pay to our UPI/Official Bank and share the ID below.`;
        document.getElementById('appPaymentId').required = true;
    } else {
        paySec.style.display = 'none';
        document.getElementById('appPaymentId').required = false;
    }

    // Handle dynamic questions
    const qSec = document.getElementById('dynamicQuestions');
    let qHtml = '';
    try {
        const qs = JSON.parse(job.questions || '[]');
        qs.forEach((q, idx) => {
            qHtml += `
                <div class="form-group">
                    <label>${escapeHTML(q.label)}${q.required ? ' *' : ''}</label>
                    ${q.type === 'textarea'
                    ? `<textarea class="app-custom-q" data-label="${escapeHTML(q.label)}" ${q.required ? 'required' : ''}></textarea>`
                    : `<input type="text" class="app-custom-q" data-label="${escapeHTML(q.label)}" ${q.required ? 'required' : ''}>`
                }
                </div>`;
        });
    } catch (e) { }
    qSec.innerHTML = qHtml;

    document.getElementById('applyModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('applyModal').style.display = 'none';
    document.body.style.overflow = '';
}

async function submitApplication(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    const jobId = document.getElementById('applyJobId').value;
    const name = document.getElementById('appName').value.trim();
    const email = document.getElementById('appEmail').value.trim();
    const phone = document.getElementById('appPhone').value.trim();
    const resume = document.getElementById('appResume').value.trim();
    const cover = document.getElementById('appCover').value.trim();
    const paymentId = document.getElementById('appPaymentId').value.trim();

    // Collect custom questions
    const questions = [];
    document.querySelectorAll('.app-custom-q').forEach(el => {
        questions.push({ label: el.getAttribute('data-label'), value: el.value.trim() });
    });

    const formData = new FormData();
    formData.append('jobId', jobId);
    formData.append('name', name);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('resume', resume);
    formData.append('cover', cover);
    formData.append('paymentId', paymentId);
    formData.append('questions', JSON.stringify(questions));

    const screenshot = document.getElementById('appPaymentScreenshot').files[0];
    if (screenshot) formData.append('screenshot', screenshot);

    try {
        const res = await fetch('/api/jobs/apply', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            showToast('Application submitted successfully!');
            closeModal();
            document.getElementById('applyForm').reset();
        } else {
            showToast(data.error || 'Submission failed.', true);
        }
    } catch (err) {
        showToast('Error submitting application.', true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
    }
}

function escapeHTML(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = isError ? 'error' : '';
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 4000);
}
