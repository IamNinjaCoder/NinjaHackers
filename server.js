const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { marked } = require('marked');
const helmet = require('helmet');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ─── Load .env ───
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...rest] = trimmed.split('=');
            process.env[key.trim()] = rest.join('=').trim();
        }
    });
}

const PORT = process.env.PORT || 3000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'NinjaHack3r$2025';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';

// ─── Allowed email domains ───
const ALLOWED_DOMAINS = new Set([
    'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
    'yahoo.com', 'yahoo.in', 'yahoo.co.in', 'yahoo.co.uk',
    'protonmail.com', 'proton.me', 'icloud.com', 'me.com', 'mac.com',
    'aol.com', 'zoho.com', 'zoho.in', 'yandex.com', 'mail.com',
    'gmx.com', 'gmx.net', 'tutanota.com', 'fastmail.com',
    'rediffmail.com', 'edu', 'ac.in'
]);

function isAllowedEmail(email) {
    if (!email) return false;
    const domain = email.toLowerCase().split('@')[1];
    if (!domain) return false;
    // Check exact match
    if (ALLOWED_DOMAINS.has(domain)) return true;
    // Check if domain ends with an allowed suffix (e.g. .edu, .ac.in)
    for (const allowed of ALLOWED_DOMAINS) {
        if (domain.endsWith('.' + allowed)) return true;
    }
    return false;
}

// Razorpay
let Razorpay, razorpayInstance;
try {
    Razorpay = require('razorpay');
    if (process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_XXX')) {
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        console.log('✅ Razorpay configured.');
    }
} catch (e) { }

// Nodemailer
let transporter;
try {
    const nodemailer = require('nodemailer');
    if (process.env.SMTP_USER && !process.env.SMTP_USER.startsWith('your-')) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        console.log('✅ Email configured.');
    }
} catch (e) { }

marked.setOptions({ breaks: true, gfm: true });

// ═══════════════════════════════════════
//  DATABASE — stored in private directory
// ═══════════════════════════════════════
const dataDir = path.join(__dirname, '.data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { mode: 0o700 });
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { mode: 0o700 });

