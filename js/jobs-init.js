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
        let qs = job.customQuestions || job.customquestions || job.questions || [];
        if (typeof qs === 'string') qs = JSON.parse(qs);

        qs.forEach((q, idx) => {
            const qTitle = q.question || q.label || '';
            let inputHtml = '';
            
            if (q.type === 'textarea') {
                inputHtml = `<textarea class="app-custom-q" data-label="${escapeHTML(qTitle)}" ${q.required ? 'required' : ''}></textarea>`;
            } else if (q.type === 'select') {
                const opts = (q.options || []).map(o => `<option value="${escapeHTML(o)}">${escapeHTML(o)}</option>`).join('');
                inputHtml = `<select class="app-custom-q" data-label="${escapeHTML(qTitle)}" ${q.required ? 'required' : ''} style="width: 100%; padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff; font-family: 'Rajdhani', sans-serif; font-size: 1.05rem;">
                                <option value="">— Select Option —</option>
                                ${opts}
                             </select>`;
            } else {
                inputHtml = `<input type="${(q.type === 'image' || q.type === 'file') ? 'file' : 'text'}" class="app-custom-q" data-label="${escapeHTML(qTitle)}" ${q.required ? 'required' : ''}>`;
            }

            qHtml += `
                <div class="form-group">
                    <label>${escapeHTML(qTitle)}${q.required ? ' *' : ''}</label>
                    ${inputHtml}
                </div>`;
        });
    } catch (e) { console.error('Error parsing custom questions:', e); }
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
    const phoneEl = document.getElementById('appPhone');
    const resumeEl = document.getElementById('appResume');
    const coverEl = document.getElementById('appCover');
    
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const resume = resumeEl ? resumeEl.value.trim() : '';
    const cover = coverEl ? coverEl.value.trim() : '';
    const paymentId = document.getElementById('appPaymentId').value.trim();

    // Collect custom questions
    const customAnswers = {};
    const customInputs = document.querySelectorAll('.app-custom-q');
    
    const formData = new FormData();
    formData.append('jobId', jobId);
    formData.append('name', name);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('resumeLink', resume); // Match backend field 'resumeLink'
    formData.append('coverLetter', cover); // Match backend field 'coverLetter'
    formData.append('paymentId', paymentId);

    customInputs.forEach((el, idx) => {
        const label = el.getAttribute('data-label');
        if (el.type === 'file' && el.files[0]) {
            const file = el.files[0];
            // The backend expects originalname to start with img_q_INDEX_
            const renamedFile = new File([file], `img_q_${idx}_${file.name}`, { type: file.type });
            formData.append('imageUpload', renamedFile);
            customAnswers[label] = `[Image Uploaded - see attachment]`;
        } else {
            customAnswers[label] = el.value.trim();
        }
    });

    formData.append('customAnswers', JSON.stringify(customAnswers));

    const screenshot = document.getElementById('appPaymentScreenshot').files[0];
    if (screenshot) formData.append('paymentScreenshot', screenshot); // Match backend field 'paymentScreenshot'

    try {
        const res = await fetch(`/api/jobs/${jobId}/apply`, {
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
