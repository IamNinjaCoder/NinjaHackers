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
        paySec.innerHTML = `
            <div style="background:rgba(0,255,136,0.05); border:1px solid rgba(0,255,136,0.2); padding:1rem; border-radius:10px; margin-bottom:1.5rem;">
                <h3 style="color:var(--green);font-family:'Orbitron',sans-serif;font-size:1rem;margin-bottom:0.4rem;"><i class="fas fa-credit-card"></i> Application Fee</h3>
                <p style="color:var(--cyan);font-size:0.9rem;margin:0;">This role requires a processing fee of <strong style="color:var(--green);font-size:1.1rem;">₹${job.price}</strong>. payment will be processed securely via Razorpay.</p>
            </div>
            <input type="hidden" id="paymentMethod" value="online">
        `;
        document.getElementById('submitBtn').innerHTML = '<i class="fas fa-credit-card"></i> Pay & Submit';
    } else {
        paySec.style.display = 'none';
        paySec.innerHTML = '<input type="hidden" id="paymentMethod" value="free">';
        document.getElementById('submitBtn').innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
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
    const jobId = document.getElementById('applyJobId').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    // 1. Basic Validation First
    const name = document.getElementById('appName').value.trim();
    const email = document.getElementById('appEmail').value.trim();
    if (!name || !email) {
        showToast('Please fill in your name and email.', true);
        return;
    }

    // 2. Validate Custom Questions
    let allValid = true;
    document.querySelectorAll('.app-custom-q').forEach(el => {
        if (el.hasAttribute('required') && !el.value.trim() && el.type !== 'file') {
            allValid = false;
        } else if (el.hasAttribute('required') && el.type === 'file' && !el.files[0]) {
            allValid = false;
        }
    });

    if (!allValid) {
        showToast('Please answer all required questions.', true);
        return;
    }

    // 3. Handle Payment / Submission
    if (paymentMethod === 'online') {
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing Payment...';
            
            const orderRes = await fetch(`/api/jobs/${jobId}/order`, { method: 'POST' });
            const orderData = await orderRes.json();
            
            if (!orderData.success) {
                showToast(orderData.error || 'Payment failed to initialize.', true);
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
                return;
            }

            const options = {
                key: orderData.key,
                amount: orderData.order.amount,
                currency: orderData.order.currency,
                name: 'NinjaHackers',
                description: `Application Fee: ${orderData.title}`,
                order_id: orderData.order.id,
                handler: async function (response) {
                    await finalizeSubmision(response);
                },
                prefill: { name, email },
                theme: { color: '#10b981' },
                modal: { ondismiss: function() { 
                    btn.disabled = false; 
                    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application'; 
                }}
            };
            const rzp = new Razorpay(options);
            rzp.open();
            return; 
        } catch (err) {
            console.error('Payment Error:', err);
            showToast('Payment system error.', true);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
            return;
        }
    }

    await finalizeSubmision();
}

async function finalizeSubmision(paymentDetails = null) {
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    const jobId = document.getElementById('applyJobId').value;
    const name = document.getElementById('appName').value.trim();
    const email = document.getElementById('appEmail').value.trim();
    const phoneEl = document.getElementById('appPhone');
    const resumeEl = document.getElementById('appResume');
    const coverEl = document.getElementById('appCover');
    
    // Check required fields
    if (!name || !email) {
        showToast('Name and Email are required.', true);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
        return;
    }

    const phone = phoneEl ? phoneEl.value.trim() : '';
    const resume = resumeEl ? resumeEl.value.trim() : '';
    const cover = coverEl ? coverEl.value.trim() : '';
    
    const formData = new FormData();
    formData.append('jobId', jobId);
    formData.append('name', name);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('resumeLink', resume);
    formData.append('coverLetter', cover);

    // If Razorpay details exist (Online path)
    if (paymentDetails) {
        formData.append('razorpay_payment_id', paymentDetails.razorpay_payment_id);
        formData.append('razorpay_order_id', paymentDetails.razorpay_order_id);
        formData.append('razorpay_signature', paymentDetails.razorpay_signature);
    }

    // Collect custom questions
    const customAnswers = {};
    const customInputs = document.querySelectorAll('.app-custom-q');
    customInputs.forEach((el, idx) => {
        const label = el.getAttribute('data-label');
        if (el.type === 'file' && el.files[0]) {
            const file = el.files[0];
            const renamedFile = new File([file], `img_q_${idx}_${file.name}`, { type: file.type });
            formData.append('imageUpload', renamedFile);
            customAnswers[label] = `[Image Uploaded - see attachment]`;
        } else {
            customAnswers[label] = el.value.trim();
        }
    });

    formData.append('customAnswers', JSON.stringify(customAnswers));

    try {
        const res = await fetch(`/api/jobs/${jobId}/apply`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            showToast('Application submitted! Please check your email for next steps.');
            // Add a brief delay before closing so they can read the toast
            setTimeout(() => {
                closeModal();
                loadJobs();
            }, 3000);
        } else {
            showToast(data.error || 'Submission failed. Please try again.', true);
        }
    } catch (err) {
        console.error('Finalize error:', err);
        showToast('Connection error. Please check your internet.', true);
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