// Multer for assignment uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadsDir),
        filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`)
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.zip', '.rar', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.gif'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    }
});

// Determine if we should use URL or local config
const poolConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL } // For Heroku/Render/Supabase (add ssl: { rejectUnauthorized: false } if needed)
    : {
        user: process.env.USER,
        host: process.env.PGHOST || '/tmp', // Local MacOS UNIX socket fallback
        database: 'ninjahackers',
        port: 5433,
    };

const pool = new Pool(poolConfig);

async function initDB() {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL DEFAULT 'NinjaHacker',
        excerpt TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]',
        date TEXT NOT NULL,
        readTime TEXT NOT NULL DEFAULT '5 min read',
        content TEXT NOT NULL DEFAULT '',
        contentHtml TEXT NOT NULL DEFAULT '',
        coverImage TEXT DEFAULT '',
        published INTEGER NOT NULL DEFAULT 1,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        blogId INTEGER NOT NULL,
        name TEXT NOT NULL,
        comment TEXT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (blogId) REFERENCES blogs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        loginAttempts INTEGER NOT NULL DEFAULT 0,
        lockedUntil TEXT DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        emailVerified INTEGER NOT NULL DEFAULT 0,
        otpCode TEXT DEFAULT NULL,
        otpExpiry TEXT DEFAULT NULL,
        loginAttempts INTEGER NOT NULL DEFAULT 0,
        lockedUntil TEXT DEFAULT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        code TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        price INTEGER NOT NULL DEFAULT 0,
        coverImage TEXT DEFAULT '',
        instructor TEXT NOT NULL DEFAULT 'NinjaHacker',
        duration TEXT DEFAULT '',
        level TEXT DEFAULT 'Beginner',
        published INTEGER NOT NULL DEFAULT 1,
        startDate TEXT DEFAULT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS course_modules (
        id SERIAL PRIMARY KEY,
        courseId INTEGER NOT NULL,
        title TEXT NOT NULL,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS module_items (
        id SERIAL PRIMARY KEY,
        moduleId INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT 'recorded_class',
        title TEXT NOT NULL,
        link TEXT NOT NULL DEFAULT '',
        description TEXT DEFAULT '',
        sortOrder INTEGER NOT NULL DEFAULT 0,
        scheduledAt TEXT DEFAULT NULL,
        FOREIGN KEY (moduleId) REFERENCES course_modules(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        studentId INTEGER NOT NULL,
        courseId INTEGER NOT NULL,
        enrolledAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE(studentId, courseId)
      );

      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        discountType TEXT NOT NULL DEFAULT 'percent',
        discountValue INTEGER NOT NULL DEFAULT 10,
        maxUses INTEGER NOT NULL DEFAULT 100,
        usedCount INTEGER NOT NULL DEFAULT 0,
        expiresAt TEXT DEFAULT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        courseId INTEGER DEFAULT NULL,
        studentEmail TEXT DEFAULT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        studentId INTEGER NOT NULL,
        courseId INTEGER NOT NULL,
        couponId INTEGER,
        razorpayOrderId TEXT,
        razorpayPaymentId TEXT,
        razorpaySignature TEXT,
        amount INTEGER NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'INR',
        status TEXT NOT NULL DEFAULT 'pending',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (studentId) REFERENCES students(id),
        FOREIGN KEY (courseId) REFERENCES courses(id),
        FOREIGN KEY (couponId) REFERENCES coupons(id)
      );

      CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT DEFAULT '',
        message TEXT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS security_logs (
        id SERIAL PRIMARY KEY,
        event TEXT NOT NULL,
        ip TEXT,
        details TEXT DEFAULT '',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        itemId INTEGER NOT NULL UNIQUE,
        passingPercent INTEGER NOT NULL DEFAULT 60,
        maxAttempts INTEGER NOT NULL DEFAULT 3,
        FOREIGN KEY (itemId) REFERENCES module_items(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS quiz_questions (
        id SERIAL PRIMARY KEY,
        quizId INTEGER NOT NULL,
        question TEXT NOT NULL,
        optionA TEXT NOT NULL,
        optionB TEXT NOT NULL,
        optionC TEXT NOT NULL DEFAULT '',
        optionD TEXT NOT NULL DEFAULT '',
        correctOption TEXT NOT NULL DEFAULT 'A',
        sortOrder INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (quizId) REFERENCES quizzes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id SERIAL PRIMARY KEY,
        studentId INTEGER NOT NULL,
        quizId INTEGER NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        totalQuestions INTEGER NOT NULL DEFAULT 0,
        passed INTEGER NOT NULL DEFAULT 0,
        answers TEXT NOT NULL DEFAULT '{}',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (quizId) REFERENCES quizzes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id SERIAL PRIMARY KEY,
        studentId INTEGER NOT NULL,
        itemId INTEGER NOT NULL,
        filePath TEXT NOT NULL,
        fileName TEXT NOT NULL,
        grade TEXT DEFAULT NULL,
        feedback TEXT DEFAULT '',
        submittedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        gradedAt TEXT DEFAULT NULL,
        FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (itemId) REFERENCES module_items(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS student_progress (
        id SERIAL PRIMARY KEY,
        studentId INTEGER NOT NULL,
        itemId INTEGER NOT NULL,
        completedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (itemId) REFERENCES module_items(id) ON DELETE CASCADE,
        UNIQUE(studentId, itemId)
      );

      CREATE TABLE IF NOT EXISTS course_reviews (
        id SERIAL PRIMARY KEY,
        studentId INTEGER NOT NULL,
        courseId INTEGER NOT NULL,
        rating INTEGER NOT NULL DEFAULT 5,
        review TEXT DEFAULT '',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE(studentId, courseId)
      );

      CREATE TABLE IF NOT EXISTS coupon_usage (
        id SERIAL PRIMARY KEY,
        couponId INTEGER NOT NULL,
        studentId INTEGER NOT NULL,
        courseId INTEGER NOT NULL,
        usedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (couponId) REFERENCES coupons(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE(couponId, studentId, courseId)
      );

      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        courseId INTEGER DEFAULT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

        // DB migration helpers
        const safeAlter = async (sql) => { try { await pool.query(sql); } catch (e) { } };
        await safeAlter(`ALTER TABLE students ADD COLUMN emailVerified INTEGER NOT NULL DEFAULT 0`);
        await safeAlter(`ALTER TABLE students ADD COLUMN otpCode TEXT DEFAULT NULL`);
        await safeAlter(`ALTER TABLE students ADD COLUMN otpExpiry TEXT DEFAULT NULL`);
        await safeAlter(`ALTER TABLE courses ADD COLUMN startDate TEXT DEFAULT NULL`);

        console.log('✅ PostgreSQL database schema synchronized.');
    } catch (err) {
        console.error('❌ Database schema error:', err);
    }
}

// Call initDB when starting
initDB();

// uploads directory is set up at top of file

// ═══════════════════════════════════════
//  RATE LIMITING (in-memory)
// ═══════════════════════════════════════
const rateLimits = {};
function rateLimit(key, maxAttempts, windowMs) {
    const now = Date.now();
    if (!rateLimits[key]) rateLimits[key] = { count: 0, resetAt: now + windowMs };
    if (now > rateLimits[key].resetAt) { rateLimits[key] = { count: 0, resetAt: now + windowMs }; }
    rateLimits[key].count++;
    return rateLimits[key].count <= maxAttempts;
}
// Cleanup every 5 minutes
setInterval(() => { const now = Date.now(); for (const k in rateLimits) { if (now > rateLimits[k].resetAt) delete rateLimits[k]; } }, 5 * 60 * 1000);

// ═══════════════════════════════════════
//  BRUTE FORCE PROTECTION
// ═══════════════════════════════════════
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function checkAccountLock(user) {
    if (!user) return false;
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) return true;
    return false;
}


const ALLOWED_TABLES = new Set(['admin_users', 'students']);

async function recordFailedLogin(table, id) {
    if (!ALLOWED_TABLES.has(table)) {
        throw new Error('Invalid table name');
    }
    const result = await pool.query(`SELECT loginAttempts FROM ${table} WHERE id = $1`, [id]);
    const user = result.rows[0];
    const attempts = (user?.loginattempts || user?.loginAttempts || 0) + 1; // PG lowercases unquoted identifiers
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
        await pool.query(`UPDATE ${table} SET loginAttempts = $1, lockedUntil = $2 WHERE id = $3`, [attempts, lockUntil, id]);
    } else {
        await pool.query(`UPDATE ${table} SET loginAttempts = $1 WHERE id = $2`, [attempts, id]);
    }
}

async function resetLoginAttempts(table, id) {
    if (!ALLOWED_TABLES.has(table)) {
        throw new Error('Invalid table name');
    }
    await pool.query(`UPDATE ${table} SET loginAttempts = 0, lockedUntil = NULL WHERE id = $1`, [id]);
}

// ═══════════════════════════════════════
//  OTP
// ═══════════════════════════════════════
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

async function sendOTPEmail(email, otp, name) {
    if (!transporter) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`📧 OTP for ${email}: ${otp}`);
        }
        return true;
    }
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: '[NinjaHackers] Verify Your Email - OTP',
            html: `<div style="font-family:sans-serif;padding:2rem;background:#0a1628;color:#c8d8e8;border-radius:12px;max-width:500px;">
        <h2 style="color:#00ff88;margin-bottom:.5rem;">🥷 NinjaHackers</h2>
        <p>Hi ${name},</p>
        <p>Your verification code is:</p>
        <div style="background:#020508;border:2px solid #00ff88;border-radius:8px;text-align:center;padding:1.5rem;margin:1rem 0;">
          <span style="font-size:2rem;font-weight:700;letter-spacing:8px;color:#00ff88;">${otp}</span>
        </div>
        <p style="font-size:.85rem;color:#5a7a9a;">This code expires in <b>10 minutes</b>. Don't share it with anyone.</p>
        <p style="font-size:.75rem;color:#5a7a9a;margin-top:1.5rem;">If you didn't request this, ignore this email.</p>
      </div>`
        });
        return true;
    } catch (err) {
        console.error('Email send error:', err.message);
        return false;
    }
}

async function sendEnrollmentEmail(studentId, course, priceLabel) {
    const result = await pool.query('SELECT name, email FROM students WHERE id = $1', [studentId]);
    const student = result.rows[0];
    if (!student) return;
    if (!transporter) {
        console.log(`🎓 Enrollment confirmation for ${student.email}: ${course.title} (${priceLabel}) — email not configured`);
        return;
    }
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: student.email,
            subject: `[NinjaHackers] Enrolled: ${course.title}`,
            html: `<div style="font-family:sans-serif;padding:2rem;background:#0a1628;color:#c8d8e8;border-radius:12px;max-width:500px;">
                <h2 style="color:#00ff88;margin-bottom:.5rem;">🥷 NinjaHackers</h2>
                <p>Hi ${student.name},</p>
                <p>You have been successfully enrolled in:</p>
                <div style="background:#020508;border:2px solid #00ff88;border-radius:8px;padding:1.2rem;margin:1rem 0;">
                    <div style="font-size:1.2rem;font-weight:700;color:#00ff88;margin-bottom:.5rem;">${course.title}</div>
                    <div style="font-size:.85rem;color:#5a7a9a;">
                        <span style="margin-right:1rem;">💰 ${priceLabel}</span>
                        <span>📅 ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                </div>
                <a href="https://bninjahacker.site/learn" style="display:inline-block;background:#00ff88;color:#000;padding:.7rem 1.5rem;border-radius:6px;text-decoration:none;font-weight:700;margin-top:.5rem;">🎓 Start Learning</a>
                <p style="font-size:.75rem;color:#5a7a9a;margin-top:1.5rem;">Access your course anytime at bninjahacker.site/learn</p>
            </div>`
        });
    } catch (err) { console.error('Enrollment email error:', err.message); }
}

// ═══════════════════════════════════════
//  SECURITY LOG
// ═══════════════════════════════════════
async function logSecurity(event, ip, details) {
    try {
        await pool.query('INSERT INTO security_logs (event, ip, details) VALUES ($1,$2,$3)', [event, ip || '', details || '']);
    } catch (err) {
        console.error('Failed to log security event:', err);
    }
}

function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection.remoteAddress;
}

// ═══════════════════════════════════════
//  EXPRESS APP
// ═══════════════════════════════════════
const app = express();

// Security headers removed temporarily to unblock UI resources

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'ninjasid',
    cookie: {
        maxAge: 4 * 60 * 60 * 1000, // 4 hours (not 7 days)
        httpOnly: true,
        sameSite: 'strict', // strict — cookies not sent on cross-site requests
        secure: false // Set to true in production with HTTPS
    }
}));

// ─── SESSION FINGERPRINT (anti-cookie-theft) ───
// Binds session to IP + User-Agent. Stolen cookies fail on another device.
const SESSION_INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 min inactivity logout
app.use((req, res, next) => {
    if (!req.session) return next();
    const fingerprint = `${getClientIP(req)}|${(req.headers['user-agent'] || '').substring(0, 100)}`;
    // If session has a fingerprint, verify it matches
    if (req.session._fingerprint && req.session._fingerprint !== fingerprint) {
        logSecurity('SESSION_HIJACK_ATTEMPT', getClientIP(req), `Expected: ${req.session._fingerprint.split('|')[0]}`);
        req.session.destroy();
        return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }
    // Check inactivity timeout
    if (req.session._lastActivity && (Date.now() - req.session._lastActivity > SESSION_INACTIVITY_TIMEOUT)) {
        const who = req.session.studentEmail || req.session.username || 'unknown';
        logSecurity('SESSION_TIMEOUT', getClientIP(req), who);
        req.session.destroy();
        return res.status(401).json({ error: 'Session expired due to inactivity. Please log in again.' });
    }
    req.session._lastActivity = Date.now();
    next();
});

// Block access to sensitive files
app.use((req, res, next) => {
    const blocked = ['.env', '.data', 'database.db', '.git', 'node_modules'];
    const reqPath = req.path.toLowerCase();
    for (const b of blocked) {
        if (reqPath.includes(b)) return res.status(403).send('Forbidden');
    }
    next();
});

// Global rate limiter: 100 req/min per IP
app.use((req, res, next) => {
    const ip = getClientIP(req);
    if (!rateLimit(`global:${ip}`, 100, 60000)) {
        logSecurity('RATE_LIMIT_GLOBAL', ip, req.path);
        return res.status(429).json({ error: 'Too many requests. Slow down.' });
    }
    next();
});

// Static files
app.use('/uploads', express.static(uploadsDir));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/learn', express.static(path.join(__dirname, 'learn')));
app.use(express.static(__dirname, { index: 'index.html', extensions: ['html'] }));

// ═══════════════════════════════════════
//  AUTH MIDDLEWARE
// ═══════════════════════════════════════
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    res.status(401).json({ error: 'Admin login required.' });
}

function requireStudent(req, res, next) {
    if (req.session && req.session.studentId) return next();
    res.status(401).json({ error: 'Please log in to continue.' });
}

// ═══════════════════════════════════════
//  ADMIN AUTH (with brute force protection)
// ═══════════════════════════════════════
app.post('/api/admin/login', async (req, res) => {
    const ip = getClientIP(req);
    // Rate limit: 5 attempts per 15 min
    if (!rateLimit(`admin-login:${ip}`, 5, 15 * 60 * 1000)) {
        logSecurity('ADMIN_LOGIN_RATE_LIMIT', ip, '');
        return res.status(429).json({ error: `Too many login attempts. Wait ${LOCKOUT_MINUTES} minutes.` });
    }

    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Credentials required.' });

    try {
        const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user) {
            logSecurity('ADMIN_LOGIN_FAIL', ip, `unknown user: ${username}`);
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // Account lock check
        if (checkAccountLock(user)) {
            const remaining = Math.ceil((new Date(user.lockeduntil || user.lockedUntil) - new Date()) / 60000);
            logSecurity('ADMIN_LOGIN_LOCKED', ip, username);
            return res.status(423).json({ error: `Account locked. Try again in ${remaining} minutes.` });
        }

        if (!await bcrypt.compare(password, user.passwordhash || user.passwordHash)) {
            await recordFailedLogin('admin_users', user.id);
            logSecurity('ADMIN_LOGIN_FAIL', ip, username);
            const loginAttempts = user.loginattempts || user.loginAttempts || 0;
            const remaining = MAX_LOGIN_ATTEMPTS - (loginAttempts + 1);
            return res.status(401).json({ error: `Invalid credentials.${remaining <= 2 ? ` ${remaining} attempts remaining.` : ''}` });
        }

        await resetLoginAttempts('admin_users', user.id);
        // Set session data with fingerprint binding
        req.session.isAdmin = true;
        req.session.username = username;
        req.session._fingerprint = `${ip}|${(req.headers['user-agent'] || '').substring(0, 100)}`;
        req.session._lastActivity = Date.now();
        logSecurity('ADMIN_LOGIN_OK', ip, username);
        res.json({ success: true });
    } catch (err) {
        logSecurity('ADMIN_LOGIN_ERROR', ip, err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/logout', (req, res) => {
    const username = req.session.username;
    req.session.destroy(err => {
        logSecurity('ADMIN_LOGOUT', getClientIP(req), username);
        res.clearCookie('ninjasid');
        res.json({ success: true });
    });
});

app.get('/api/admin/check', (req, res) => {
    res.json({ authenticated: !!(req.session && req.session.isAdmin) });
});

// ═══════════════════════════════════════
//  STUDENT AUTH (with OTP, domain check, brute force)
// ═══════════════════════════════════════
app.post('/api/student/signup', async (req, res) => {
    const ip = getClientIP(req);
    if (!rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many signup attempts. Try again later.' });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required.' });
    if (name.length > 100) return res.status(400).json({ error: 'Name too long.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address.' });

    // Email domain check
    if (!isAllowedEmail(email)) {
        return res.status(400).json({ error: 'Please use a valid email from Gmail, Outlook, Yahoo, or other major providers.' });
    }

    try {
        const existing = await pool.query('SELECT id FROM students WHERE email = $1', [email.toLowerCase()]);
        if (existing.rows.length > 0) return res.status(409).json({ error: 'An account with this email already exists.' });

        // Password strength check
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
            return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and a number.' });
        }

        const hash = await bcrypt.hash(password, 12);
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        const insert = await pool.query(
            'INSERT INTO students (name, email, passwordHash, emailVerified, otpCode, otpExpiry) VALUES ($1, $2, $3, 0, $4, $5) RETURNING id',
            [name.trim(), email.toLowerCase().trim(), hash, otp, otpExpiry]
        );

        // Send OTP
        await sendOTPEmail(email.toLowerCase().trim(), otp, name.trim());

        logSecurity('STUDENT_SIGNUP', ip, email.toLowerCase());
        res.json({
            success: true,
            requiresVerification: true,
            email: email.toLowerCase().trim(),
            message: 'Account created! Check your email for the verification code.'
        });
    } catch (err) {
        logSecurity('STUDENT_SIGNUP_ERROR', ip, err.message);
        res.status(500).json({ error: 'Server error during signup' });
    }
});

app.post('/api/student/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required.' });

    const ip = getClientIP(req);
    if (!rateLimit(`otp:${ip}`, 10, 15 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many attempts.' });
    }

    try {
        const result = await pool.query('SELECT * FROM students WHERE email = $1', [email.toLowerCase()]);
        const student = result.rows[0];
        if (!student) return res.status(404).json({ error: 'Account not found.' });

        if (student.emailverified || student.emailVerified) {
            // Already verified, just log them in
            req.session.studentId = student.id;
            req.session.studentName = student.name;
            req.session.studentEmail = student.email;
            return res.json({ success: true, message: 'Email already verified.' });
        }

        const otpCode = student.otpcode || student.otpCode;
        if (!otpCode || otpCode !== otp.trim()) {
            logSecurity('OTP_FAIL', ip, email);
            return res.status(400).json({ error: 'Invalid verification code.' });
        }

        const otpExpiry = student.otpexpiry || student.otpExpiry;
        if (new Date(otpExpiry) < new Date()) {
            return res.status(400).json({ error: 'Code expired. Please request a new one.' });
        }

        // Verify and login
        await pool.query('UPDATE students SET emailVerified = 1, otpCode = NULL, otpExpiry = NULL WHERE id = $1', [student.id]);
        req.session.studentId = student.id;
        req.session.studentName = student.name;
        req.session.studentEmail = student.email;
        logSecurity('OTP_VERIFIED', ip, email);
        res.json({ success: true, student: { id: student.id, name: student.name, email: student.email } });
    } catch (err) {
        logSecurity('OTP_ERROR', ip, err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/student/resend-otp', async (req, res) => {
    const { email } = req.body;
    const ip = getClientIP(req);
    if (!rateLimit(`resend-otp:${ip}`, 3, 10 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many resend attempts. Wait 10 minutes.' });
    }

    try {
        const result = await pool.query('SELECT * FROM students WHERE email = $1', [email?.toLowerCase()]);
        const student = result.rows[0];
        if (!student) return res.status(404).json({ error: 'Account not found.' });
        if (student.emailverified || student.emailVerified) return res.json({ success: true, message: 'Already verified. Please login.' });

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        await pool.query('UPDATE students SET otpCode = $1, otpExpiry = $2 WHERE id = $3', [otp, otpExpiry, student.id]);

        await sendOTPEmail(student.email, otp, student.name);
        res.json({ success: true, message: 'New code sent.' });
    } catch (err) {
        logSecurity('RESEND_OTP_ERROR', ip, err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/student/login', async (req, res) => {
    const ip = getClientIP(req);
    if (!rateLimit(`student-login:${ip}`, 10, 15 * 60 * 1000)) {
        logSecurity('STUDENT_LOGIN_RATE_LIMIT', ip, '');
        return res.status(429).json({ error: 'Too many login attempts. Wait 15 minutes.' });
    }

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

    try {
        const result = await pool.query('SELECT * FROM students WHERE email = $1', [email.toLowerCase()]);
        const student = result.rows[0];
        if (!student) {
            logSecurity('STUDENT_LOGIN_FAIL', ip, `unknown: ${email}`);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Account lock
        if (checkAccountLock(student)) {
            const lockedUntil = student.lockeduntil || student.lockedUntil;
            const remaining = Math.ceil((new Date(lockedUntil) - new Date()) / 60000);
            return res.status(423).json({ error: `Account locked. Try again in ${remaining} minutes.` });
        }

        if (!await bcrypt.compare(password, student.passwordhash || student.passwordHash)) {
            await recordFailedLogin('students', student.id);
            logSecurity('STUDENT_LOGIN_FAIL', ip, email);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Must be verified
        if (!student.emailverified && !student.emailVerified) {
            return res.status(403).json({ error: 'Email not verified.', requiresVerification: true, email: student.email });
        }

        await resetLoginAttempts('students', student.id);
        // Set session data with fingerprint binding
        req.session.studentId = student.id;
        req.session.studentName = student.name;
        req.session.studentEmail = student.email;
        req.session._fingerprint = `${ip}|${(req.headers['user-agent'] || '').substring(0, 100)}`;
        req.session._lastActivity = Date.now();
        logSecurity('STUDENT_LOGIN_OK', ip, email);
        res.json({ success: true, student: { id: student.id, name: student.name, email: student.email } });
    } catch (err) {
        logSecurity('STUDENT_LOGIN_ERROR', ip, err.message);
        res.status(500).json({ error: 'Server error during login' });
    }
});

app.post('/api/student/logout', (req, res) => {
    req.session.destroy(err => {
        res.clearCookie('ninjasid');
        res.json({ success: true });
    });
});

app.get('/api/student/check', (req, res) => {
    if (req.session && req.session.studentId) {
        res.json({ authenticated: true, student: { id: req.session.studentId, name: req.session.studentName, email: req.session.studentEmail } });
    } else {
        res.json({ authenticated: false });
    }
});

// ─── FORGOT PASSWORD ───
app.post('/api/student/forgot-password', async (req, res) => {
    const { email } = req.body;
    const ip = getClientIP(req);
    if (!email) return res.status(400).json({ error: 'Email required.' });
    if (!rateLimit(`forgot:${ip}`, 3, 60 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    try {
        const result = await pool.query('SELECT * FROM students WHERE email = $1', [email.toLowerCase()]);
        const student = result.rows[0];
        if (!student) {
            // Don't reveal if email exists — return success anyway
            return res.json({ success: true, message: 'If this email is registered, you will receive a reset code.' });
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        await pool.query('UPDATE students SET otpCode = $1, otpExpiry = $2 WHERE id = $3', [otp, otpExpiry, student.id]);

        // Send reset OTP email
        if (transporter) {
            try {
                await transporter.sendMail({
                    from: process.env.SMTP_FROM || process.env.SMTP_USER,
                    to: student.email,
                    subject: '[NinjaHackers] Password Reset Code',
                    html: `<div style="font-family:sans-serif;padding:2rem;background:#0a1628;color:#c8d8e8;border-radius:12px;max-width:500px;">
                    <h2 style="color:#00ff88;margin-bottom:.5rem;">🥷 NinjaHackers</h2>
                    <p>Hi ${student.name},</p>
                    <p>You requested a password reset. Your code is:</p>
                    <div style="background:#020508;border:2px solid #ff8c00;border-radius:8px;text-align:center;padding:1.5rem;margin:1rem 0;">
                      <span style="font-size:2rem;font-weight:700;letter-spacing:8px;color:#ff8c00;">${otp}</span>
                    </div>
                    <p style="font-size:.85rem;color:#5a7a9a;">This code expires in <b>10 minutes</b>. If you didn't request this, ignore this email.</p>
                </div>`
                });
            } catch (err) { console.error('Email error:', err.message); }
        } else {
            console.log(`🔑 PASSWORD RESET OTP for ${student.email}: ${otp}`);
        }

        logSecurity('PASSWORD_RESET_REQUEST', ip, email);
        res.json({ success: true, message: 'If this email is registered, you will receive a reset code.' });
    } catch (err) {
        logSecurity('PASSWORD_RESET_ERROR', ip, err.message);
        res.status(500).json({ error: 'Server error processing request.' });
    }
});

app.post('/api/student/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    const ip = getClientIP(req);
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'All fields required.' });

    if (!rateLimit(`reset:${ip}`, 10, 15 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many attempts.' });
    }

    // Password strength check
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and a number.' });
    }

    try {
        const result = await pool.query('SELECT * FROM students WHERE email = $1', [email.toLowerCase()]);
        const student = result.rows[0];
        if (!student) return res.status(404).json({ error: 'Account not found.' });


        const safeEqual = (a, b) => {
            const ba = Buffer.from(a), bb = Buffer.from(b);
            return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
        };
        if (!student.otpCode || !safeEqual(student.otpCode, otp.trim())) {
            logSecurity('PASSWORD_RESET_FAIL', ip, email);
            return res.status(400).json({ error: 'Invalid reset code.' });
        }

        if (new Date(student.otpExpiry) < new Date()) {
            return res.status(400).json({ error: 'Code expired. Please request a new one.' });
        }

        // Reset password
        const hash = await bcrypt.hash(newPassword, 12);
        await pool.query('UPDATE students SET passwordHash = $1, otpCode = NULL, otpExpiry = NULL, emailVerified = 1, loginAttempts = 0, lockedUntil = NULL WHERE id = $2', [hash, student.id]);

        logSecurity('PASSWORD_RESET_OK', ip, email);
        res.json({ success: true, message: 'Password reset! You can now log in.' });
    } catch (err) {
        logSecurity('PASSWORD_RESET_ERROR', ip, err.message);
        res.status(500).json({ error: 'Server error processing password reset.' });
    }
});

// ═══════════════════════════════════════
//  STUDENT — ENROLLED COURSES
// ═══════════════════════════════════════
app.get('/api/student/courses', requireStudent, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.*, e.enrolledAt FROM enrollments e JOIN courses c ON c.id = e.courseId WHERE e.studentId = $1 ORDER BY e.enrolledAt DESC`,
            [req.session.studentId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve courses.' });
    }
});

