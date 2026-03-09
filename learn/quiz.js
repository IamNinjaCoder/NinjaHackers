/* ═══════════════════════════════════════
   QUIZ.JS — Quiz Engine
   Server-side validated
   ═══════════════════════════════════════ */

// ─── State ───
let quizData = null;
let timerInterval = null;
let timeRemaining = 0;
let totalTime = 0;
let quizSubmitted = false;
let quizActive = false;

const esc = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

// ─── Init ───
(async function init() {
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get('itemId');
    if (!itemId) { showError('No quiz specified.'); return; }

    try {
        const res = await fetch(`/api/student/quiz/${itemId}`);
        if (res.status === 401) { window.location.href = '/learn'; return; }
        if (!res.ok) { showError('Failed to load quiz.'); return; }

        quizData = await res.json();
        quizData.itemId = itemId;

        document.getElementById('quizLoading').style.display = 'none';
        document.getElementById('quizApp').style.display = 'block';

        renderQuiz();
    } catch (e) {
        showError('Network error. Please try again.');
    }
})();

function showError(msg) {
    document.getElementById('quizLoading').innerHTML = `
        <i class="fas fa-exclamation-triangle" style="font-size:2rem;color:var(--red);"></i>
        <p style="color:var(--red);">${esc(msg)}</p>
        <button onclick="window.history.back()" class="btn-quiz-back" style="margin-top:1rem;"><i class="fas fa-arrow-left"></i> Go Back</button>
    `;
}

// ─── Render Quiz ───
function renderQuiz() {
    const { quiz, questions, attempts, attemptsUsed, bestScore, reviewResults } = quizData;
    const maxAttempts = quiz.maxAttempts;
    const passingPercent = quiz.passingPercent;
    const timerMinutes = quiz.timerMinutes || 0;
    const totalQs = questions.length;
    const hasPassed = attempts.some(a => a.passed === 1);
    const outOfAttempts = attemptsUsed >= maxAttempts;
    const scored100 = (totalQs > 0 && bestScore === totalQs);

    document.getElementById('quizTitle').textContent = 'Quiz';
    document.getElementById('quizMeta').textContent = `${totalQs} Questions · Passing: ${passingPercent}% · Attempts: ${attemptsUsed}/${maxAttempts}${timerMinutes > 0 ? ` · Timer: ${timerMinutes} min` : ''}`;
    document.getElementById('quizProgress').textContent = `0 / ${totalQs} answered`;

    // ── If review results are available (out of attempts or scored 100%), show review ──
    if (reviewResults) {
        showReviewResults(reviewResults, questions, bestScore, totalQs, hasPassed, attemptsUsed, maxAttempts);
        return;
    }

    // ── If passed but not 100%, show choice: retry or view results ──
    const isRetry = new URLSearchParams(window.location.search).get('retry') === '1';
    if (hasPassed && !scored100 && !outOfAttempts && !isRetry) {
        showPassedOptions(bestScore, totalQs, passingPercent, attemptsUsed, maxAttempts);
        return;
    }

    // ── Render questions for answering ──
    renderQuestions(questions);
    quizActive = true;

    // ── Start timer if configured ──
    if (timerMinutes > 0) {
        startTimer(timerMinutes * 60);
    }
}

function renderQuestions(questions) {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = questions.map((q, i) => `
        <div class="question-card" id="qcard-${q.id}">
            <div class="question-number">Question ${i + 1}</div>
            <div class="question-text">${esc(q.question)}</div>
            <div class="options-list">
                ${['A', 'B', 'C', 'D'].filter(opt => q['option' + opt]).map(opt => `
                    <label class="option-label" id="opt-${q.id}-${opt}" onclick="selectOption(${q.id}, '${opt}')">
                        <input type="radio" name="q_${q.id}" value="${opt}">
                        <span class="option-letter">${opt})</span>
                        <span>${esc(q['option' + opt])}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');

    document.getElementById('quizActions').style.display = 'flex';
    document.getElementById('btnSubmit').style.display = '';
    document.getElementById('resultsSection').style.display = 'none';
}

function selectOption(qId, opt) {
    // Update visual state
    ['A', 'B', 'C', 'D'].forEach(o => {
        const el = document.getElementById(`opt-${qId}-${o}`);
        if (el) el.classList.remove('selected');
    });
    const selected = document.getElementById(`opt-${qId}-${opt}`);
    if (selected) selected.classList.add('selected');

    // Mark card as answered
    const card = document.getElementById(`qcard-${qId}`);
    if (card) card.classList.add('answered');

    // Update progress
    updateProgress();
}