app.get('/api/student/courses/:id', requireStudent, async (req, res) => {
    try {
        const enrollmentRes = await pool.query('SELECT id FROM enrollments WHERE studentId = $1 AND courseId = $2', [req.session.studentId, req.params.id]);
        if (enrollmentRes.rows.length === 0) return res.status(403).json({ error: 'You are not enrolled in this course.' });

        const courseRes = await pool.query('SELECT * FROM courses WHERE id = $1', [req.params.id]);
        const course = courseRes.rows[0];
        if (!course) return res.status(404).json({ error: 'Course not found.' });

        const modulesRes = await pool.query('SELECT * FROM course_modules WHERE courseId = $1 ORDER BY sortOrder', [req.params.id]);
        const modules = modulesRes.rows;

        for (const mod of modules) {
            const itemsRes = await pool.query('SELECT * FROM module_items WHERE moduleId = $1 ORDER BY sortOrder', [mod.id]);
            mod.items = itemsRes.rows;
            // Hide live class links until scheduled time (TAMPER-PROOF: link never sent to client)
            for (const item of mod.items) {
                if (item.type === 'live_class' && item.scheduledAt) {
                    const scheduledTime = new Date(item.scheduledAt).getTime();
                    const now = Date.now();
                    if (now < scheduledTime) {
                        item.link = ''; // Don't send link to client
                        item.isLive = false;
                    } else {
                        item.isLive = true;
                    }
                } else if (item.type === 'live_class') {
                    item.isLive = true; // No schedule = always available
                }
            }
        }
        course.modules = modules;
        res.json(course);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve course details.' });
    }
});