function updateProgress() {
    const total = quizData.questions.length;
    const answered = document.querySelectorAll('.question-card.answered').length;
    document.getElementById('quizProgress').textContent = `${answered} / ${total} answered`;
}

// ─── Timer ───
function startTimer(seconds) {
    timeRemaining = seconds;
    totalTime = seconds;

    const timerEl = document.getElementById('quizTimer');
    const timerBar = document.getElementById('timerBar');
    timerEl.style.display = 'flex';
    timerBar.style.display = 'block';

    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeRemaining--;
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            timeRemaining = 0;
            updateTimerDisplay();
            // Auto-submit when time runs out
            if (!quizSubmitted) {
                submitQuiz(true);
            }
            return;
        }
        updateTimerDisplay();
    }, 1000);
}

function updateTimerDisplay() {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    document.getElementById('timerDisplay').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Update timer bar
    const pct = (timeRemaining / totalTime) * 100;
    const fill = document.getElementById('timerBarFill');
    fill.style.width = pct + '%';

    const timerEl = document.getElementById('quizTimer');
    timerEl.classList.remove('warning', 'danger');
    fill.classList.remove('warning', 'danger');

    if (pct <= 15) {
        timerEl.classList.add('danger');
        fill.classList.add('danger');
    } else if (pct <= 35) {
        timerEl.classList.add('warning');
        fill.classList.add('warning');
    }
}