// ═══════════════════════════════════════
//  PAYMENT — RAZORPAY
// ═══════════════════════════════════════
app.post('/api/payment/create-order', requireStudent, async (req, res) => {
    const { courseId, couponCode } = req.body;
    try {
        const courseRes = await pool.query('SELECT id, title, price FROM courses WHERE id = $1 AND published = 1', [courseId]);
        const course = courseRes.rows[0];
        if (!course) return res.status(404).json({ error: 'Course not found.' });

        const existingRes = await pool.query('SELECT id FROM enrollments WHERE studentId = $1 AND courseId = $2', [req.session.studentId, courseId]);
        if (existingRes.rows.length > 0) return res.status(400).json({ error: 'Already enrolled.' });

        let finalPrice = course.price;
        let appliedCouponId = null;

        if (couponCode) {
            const couponRes = await pool.query('SELECT * FROM coupons WHERE code=$1 AND active=1', [couponCode.toUpperCase()]);
            const coupon = couponRes.rows[0];
            if (!coupon) return res.status(404).json({ error: 'Invalid coupon code.' });
            if (coupon.expiresat && new Date(coupon.expiresat) < new Date()) return res.status(400).json({ error: 'Coupon expired.' });
            if (coupon.usedcount >= coupon.maxuses) return res.status(400).json({ error: 'Coupon fully used.' });
            if (coupon.courseid && coupon.courseid !== parseInt(courseId)) return res.status(400).json({ error: 'Coupon is not valid for this course.' });
            if (coupon.studentemail && coupon.studentemail.toLowerCase() !== req.session.studentEmail.toLowerCase()) return res.status(400).json({ error: 'Coupon is not valid for your account.' });

            const usedRes = await pool.query('SELECT id FROM coupon_usage WHERE couponId=$1 AND studentId=$2 AND courseId=$3', [coupon.id, req.session.studentId, courseId]);
            if (usedRes.rows.length > 0) return res.status(400).json({ error: 'You have already used this coupon for this course.' });

            let discount = coupon.discounttype === 'percent' ? Math.round(course.price * coupon.discountvalue / 100) : coupon.discountvalue;
            if (discount > course.price) discount = course.price;
            finalPrice = course.price - discount;
            appliedCouponId = coupon.id;
        }

        if (finalPrice <= 0) {
            await pool.query('INSERT INTO enrollments (studentId, courseId) VALUES ($1, $2)', [req.session.studentId, courseId]);
            await pool.query('INSERT INTO payments (studentId, courseId, amount, status, couponId) VALUES ($1, $2, 0, $3, $4)', [req.session.studentId, courseId, 'free', appliedCouponId]);
            if (appliedCouponId) {
                await pool.query('INSERT INTO coupon_usage (couponId, studentId, courseId) VALUES ($1, $2, $3)', [appliedCouponId, req.session.studentId, courseId]);
                await pool.query('UPDATE coupons SET usedCount = usedCount + 1 WHERE id=$1', [appliedCouponId]);
            }
            // Send enrollment confirmation email
            await sendEnrollmentEmail(req.session.studentId, course, 'FREE');
            return res.json({ success: true, free: true });
        }

        if (!razorpayInstance) return res.status(503).json({ error: 'Payment gateway not configured.' });

        const amountInPaise = finalPrice * 100;
        const order = await razorpayInstance.orders.create({
            amount: amountInPaise, currency: 'INR',
            receipt: `order_${req.session.studentId}_${courseId}_${Date.now()}`,
            notes: { studentId: String(req.session.studentId), courseId: String(courseId) }
        });

        await pool.query('INSERT INTO payments (studentId, courseId, razorpayOrderId, amount, status, couponId) VALUES ($1, $2, $3, $4, $5, $6)', [req.session.studentId, courseId, order.id, finalPrice, 'pending', appliedCouponId]);
        res.json({ success: true, order: { id: order.id, amount: order.amount, currency: order.currency }, key: process.env.RAZORPAY_KEY_ID, course: { title: course.title, price: course.price, finalPrice } });

    } catch (err) {
        console.error('Razorpay/DB error:', err);
        res.status(500).json({ error: 'Failed to create order.' });
    }
});

app.post('/api/payment/verify', requireStudent, async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ error: 'Missing payment data.' });

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

    if (expected !== razorpay_signature) {
        logSecurity('PAYMENT_TAMPER', getClientIP(req), `order:${razorpay_order_id} student:${req.session.studentId}`);
        return res.status(400).json({ error: 'Payment verification failed. Signature mismatch.' });
    }

    try {
        const paymentRes = await pool.query('SELECT * FROM payments WHERE razorpayOrderId = $1 AND studentId = $2', [razorpay_order_id, req.session.studentId]);
        const payment = paymentRes.rows[0];
        if (!payment) return res.status(404).json({ error: 'Payment not found.' });

        await pool.query('UPDATE payments SET razorpayPaymentId=$1, razorpaySignature=$2, status=$3 WHERE id=$4', [razorpay_payment_id, razorpay_signature, 'completed', payment.id]);

        // Register coupon usage if attached to the payment record
        if (payment.couponid) {
            try {
                await pool.query('INSERT INTO coupon_usage (couponId, studentId, courseId) VALUES ($1, $2, $3)', [payment.couponid, req.session.studentId, payment.courseid]);
                await pool.query('UPDATE coupons SET usedCount = usedCount + 1 WHERE id=$1', [payment.couponid]);
            } catch (e) {
                console.error('Error recording coupon usage:', e);
            }
        }

        try {
            await pool.query('INSERT INTO enrollments (studentId, courseId) VALUES ($1, $2)', [req.session.studentId, payment.courseid]);
        } catch (e) {
            // Might already be enrolled
        }

        // Send enrollment confirmation email
        const paidCourseRes = await pool.query('SELECT title, price FROM courses WHERE id=$1', [payment.courseid]);
        if (paidCourseRes.rows.length > 0) {
            await sendEnrollmentEmail(req.session.studentId, paidCourseRes.rows[0], `₹${payment.amount}`);
        }

        logSecurity('PAYMENT_OK', getClientIP(req), `order:${razorpay_order_id}`);
        res.json({ success: true, message: 'Payment verified! You are now enrolled.' });
    } catch (err) {
        console.error('Payment verify DB error:', err);
        res.status(500).json({ error: 'Failed to verify payment.' });
    }
});