// ─── Submit (server-side validated) ───
async function submitQuiz(autoSubmit = false) {
    if (quizSubmitted) return;

    if (!autoSubmit) {
        const answered = document.querySelectorAll('.question-card.answered').length;
        const total = quizData.questions.length;
        if (answered < total) {
            if (!confirm(`You've only answered ${answered} of ${total} questions. Submit anyway?`)) return;
        }
    }

    quizSubmitted = true;
    quizActive = false;
    if (timerInterval) clearInterval(timerInterval);

    // Collect answers
    const answers = {};
    quizData.questions.forEach(q => {
        const checked = document.querySelector(`input[name="q_${q.id}"]:checked`);
        if (checked) answers[q.id] = checked.value;
    });

    const btnSubmit = document.getElementById('btnSubmit');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        const res = await fetch(`/api/student/quiz/${quizData.itemId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers })
        });

        if (!res.ok) {
            const err = await res.json();
            alert(err.error || 'Submission failed.');
            quizSubmitted = false;
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Answers';
            return;
        }

        const result = await res.json();
        showSubmissionResult(result);
    } catch (e) {
        alert('Network error. Please try again.');
        quizSubmitted = false;
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Answers';
    }
}

// ─── Show Submission Result ───
function showSubmissionResult(result) {
    const { score, totalQuestions, passed, percent, reviewResults, bestScore: serverBest } = result;
    const displayBest = serverBest !== undefined ? serverBest : score;

    document.getElementById('questionsContainer').innerHTML = '';
    document.getElementById('quizActions').style.display = 'none';
    document.getElementById('quizTimer').style.display = 'none';
    document.getElementById('timerBar').style.display = 'none';

    const section = document.getElementById('resultsSection');
    section.style.display = 'block';

    section.innerHTML = `
        <div class="result-banner ${passed ? 'passed' : 'failed'}">
            <div class="result-score">${percent}%</div>
            <div class="result-message">${passed ? '🎉 Congratulations! You passed!' : '❌ You did not pass this time.'}</div>
            <div class="result-stats">
                <div class="result-stat">
                    <div class="result-stat-value">${score}/${totalQuestions}</div>
                    <div class="result-stat-label">This Attempt</div>
                </div>
                <div class="result-stat">
                    <div class="result-stat-value">${displayBest}/${totalQuestions}</div>
                    <div class="result-stat-label">Best Score</div>
                </div>
            </div>
        </div>
        <div style="display:flex;justify-content:center;gap:1rem;flex-wrap:wrap;">
            ${reviewResults ? `<button class="btn-quiz-submit" onclick="showFullReview()"><i class="fas fa-eye"></i> Review Answers</button>` : ''}
            ${!passed ? `<button class="btn-quiz-retry" onclick="retryQuiz()"><i class="fas fa-redo"></i> Try Again</button>` : ''}
            ${passed && !reviewResults ? `<button class="btn-quiz-retry" onclick="retryQuiz()"><i class="fas fa-redo"></i> Retry for Better Score</button>` : ''}
            <button class="btn-quiz-back" onclick="goBack()"><i class="fas fa-arrow-left"></i> Back to Course</button>
        </div>
    `;

    // Store review results for later viewing
    if (reviewResults) {
        window._reviewResults = reviewResults;
    }
}

function showFullReview() {
    // Re-fetch quiz data to get full review
    window.location.reload();
}

// ─── Show Passed Options (passed but <100%, attempts left) ───
function showPassedOptions(bestScore, totalQs, passingPercent, attemptsUsed, maxAttempts) {
    const percent = Math.round((bestScore / totalQs) * 100);

    document.getElementById('questionsContainer').innerHTML = '';
    document.getElementById('quizActions').style.display = 'none';

    const section = document.getElementById('resultsSection');
    section.style.display = 'block';
    section.innerHTML = `
        <div class="result-banner passed">
            <div class="result-score">${percent}%</div>
            <div class="result-message">🎉 You passed! Best score: ${bestScore}/${totalQs}</div>
            <div class="result-stats">
                <div class="result-stat">
                    <div class="result-stat-value">${attemptsUsed}/${maxAttempts}</div>
                    <div class="result-stat-label">Attempts Used</div>
                </div>
                <div class="result-stat">
                    <div class="result-stat-value">${passingPercent}%</div>
                    <div class="result-stat-label">Passing Score</div>
                </div>
            </div>
        </div>
        <div style="display:flex;justify-content:center;gap:1rem;flex-wrap:wrap;margin-top:1rem;">
            <button class="btn-quiz-retry" onclick="retryQuiz()"><i class="fas fa-redo"></i> Retry for Better Score</button>
            <button class="btn-quiz-back" onclick="goBack()"><i class="fas fa-arrow-left"></i> Back to Course</button>
        </div>
    `;
}

// ─── Show Review Results (out of attempts or scored 100%) ───
function showReviewResults(reviewResults, questions, bestScore, totalQs, hasPassed, attemptsUsed, maxAttempts) {
    const percent = Math.round((bestScore / totalQs) * 100);

    document.getElementById('quizActions').style.display = 'none';

    // Render questions in review mode
    const container = document.getElementById('questionsContainer');
    container.innerHTML = questions.map((q, i) => {
        const review = reviewResults.find(r => r.questionId === q.id);
        const studentAnswer = review ? review.studentAnswer : '';
        const correctOption = review ? review.correctOption : '';

        return `
            <div class="question-card">
                <div class="question-number">Question ${i + 1}</div>
                <div class="question-text">${esc(q.question)}</div>
                <div class="options-list">
                    ${['A', 'B', 'C', 'D'].filter(opt => q['option' + opt]).map(opt => {
            let cls = 'option-label';
            let icon = '';
            if (opt === correctOption) { cls += ' correct-answer'; icon = '<i class="fas fa-check-circle review-icon" style="color:var(--green);"></i>'; }
            if (opt === studentAnswer && opt !== correctOption) { cls += ' wrong-answer'; icon = '<i class="fas fa-times-circle review-icon" style="color:var(--red);"></i>'; }
            return `
                            <div class="${cls}">
                                <span class="option-letter">${opt})</span>
                                <span>${esc(q['option' + opt])}</span>
                                ${icon}
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }).join('');

    // Show result banner above questions
    const section = document.getElementById('resultsSection');
    section.style.display = 'block';
    section.innerHTML = `
        <div class="result-banner ${hasPassed ? 'passed' : 'failed'}">
            <div class="result-score">${percent}%</div>
            <div class="result-message">${hasPassed ? '🎉 You passed!' : '❌ Quiz Complete'} · Best Score: ${bestScore}/${totalQs}</div>
            <div class="result-stats">
                <div class="result-stat">
                    <div class="result-stat-value">${attemptsUsed}/${maxAttempts}</div>
                    <div class="result-stat-label">Attempts Used</div>
                </div>
            </div>
        </div>
        <h2 style="color:var(--cyan);font-size:1rem;margin-bottom:1rem;text-align:center;">📋 Answer Review</h2>
    `;

    // Add back button below questions
    const actions = document.getElementById('quizActions');
    actions.style.display = 'flex';
    actions.innerHTML = `<button class="btn-quiz-back" onclick="goBack()"><i class="fas fa-arrow-left"></i> Back to Course</button>`;
}

// ─── Retry ───
function retryQuiz() {
    quizSubmitted = false;
    quizActive = false;
    if (timerInterval) clearInterval(timerInterval);
    // Add retry=1 param so the quiz skips the "you passed" screen
    const url = new URL(window.location.href);
    url.searchParams.set('retry', '1');
    window.location.href = url.toString();
}

// ─── Go Back ───
function goBack() {
    quizActive = false;
    window.history.back();
}