// ═══════════════════════════════════════
//  PUBLIC — COURSES
// ═══════════════════════════════════════
app.get('/api/courses', async (req, res) => {
    try {
        const coursesRes = await pool.query('SELECT id, title, code, description, price, coverImage, instructor, duration, level FROM courses WHERE published=1 ORDER BY id DESC');
        const courses = coursesRes.rows;

        for (const c of courses) {
            const mCountRes = await pool.query('SELECT COUNT(*) as count FROM course_modules WHERE courseId=$1', [c.id]);
            c.moduleCount = parseInt(mCountRes.rows[0].count, 10);

            const iCountRes = await pool.query('SELECT COUNT(*) as count FROM module_items mi JOIN course_modules cm ON mi.moduleId=cm.id WHERE cm.courseId=$1', [c.id]);
            c.itemCount = parseInt(iCountRes.rows[0].count, 10);
        }

        if (req.session?.studentId) {
            const enrolledRes = await pool.query('SELECT courseId FROM enrollments WHERE studentId=$1', [req.session.studentId]);
            const ids = new Set(enrolledRes.rows.map(e => e.courseid || e.courseId));
            for (const c of courses) c.enrolled = ids.has(c.id);
        }
        res.json(courses);
    } catch (err) {
        console.error('Error fetching courses:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ═══════════════════════════════════════
//  PUBLIC — BLOGS
// ═══════════════════════════════════════
app.get('/api/blogs', async (req, res) => {
    try {
        const blogsRes = await pool.query('SELECT id, title, author, excerpt, tags, date, readTime, contentHtml, coverImage, createdAt FROM blogs WHERE published=1 ORDER BY id DESC');
        res.json(blogsRes.rows.map(b => ({ ...b, tags: JSON.parse(b.tags), content: b.contenthtml || b.contentHtml })));
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/blogs/:id', async (req, res) => {
    try {
        const blogRes = await pool.query('SELECT id, title, author, excerpt, tags, date, readTime, contentHtml, coverImage, createdAt FROM blogs WHERE id=$1 AND published=1', [req.params.id]);
        const blog = blogRes.rows[0];
        if (!blog) return res.status(404).json({ error: 'Not found.' });
        blog.tags = JSON.parse(blog.tags);
        blog.content = blog.contenthtml || blog.contentHtml;
        res.json(blog);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/blogs/:id/comments', async (req, res) => {
    try {
        const commentsRes = await pool.query('SELECT id, name, comment, createdAt FROM comments WHERE blogId=$1 ORDER BY createdAt DESC', [req.params.id]);
        res.json(commentsRes.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/blogs/:id/comments', async (req, res) => {
    const ip = getClientIP(req);
    if (!rateLimit(`comment:${ip}`, 5, 60000)) return res.status(429).json({ error: 'Too many comments. Wait a minute.' });
    const { name, comment } = req.body;
    if (!name || !comment) return res.status(400).json({ error: 'Name and comment required.' });
    if (name.length > 100 || comment.length > 5000) return res.status(400).json({ error: 'Input too long.' });

    try {
        const blogRes = await pool.query('SELECT id FROM blogs WHERE id=$1 AND published=1', [req.params.id]);
        if (blogRes.rows.length === 0) return res.status(404).json({ error: 'Not found.' });

        const r = await pool.query(
            'INSERT INTO comments (blogId, name, comment) VALUES ($1, $2, $3) RETURNING id',
            [req.params.id, name.trim(), comment.trim()]
        );
        res.json({ success: true, id: r.rows[0].id });
    } catch (err) {
        console.error('Comment error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ═══════════════════════════════════════
//  CONTACT
// ═══════════════════════════════════════
app.post('/api/contact', async (req, res) => {
    const ip = getClientIP(req);
    if (!rateLimit(`contact:${ip}`, 3, 60 * 60 * 1000)) return res.status(429).json({ error: 'Too many messages. Try again later.' });
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'All fields required.' });
    if (name.length > 100 || email.length > 200 || message.length > 10000) return res.status(400).json({ error: 'Too long.' });

    try {
        await pool.query(
            'INSERT INTO contact_messages (name, email, subject, message) VALUES ($1, $2, $3, $4)',
            [name.trim(), email.trim(), (subject || '').trim(), message.trim()]
        );

        if (transporter) {
            try {
                await transporter.sendMail({
                    from: process.env.SMTP_FROM || process.env.SMTP_USER,
                    to: process.env.CONTACT_TO || process.env.SMTP_USER,
                    subject: `[NinjaHackers] Contact: ${subject || 'New Message'}`,
                    html: `<h3>New Contact</h3><p><b>From:</b> ${name} (${email})</p><p><b>Subject:</b> ${subject || 'N/A'}</p><p>${message.replace(/\n/g, '<br>')}</p>`
                });
            } catch (err) {
                console.error('Email error:', err);
            }
        }
        res.json({ success: true, message: "Message sent! We'll get back to you soon." });
    } catch (err) {
        console.error('Contact error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ═══════════════════════════════════════
//  ADMIN — UPLOAD
// ═══════════════════════════════════════
app.post('/api/admin/upload', requireAdmin, (req, res) => {
    const { image, filename } = req.body;
    if (!image) return res.status(400).json({ error: 'No image.' });
    // const matches = image.match(/^data:image\/([\w+]+);base64,(.+)$/);
    const ALLOWED_IMAGE_TYPES = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    if (!ALLOWED_IMAGE_TYPES.includes(ext)) {
        return res.status(400).json({ error: 'Only PNG, JPG, GIF, WebP allowed.' });
    }


    // if (!matches) return res.status(400).json({ error: 'Invalid format.' });
    // const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const data = Buffer.from(matches[2], 'base64');
    if (data.length > 5 * 1024 * 1024) return res.status(400).json({ error: 'Max 5MB.' });
    const safeName = (filename || 'img').replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueName = `${Date.now()}_${safeName}.${ext}`;
    fs.writeFileSync(path.join(uploadsDir, uniqueName), data);
    res.json({ success: true, url: `/uploads/${uniqueName}` });
});

// ═══════════════════════════════════════
//  ADMIN — BLOG CRUD
// ═══════════════════════════════════════
app.get('/api/admin/blogs', requireAdmin, async (req, res) => {
    try {
        const blogsRes = await pool.query('SELECT id, title, author, excerpt, tags, date, readTime, content, coverImage, published, createdAt, updatedAt FROM blogs ORDER BY id DESC');
        res.json(blogsRes.rows.map(b => ({ ...b, tags: JSON.parse(b.tags) })));
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/blogs', requireAdmin, async (req, res) => {
    const { title, author, excerpt, tags, date, readTime, content, coverImage, published } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required.' });
    const now = new Date().toISOString();
    try {
        const r = await pool.query(
            'INSERT INTO blogs (title, author, excerpt, tags, date, readTime, content, contentHtml, coverImage, published, createdAt, updatedAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id',
            [title, author || 'NinjaHacker', excerpt || '', JSON.stringify(tags || []), date || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), readTime || '5 min read', content, marked(content), coverImage || '', published !== undefined ? (published ? 1 : 0) : 1, now, now]
        );
        res.json({ success: true, id: r.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/admin/blogs/:id', requireAdmin, async (req, res) => {
    const { title, author, excerpt, tags, date, readTime, content, coverImage, published } = req.body;
    try {
        const blogRes = await pool.query('SELECT id FROM blogs WHERE id=$1', [req.params.id]);
        if (blogRes.rows.length === 0) return res.status(404).json({ error: 'Not found.' });

        await pool.query(
            `UPDATE blogs SET title=$1, author=$2, excerpt=$3, tags=$4, date=$5, readTime=$6, content=$7, contentHtml=$8, coverImage=$9, published=$10, updatedAt=CURRENT_TIMESTAMP WHERE id=$11`,
            [title, author || 'NinjaHacker', excerpt || '', JSON.stringify(tags || []), date || '', readTime || '5 min read', content || '', marked(content || ''), coverImage || '', published !== undefined ? (published ? 1 : 0) : 1, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/blogs/:id', requireAdmin, async (req, res) => {
    await pool.query('DELETE FROM blogs WHERE id=$1', [req.params.id]);
    res.json({ success: true });
});

app.delete('/api/admin/comments/:id', requireAdmin, async (req, res) => {
    await pool.query('DELETE FROM comments WHERE id=$1', [req.params.id]);
    res.json({ success: true });
});

// ═══════════════════════════════════════
//  ADMIN — COURSE CRUD
// ═══════════════════════════════════════
app.get('/api/admin/courses', requireAdmin, async (req, res) => {
    try {
        const coursesRes = await pool.query('SELECT * FROM courses ORDER BY id DESC');
        for (const c of coursesRes.rows) {
            const eCountRes = await pool.query('SELECT COUNT(*) as c FROM enrollments WHERE courseId=$1', [c.id]);
            c.enrollmentCount = parseInt(eCountRes.rows[0].c, 10);

            const mCountRes = await pool.query('SELECT COUNT(*) as c FROM course_modules WHERE courseId=$1', [c.id]);
            c.moduleCount = parseInt(mCountRes.rows[0].c, 10);
        }
        res.json(coursesRes.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/courses', requireAdmin, async (req, res) => {
    const { title, code, description, price, coverImage, instructor, duration, level, published, startDate } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required.' });
    try {
        const r = await pool.query(
            'INSERT INTO courses (title, code, description, price, coverImage, instructor, duration, level, published, startDate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
            [title, code || '', description || '', price || 0, coverImage || '', instructor || 'NinjaHacker', duration || '', level || 'Beginner', published !== undefined ? (published ? 1 : 0) : 1, startDate || null]
        );
        res.json({ success: true, id: r.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/admin/courses/:id', requireAdmin, async (req, res) => {
    const { title, code, description, price, coverImage, instructor, duration, level, published, startDate } = req.body;
    try {
        await pool.query(
            `UPDATE courses SET title=$1, code=$2, description=$3, price=$4, coverImage=$5, instructor=$6, duration=$7, level=$8, published=$9, startDate=$10, updatedAt=CURRENT_TIMESTAMP WHERE id=$11`,
            [title, code || '', description || '', price || 0, coverImage || '', instructor || 'NinjaHacker', duration || '', level || 'Beginner', published !== undefined ? (published ? 1 : 0) : 1, startDate || null, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/courses/:id', requireAdmin, async (req, res) => {
    await pool.query('DELETE FROM courses WHERE id=$1', [req.params.id]);
    res.json({ success: true });
});

// Modules
app.get('/api/admin/courses/:id/modules', requireAdmin, async (req, res) => {
    try {
        const modulesRes = await pool.query('SELECT * FROM course_modules WHERE courseId=$1 ORDER BY sortOrder', [req.params.id]);
        const modules = modulesRes.rows;
        for (const m of modules) {
            const itemsRes = await pool.query('SELECT * FROM module_items WHERE moduleId=$1 ORDER BY sortOrder', [m.id]);
            m.items = itemsRes.rows;
        }
        res.json(modules);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/modules', requireAdmin, async (req, res) => {
    const { courseId, title } = req.body;
    if (!courseId || !title) return res.status(400).json({ error: 'Required.' });
    try {
        const maxRes = await pool.query('SELECT COALESCE(MAX(sortOrder), -1) as mx FROM course_modules WHERE courseId=$1', [courseId]);
        const maxOrder = parseInt(maxRes.rows[0].mx, 10);
        const r = await pool.query(
            'INSERT INTO course_modules (courseId, title, sortOrder) VALUES ($1, $2, $3) RETURNING id',
            [courseId, title, maxOrder + 1]
        );
        res.json({ success: true, id: r.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Reorder modules (swap two modules) — MUST be before /:id route
app.put('/api/admin/modules/reorder', requireAdmin, async (req, res) => {
    const { moduleId, direction, courseId } = req.body;
    if (!moduleId || !direction || !courseId) return res.status(400).json({ error: 'Required.' });
    try {
        const modulesRes = await pool.query('SELECT id, sortOrder FROM course_modules WHERE courseId=$1 ORDER BY sortOrder', [courseId]);
        const modules = modulesRes.rows;
        const idx = modules.findIndex(m => m.id === parseInt(moduleId, 10));
        if (idx < 0) return res.status(404).json({ error: 'Module not found.' });

        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= modules.length) return res.json({ success: true }); // already at edge

        const a = modules[idx], b = modules[swapIdx];
        await pool.query('UPDATE course_modules SET sortOrder=$1 WHERE id=$2', [b.sortorder || b.sortOrder, a.id]);
        await pool.query('UPDATE course_modules SET sortOrder=$1 WHERE id=$2', [a.sortorder || a.sortOrder, b.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/admin/modules/:id', requireAdmin, async (req, res) => {
    await pool.query('UPDATE course_modules SET title=$1, sortOrder=$2 WHERE id=$3', [req.body.title, req.body.sortOrder || 0, req.params.id]);
    res.json({ success: true });
});

app.delete('/api/admin/modules/:id', requireAdmin, async (req, res) => {
    await pool.query('DELETE FROM course_modules WHERE id=$1', [req.params.id]);
    res.json({ success: true });
});

// Items
app.post('/api/admin/items', requireAdmin, async (req, res) => {
    const { moduleId, type, title, link, description, sortOrder, scheduledAt } = req.body;
    if (!moduleId || !title) return res.status(400).json({ error: 'Required.' });
    try {
        const r = await pool.query(
            'INSERT INTO module_items (moduleId, type, title, link, description, sortOrder, scheduledAt) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [moduleId, type || 'recorded_class', title, link || '', description || '', sortOrder || 0, scheduledAt || null]
        );
        res.json({ success: true, id: r.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/admin/items/:id', requireAdmin, async (req, res) => {
    await pool.query(
        'UPDATE module_items SET type=$1, title=$2, link=$3, description=$4, sortOrder=$5, scheduledAt=$6 WHERE id=$7',
        [req.body.type || 'recorded_class', req.body.title, req.body.link || '', req.body.description || '', req.body.sortOrder || 0, req.body.scheduledAt || null, req.params.id]
    );
    res.json({ success: true });
});

app.delete('/api/admin/items/:id', requireAdmin, async (req, res) => {
    await pool.query('DELETE FROM module_items WHERE id=$1', [req.params.id]);
    res.json({ success: true });
});

// Enrollments (with source tracking)
app.get('/api/admin/enrollments', requireAdmin, async (req, res) => {
    try {
        const enrollmentsRes = await pool.query(`
            SELECT e.id, e.enrolledAt, e.studentId, e.courseId,
                   s.name as studentName, s.email as studentEmail,
                   c.title as courseTitle, c.code as courseCode
            FROM enrollments e 
            JOIN students s ON s.id=e.studentId 
            JOIN courses c ON c.id=e.courseId 
            ORDER BY e.enrolledAt DESC
        `);
        const enrollments = enrollmentsRes.rows;
        for (const e of enrollments) {
            const paymentRes = await pool.query('SELECT amount, status FROM payments WHERE studentId=$1 AND courseId=$2 AND status IN ($3, $4) ORDER BY createdAt DESC LIMIT 1', [e.studentid || e.studentId, e.courseid || e.courseId, 'completed', 'free']);
            e.paidAmount = paymentRes.rows.length > 0 ? paymentRes.rows[0].amount : null;
        }
        res.json(enrollments);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/enrollments', requireAdmin, async (req, res) => {
    try {
        const sRes = await pool.query('SELECT id FROM students WHERE email=$1', [req.body.studentEmail]);
        if (sRes.rows.length === 0) return res.status(404).json({ error: 'Student not found.' });
        try {
            await pool.query('INSERT INTO enrollments (studentId, courseId) VALUES ($1, $2)', [sRes.rows[0].id, req.body.courseId]);
            res.json({ success: true });
        } catch (e) {
            res.status(400).json({ error: 'Already enrolled.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/enrollments/:id', requireAdmin, async (req, res) => {
    await pool.query('DELETE FROM enrollments WHERE id=$1', [req.params.id]);
    res.json({ success: true });
});

// Students
app.get('/api/admin/students', requireAdmin, async (req, res) => {
    try {
        const studentsRes = await pool.query('SELECT id, name, email, emailVerified, createdAt FROM students ORDER BY id DESC');
        const students = studentsRes.rows;
        for (const s of students) {
            const countRes = await pool.query('SELECT COUNT(*) as c FROM enrollments WHERE studentId=$1', [s.id]);
            s.enrollmentCount = parseInt(countRes.rows[0].c, 10);
        }
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Per-student enrollments (with payment source)
app.get('/api/admin/students/:id/enrollments', requireAdmin, async (req, res) => {
    try {
        const enrollmentsRes = await pool.query(`
            SELECT e.id as enrollmentId, e.courseId, e.enrolledAt,
                   c.title as courseTitle, c.code as courseCode, c.price as coursePrice
            FROM enrollments e
            JOIN courses c ON c.id=e.courseId
            WHERE e.studentId=$1
            ORDER BY e.enrolledAt DESC
        `, [req.params.id]);
        const enrollments = enrollmentsRes.rows;
        for (const e of enrollments) {
            const paymentRes = await pool.query('SELECT amount, status FROM payments WHERE studentId=$1 AND courseId=$2 AND status IN ($3, $4) ORDER BY createdAt DESC LIMIT 1', [req.params.id, e.courseid || e.courseId, 'completed', 'free']);
            e.paidAmount = paymentRes.rows.length > 0 ? paymentRes.rows[0].amount : null; // null = admin assigned
        }
        res.json(enrollments);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Per-student payments
app.get('/api/admin/students/:id/payments', requireAdmin, async (req, res) => {
    try {
        const paymentsRes = await pool.query('SELECT p.*, c.title as courseTitle FROM payments p JOIN courses c ON c.id=p.courseId WHERE p.studentId=$1 ORDER BY p.createdAt DESC', [req.params.id]);
        res.json(paymentsRes.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Payments
app.get('/api/admin/payments', requireAdmin, async (req, res) => {
    try {
        const paymentsRes = await pool.query('SELECT p.*, s.name as studentName, s.email as studentEmail, c.title as courseTitle FROM payments p JOIN students s ON s.id=p.studentId JOIN courses c ON c.id=p.courseId ORDER BY p.createdAt DESC');
        res.json(paymentsRes.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Messages
app.get('/api/admin/messages', requireAdmin, (req, res) => { res.json(db.prepare('SELECT * FROM contact_messages ORDER BY createdAt DESC').all()); });
app.delete('/api/admin/messages/:id', requireAdmin, (req, res) => { db.prepare('DELETE FROM contact_messages WHERE id=?').run(req.params.id); res.json({ success: true }); });

// Security logs
app.get('/api/admin/security-logs', requireAdmin, (req, res) => {
    res.json(db.prepare('SELECT * FROM security_logs ORDER BY createdAt DESC LIMIT 100').all());
});

// ═══════════════════════════════════════
//  QUIZ — ADMIN
// ═══════════════════════════════════════
app.post('/api/admin/quizzes', requireAdmin, (req, res) => {
    const { itemId, passingPercent, maxAttempts, questions } = req.body;
    if (!itemId || !questions?.length) return res.status(400).json({ error: 'itemId and questions required.' });
    try {
        const q = db.prepare('INSERT OR REPLACE INTO quizzes (itemId, passingPercent, maxAttempts) VALUES (?,?,?)').run(itemId, passingPercent || 60, maxAttempts || 3);
        const quizId = db.prepare('SELECT id FROM quizzes WHERE itemId=?').get(itemId).id;
        db.prepare('DELETE FROM quiz_questions WHERE quizId=?').run(quizId);
        const ins = db.prepare('INSERT INTO quiz_questions (quizId,question,optionA,optionB,optionC,optionD,correctOption,sortOrder) VALUES (?,?,?,?,?,?,?,?)');
        questions.forEach((q, i) => ins.run(quizId, q.question, q.optionA, q.optionB, q.optionC || '', q.optionD || '', q.correctOption || 'A', i));
        res.json({ success: true, quizId });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/quizzes/:itemId', requireAdmin, (req, res) => {
    const quiz = db.prepare('SELECT * FROM quizzes WHERE itemId=?').get(req.params.itemId);
    if (!quiz) return res.json({ quiz: null, questions: [] });
    const questions = db.prepare('SELECT * FROM quiz_questions WHERE quizId=? ORDER BY sortOrder').all(quiz.id);
    res.json({ quiz, questions });
});

app.get('/api/admin/quizzes/:itemId/attempts', requireAdmin, (req, res) => {
    const quiz = db.prepare('SELECT id FROM quizzes WHERE itemId=?').get(req.params.itemId);
    if (!quiz) return res.json([]);
    res.json(db.prepare('SELECT qa.*, s.name, s.email FROM quiz_attempts qa JOIN students s ON s.id=qa.studentId WHERE qa.quizId=? ORDER BY qa.createdAt DESC').all(quiz.id));
});

// ═══════════════════════════════════════
//  QUIZ — STUDENT
// ═══════════════════════════════════════
app.get('/api/student/quiz/:itemId', requireStudent, (req, res) => {
    const quiz = db.prepare('SELECT * FROM quizzes WHERE itemId=?').get(req.params.itemId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });
    const questions = db.prepare('SELECT id,question,optionA,optionB,optionC,optionD,sortOrder FROM quiz_questions WHERE quizId=? ORDER BY sortOrder').all(quiz.id);
    const attempts = db.prepare('SELECT * FROM quiz_attempts WHERE studentId=? AND quizId=? ORDER BY createdAt DESC').all(req.session.studentId, quiz.id);
    res.json({ quiz: { id: quiz.id, passingPercent: quiz.passingPercent, maxAttempts: quiz.maxAttempts }, questions, attempts, attemptsUsed: attempts.length });
});

app.post('/api/student/quiz/:itemId/submit', requireStudent, (req, res) => {
    const ip = getClientIP(req);
    if (!rateLimit(`quiz-submit:${ip}`, 30, 60000)) {
        return res.status(429).json({ error: 'Too many requests.' });
    }
    const quiz = db.prepare('SELECT * FROM quizzes WHERE itemId=?').get(req.params.itemId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });
    const attempts = db.prepare('SELECT COUNT(*) as c FROM quiz_attempts WHERE studentId=? AND quizId=?').get(req.session.studentId, quiz.id);
    if (attempts.c >= quiz.maxAttempts) return res.status(400).json({ error: `Max ${quiz.maxAttempts} attempts reached.` });

    const questions = db.prepare('SELECT * FROM quiz_questions WHERE quizId=? ORDER BY sortOrder').all(quiz.id);
    const { answers } = req.body; // { questionId: 'A'|'B'|'C'|'D' }
    let score = 0;
    const results = questions.map(q => {
        const studentAnswer = answers?.[q.id] || '';
        const correct = studentAnswer === q.correctOption;
        if (correct) score++;
        return { questionId: q.id, studentAnswer, correctOption: q.correctOption, correct };
    });
    const percent = Math.round((score / questions.length) * 100);
    const passed = percent >= quiz.passingPercent ? 1 : 0;
    db.prepare('INSERT INTO quiz_attempts (studentId,quizId,score,totalQuestions,passed,answers) VALUES (?,?,?,?,?,?)').run(req.session.studentId, quiz.id, score, questions.length, passed, JSON.stringify(answers));
    if (passed) { try { db.prepare('INSERT OR IGNORE INTO student_progress (studentId,itemId) VALUES (?,?)').run(req.session.studentId, parseInt(req.params.itemId)); } catch (e) { } }
    res.json({ success: true, score, total: questions.length, percent, passed: !!passed, results });
});

// ═══════════════════════════════════════
//  ASSIGNMENT — STUDENT
// ═══════════════════════════════════════
app.post('/api/student/assignment/:itemId/submit', requireStudent, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'File required. Allowed: PDF, ZIP, images (max 10MB).' });
    const existing = db.prepare('SELECT id FROM assignment_submissions WHERE studentId=? AND itemId=?').get(req.session.studentId, req.params.itemId);
    if (existing) {
        db.prepare('UPDATE assignment_submissions SET filePath=?,fileName=?,submittedAt=datetime(\'now\'),grade=NULL,feedback=\'\',gradedAt=NULL WHERE id=?').run(req.file.path, req.file.originalname, existing.id);
    } else {
        db.prepare('INSERT INTO assignment_submissions (studentId,itemId,filePath,fileName) VALUES (?,?,?,?)').run(req.session.studentId, req.params.itemId, req.file.path, req.file.originalname);
    }
    res.json({ success: true, fileName: req.file.originalname });
});

app.get('/api/student/assignment/:itemId/status', requireStudent, (req, res) => {
    const sub = db.prepare('SELECT id,fileName,grade,feedback,submittedAt,gradedAt FROM assignment_submissions WHERE studentId=? AND itemId=?').get(req.session.studentId, req.params.itemId);
    res.json({ submission: sub || null });
});

// ═══════════════════════════════════════
//  ASSIGNMENT — ADMIN
// ═══════════════════════════════════════
app.get('/api/admin/assignments/:itemId', requireAdmin, (req, res) => {
    res.json(db.prepare('SELECT asub.*, s.name, s.email FROM assignment_submissions asub JOIN students s ON s.id=asub.studentId WHERE asub.itemId=? ORDER BY asub.submittedAt DESC').all(req.params.itemId));
});

app.get('/api/admin/assignments/download/:id', requireAdmin, (req, res) => {
    const sub = db.prepare('SELECT filePath,fileName FROM assignment_submissions WHERE id=?').get(req.params.id);
    if (!sub || !fs.existsSync(sub.filePath)) return res.status(404).json({ error: 'File not found.' });
    res.download(sub.filePath, sub.fileName);
});

app.put('/api/admin/assignments/:id/grade', requireAdmin, async (req, res) => {
    const { grade, feedback } = req.body;
    try {
        await pool.query('UPDATE assignment_submissions SET grade=$1, feedback=$2, gradedAt=CURRENT_TIMESTAMP WHERE id=$3', [grade, feedback || '', req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ═══════════════════════════════════════
//  PROGRESS TRACKING — STUDENT
// ═══════════════════════════════════════
app.post('/api/student/progress/:itemId', requireStudent, async (req, res) => {
    try {
        await pool.query('INSERT INTO student_progress (studentId, itemId) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.session.studentId, req.params.itemId]);
    } catch (e) {
        // Ignore constraints
    }
    res.json({ success: true });
});

app.get('/api/student/progress/:courseId', requireStudent, async (req, res) => {
    try {
        const modulesRes = await pool.query('SELECT id FROM course_modules WHERE courseId=$1', [req.params.courseId]);
        if (modulesRes.rows.length === 0) return res.json({ completed: 0, total: 0, percent: 0, completedItems: [] });

        const moduleIds = modulesRes.rows.map(m => m.id);
        const totalItemsRes = await pool.query(`SELECT COUNT(*) as c FROM module_items WHERE moduleId = ANY($1::int[])`, [moduleIds]);
        const totalItems = parseInt(totalItemsRes.rows[0].c, 10);

        const completedRes = await pool.query(`
            SELECT mi.id 
            FROM student_progress sp 
            JOIN module_items mi ON mi.id=sp.itemId 
            WHERE sp.studentId=$1 AND mi.moduleId = ANY($2::int[])
        `, [req.session.studentId, moduleIds]);

        const completed = completedRes.rows;
        res.json({
            completed: completed.length,
            total: totalItems,
            percent: totalItems > 0 ? Math.round((completed.length / totalItems) * 100) : 0,
            completedItems: completed.map(c => c.id)
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ═══════════════════════════════════════
//  COURSE REVIEWS — STUDENT
// ═══════════════════════════════════════
app.post('/api/student/reviews/:courseId', requireStudent, async (req, res) => {
    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5.' });

    try {
        const enrolledRes = await pool.query('SELECT id FROM enrollments WHERE studentId=$1 AND courseId=$2', [req.session.studentId, req.params.courseId]);
        if (enrolledRes.rows.length === 0) return res.status(403).json({ error: 'Not enrolled.' });

        await pool.query(
            `INSERT INTO course_reviews (studentId, courseId, rating, review) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (studentId, courseId) 
             DO UPDATE SET rating=EXCLUDED.rating, review=EXCLUDED.review, createdAt=CURRENT_TIMESTAMP`,
            [req.session.studentId, req.params.courseId, rating, review || '']
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/courses/:id/reviews', async (req, res) => {
    try {
        const reviewsRes = await pool.query('SELECT cr.rating, cr.review, cr.createdAt, s.name FROM course_reviews cr JOIN students s ON s.id=cr.studentId WHERE cr.courseId=$1 ORDER BY cr.createdAt DESC', [req.params.id]);
        const avgRes = await pool.query('SELECT AVG(rating) as avg, COUNT(*) as count FROM course_reviews WHERE courseId=$1', [req.params.id]);

        const avg = avgRes.rows[0];
        res.json({
            reviews: reviewsRes.rows,
            avgRating: avg.avg ? Math.round(avg.avg * 10) / 10 : 0,
            totalReviews: parseInt(avg.count, 10)
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ═══════════════════════════════════════
//  STUDENT PROFILE
// ═══════════════════════════════════════
app.get('/api/student/profile', requireStudent, async (req, res) => {
    try {
        const sRes = await pool.query('SELECT id, name, email, createdAt FROM students WHERE id=$1', [req.session.studentId]);
        const s = sRes.rows[0];
        const enrollmentsRes = await pool.query('SELECT e.enrolledAt, c.title, c.id as courseId FROM enrollments e JOIN courses c ON c.id=e.courseId WHERE e.studentId=$1 ORDER BY e.enrolledAt DESC', [req.session.studentId]);
        res.json({ student: s, enrollments: enrollmentsRes.rows });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/student/profile', requireStudent, async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    try {
        await pool.query('UPDATE students SET name=$1 WHERE id=$2', [name.trim(), req.session.studentId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/student/change-password', requireStudent, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const studentRes = await pool.query('SELECT passwordHash FROM students WHERE id=$1', [req.session.studentId]);
        const student = studentRes.rows[0];
        const match = await bcrypt.compare(currentPassword, student.passwordhash || student.passwordHash);
        if (!match) return res.status(400).json({ error: 'Current password is wrong.' });
        if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });

        const hash = await bcrypt.hash(newPassword, 12);
        await pool.query('UPDATE students SET passwordHash=$1 WHERE id=$2', [hash, req.session.studentId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ═══════════════════════════════════════
//  COUPONS — ADMIN
// ═══════════════════════════════════════
app.get('/api/admin/coupons', requireAdmin, async (req, res) => {
    try {
        const couponsRes = await pool.query('SELECT * FROM coupons ORDER BY createdAt DESC');
        res.json(couponsRes.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/coupons', requireAdmin, async (req, res) => {
    const { code, discountType, discountValue, maxUses, expiresAt, courseId, studentEmail } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required.' });
    try {
        await pool.query(
            'INSERT INTO coupons (code, discountType, discountValue, maxUses, expiresAt, courseId, studentEmail) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [code.toUpperCase(), discountType || 'percent', discountValue || 10, maxUses || 100, expiresAt || null, courseId || null, studentEmail || null]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: 'Coupon code must be unique.' });
    }
});

app.delete('/api/admin/coupons/:id', requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM coupons WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Validate coupon — Student
app.post('/api/student/validate-coupon', requireStudent, async (req, res) => {
    const { code, courseId } = req.body;
    try {
        const couponRes = await pool.query('SELECT * FROM coupons WHERE code=$1 AND active=1', [code?.toUpperCase()]);
        if (couponRes.rows.length === 0) return res.status(404).json({ error: 'Invalid coupon code.' });
        const coupon = couponRes.rows[0];

        if (coupon.expiresat || coupon.expiresAt && new Date(coupon.expiresat || coupon.expiresAt) < new Date()) return res.status(400).json({ error: 'Coupon expired.' });
        if ((coupon.usedcount || coupon.usedCount) >= (coupon.maxuses || coupon.maxUses)) return res.status(400).json({ error: 'Coupon fully used.' });
        if ((coupon.courseid || coupon.courseId) && (coupon.courseid || coupon.courseId) !== parseInt(courseId, 10)) return res.status(400).json({ error: 'Coupon is not valid for this course.' });
        if ((coupon.studentemail || coupon.studentEmail) && (coupon.studentemail || coupon.studentEmail).toLowerCase() !== req.session.studentEmail.toLowerCase()) return res.status(400).json({ error: 'Coupon is not valid for your account.' });

        const usedRes = await pool.query('SELECT id FROM coupon_usage WHERE couponId=$1 AND studentId=$2 AND courseId=$3', [coupon.id, req.session.studentId, courseId]);
        if (usedRes.rows.length > 0) return res.status(400).json({ error: 'Already used this coupon.' });

        const courseRes = await pool.query('SELECT price FROM courses WHERE id=$1', [courseId]);
        if (courseRes.rows.length === 0) return res.status(404).json({ error: 'Course not found.' });
        const course = courseRes.rows[0];

        let discount = (coupon.discounttype || coupon.discountType) === 'percent' ? Math.round(course.price * (coupon.discountvalue || coupon.discountValue) / 100) : (coupon.discountvalue || coupon.discountValue);
        if (discount > course.price) discount = course.price;
        res.json({ valid: true, discount, finalPrice: course.price - discount, couponId: coupon.id });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ═══════════════════════════════════════
//  ANNOUNCEMENTS — ADMIN
// ═══════════════════════════════════════
app.get('/api/admin/announcements', requireAdmin, async (req, res) => {
    try {
        const announcementsRes = await pool.query('SELECT a.*, c.title as courseTitle FROM announcements a LEFT JOIN courses c ON c.id=a.courseId ORDER BY a.createdAt DESC');
        res.json(announcementsRes.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/announcements', requireAdmin, async (req, res) => {
    const { title, message, courseId } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message required.' });
    try {
        await pool.query('INSERT INTO announcements (title, message, courseId) VALUES ($1, $2, $3)', [title, message, courseId || null]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/announcements/:id', requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM announcements WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Student announcements
app.get('/api/student/announcements', requireStudent, async (req, res) => {
    try {
        const enrolledRes = await pool.query('SELECT courseId FROM enrollments WHERE studentId=$1', [req.session.studentId]);
        const enrolled = enrolledRes.rows.map(e => e.courseid || e.courseId);

        if (enrolled.length === 0) {
            const pubRes = await pool.query('SELECT * FROM announcements WHERE courseId IS NULL ORDER BY createdAt DESC LIMIT 20');
            return res.json(pubRes.rows);
        }

        const annRes = await pool.query(`SELECT * FROM announcements WHERE courseId IS NULL OR courseId = ANY($1::int[]) ORDER BY createdAt DESC LIMIT 20`, [enrolled]);
        res.json(annRes.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ═══════════════════════════════════════
//  ANALYTICS — ADMIN
// ═══════════════════════════════════════
app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
    try {
        const [totalStudentsRes, totalEnrollmentsRes, totalRevenueRes, totalCoursesRes, recentEnrollmentsRes, popularCoursesRes, monthlyEnrollmentsRes] = await Promise.all([
            pool.query('SELECT COUNT(*) as c FROM students'),
            pool.query('SELECT COUNT(*) as c FROM enrollments'),
            pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status='completed' OR status='free'"),
            pool.query('SELECT COUNT(*) as c FROM courses WHERE published=1'),
            pool.query('SELECT e.enrolledAt, s.name, s.email, c.title as courseTitle FROM enrollments e JOIN students s ON s.id=e.studentId JOIN courses c ON c.id=e.courseId ORDER BY e.enrolledAt DESC LIMIT 10'),
            pool.query('SELECT c.title, c.id, COUNT(e.id) as enrollCount FROM courses c LEFT JOIN enrollments e ON e.courseId=c.id WHERE c.published=1 GROUP BY c.id ORDER BY enrollCount DESC LIMIT 5'),
            pool.query("SELECT TO_CHAR(enrolledAt, 'YYYY-MM') as month, COUNT(*) as count FROM enrollments GROUP BY month ORDER BY month DESC LIMIT 12")
        ]);

        res.json({
            totalStudents: parseInt(totalStudentsRes.rows[0].c, 10),
            totalEnrollments: parseInt(totalEnrollmentsRes.rows[0].c, 10),
            totalRevenue: parseFloat(totalRevenueRes.rows[0].total) || 0,
            totalCourses: parseInt(totalCoursesRes.rows[0].c, 10),
            recentEnrollments: recentEnrollmentsRes.rows,
            popularCourses: popularCoursesRes.rows.map(r => ({ ...r, enrollCount: parseInt(r.enrollcount || r.enrollCount, 10) })),
            monthlyEnrollments: monthlyEnrollmentsRes.rows.map(r => ({ month: r.month, count: parseInt(r.count, 10) }))
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ═══════════════════════════════════════
//  START
// ═══════════════════════════════════════
// ═══════════════════════════════════════
//  SITE SETTINGS
// ═══════════════════════════════════════
app.get('/api/public-announcement', async (req, res) => {
    try {
        const [activeRes, textRes, linkRes] = await Promise.all([
            pool.query("SELECT value FROM site_settings WHERE key='announcement_active'"),
            pool.query("SELECT value FROM site_settings WHERE key='announcement_text'"),
            pool.query("SELECT value FROM site_settings WHERE key='announcement_link'")
        ]);

        const active = activeRes.rows.length > 0 ? activeRes.rows[0].value === '1' : false;
        const text = textRes.rows.length > 0 ? textRes.rows[0].value : '';
        const link = linkRes.rows.length > 0 ? linkRes.rows[0].value : '';

        res.json({ active, text, link });
    } catch (err) {
        res.json({ active: false, text: '', link: '' });
    }
});

app.put('/api/admin/settings/announcement', requireAdmin, async (req, res) => {
    const { active, text, link } = req.body;
    try {
        await pool.query('INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value', ['announcement_active', active ? '1' : '0']);
        await pool.query('INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value', ['announcement_text', text || '']);
        await pool.query('INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value', ['announcement_link', link || '']);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(PORT, () => {
    console.log(`\n🥷 NinjaHackers server running at http://localhost:${PORT}`);
    console.log(`📝 Admin panel:     http://localhost:${PORT}/admin`);
    console.log(`🎓 Student portal:  http://localhost:${PORT}/learn`);
    console.log(`🔒 DB location:     .data/database.db (hidden)`);
    console.log(`🛡️  Security: Helmet, Rate Limiting, OTP, Brute Force Protection\n`);
});
