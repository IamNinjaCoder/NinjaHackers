const express = require('express');
const Database = require('better-sqlite3');
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

const db = new Database(path.join(dataDir, 'database.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS blogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blogId INTEGER NOT NULL,
    name TEXT NOT NULL,
    comment TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (blogId) REFERENCES blogs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    loginAttempts INTEGER NOT NULL DEFAULT 0,
    lockedUntil TEXT DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    emailVerified INTEGER NOT NULL DEFAULT 0,
    otpCode TEXT DEFAULT NULL,
    otpExpiry TEXT DEFAULT NULL,
    loginAttempts INTEGER NOT NULL DEFAULT 0,
    lockedUntil TEXT DEFAULT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    code TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    price INTEGER NOT NULL DEFAULT 0,
    coverImage TEXT DEFAULT '',
    instructor TEXT NOT NULL DEFAULT 'NinjaHacker',
    duration TEXT DEFAULT '',
    level TEXT DEFAULT 'Beginner',
    published INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS course_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    courseId INTEGER NOT NULL,
    title TEXT NOT NULL,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS module_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId INTEGER NOT NULL,
    courseId INTEGER NOT NULL,
    enrolledAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE(studentId, courseId)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId INTEGER NOT NULL,
    courseId INTEGER NOT NULL,
    razorpayOrderId TEXT,
    razorpayPaymentId TEXT,
    razorpaySignature TEXT,
    amount INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (studentId) REFERENCES students(id),
    FOREIGN KEY (courseId) REFERENCES courses(id)
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT DEFAULT '',
    message TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS security_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT NOT NULL,
    ip TEXT,
    details TEXT DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    itemId INTEGER NOT NULL UNIQUE,
    passingPercent INTEGER NOT NULL DEFAULT 60,
    maxAttempts INTEGER NOT NULL DEFAULT 3,
    FOREIGN KEY (itemId) REFERENCES module_items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId INTEGER NOT NULL,
    quizId INTEGER NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    totalQuestions INTEGER NOT NULL DEFAULT 0,
    passed INTEGER NOT NULL DEFAULT 0,
    answers TEXT NOT NULL DEFAULT '{}',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (quizId) REFERENCES quizzes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS assignment_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId INTEGER NOT NULL,
    itemId INTEGER NOT NULL,
    filePath TEXT NOT NULL,
    fileName TEXT NOT NULL,
    grade TEXT DEFAULT NULL,
    feedback TEXT DEFAULT '',
    submittedAt TEXT NOT NULL DEFAULT (datetime('now')),
    gradedAt TEXT DEFAULT NULL,
    FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (itemId) REFERENCES module_items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS student_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId INTEGER NOT NULL,
    itemId INTEGER NOT NULL,
    completedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (itemId) REFERENCES module_items(id) ON DELETE CASCADE,
    UNIQUE(studentId, itemId)
  );

  CREATE TABLE IF NOT EXISTS course_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId INTEGER NOT NULL,
    courseId INTEGER NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5,
    review TEXT DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE(studentId, courseId)
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    discountType TEXT NOT NULL DEFAULT 'percent',
    discountValue INTEGER NOT NULL DEFAULT 10,
    maxUses INTEGER NOT NULL DEFAULT 100,
    usedCount INTEGER NOT NULL DEFAULT 0,
    expiresAt TEXT DEFAULT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS coupon_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couponId INTEGER NOT NULL,
    studentId INTEGER NOT NULL,
    courseId INTEGER NOT NULL,
    usedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (couponId) REFERENCES coupons(id),
    FOREIGN KEY (studentId) REFERENCES students(id),
    FOREIGN KEY (courseId) REFERENCES courses(id),
    UNIQUE(couponId, studentId, courseId)
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    courseId INTEGER DEFAULT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE SET NULL
  );
`);

// DB migration helpers
const safeAlter = (sql) => { try { db.exec(sql); } catch (e) { } };
safeAlter(`ALTER TABLE students ADD COLUMN emailVerified INTEGER NOT NULL DEFAULT 0`);
safeAlter(`ALTER TABLE students ADD COLUMN otpCode TEXT DEFAULT NULL`);
safeAlter(`ALTER TABLE students ADD COLUMN otpExpiry TEXT DEFAULT NULL`);
safeAlter(`ALTER TABLE students ADD COLUMN loginAttempts INTEGER NOT NULL DEFAULT 0`);
safeAlter(`ALTER TABLE students ADD COLUMN lockedUntil TEXT DEFAULT NULL`);
safeAlter(`ALTER TABLE admin_users ADD COLUMN loginAttempts INTEGER NOT NULL DEFAULT 0`);
safeAlter(`ALTER TABLE admin_users ADD COLUMN lockedUntil TEXT DEFAULT NULL`);
safeAlter(`ALTER TABLE blogs ADD COLUMN author TEXT NOT NULL DEFAULT 'NinjaHacker'`);
safeAlter(`ALTER TABLE blogs ADD COLUMN coverImage TEXT DEFAULT ''`);
safeAlter(`ALTER TABLE module_items ADD COLUMN scheduledAt TEXT DEFAULT NULL`);

// Migrate old database.db if exists
const oldDbPath = path.join(__dirname, 'database.db');
if (fs.existsSync(oldDbPath)) {
    try {
        const oldDb = new Database(oldDbPath, { readonly: true });
        // Migrate blogs
        const oldBlogs = oldDb.prepare('SELECT * FROM blogs').all();
        if (oldBlogs.length > 0) {
            const existingCount = db.prepare('SELECT COUNT(*) as c FROM blogs').get().c;
            if (existingCount === 0) {
                const ins = db.prepare('INSERT OR IGNORE INTO blogs (title,author,excerpt,tags,date,readTime,content,contentHtml,coverImage,published,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
                for (const b of oldBlogs) ins.run(b.title, b.author || 'NinjaHacker', b.excerpt || '', b.tags || '[]', b.date, b.readTime || '5 min', b.content || '', b.contentHtml || '', b.coverImage || '', b.published ?? 1, b.createdAt || '', b.updatedAt || '');
                console.log(`✅ Migrated ${oldBlogs.length} blogs from old database.`);
            }
        }
        // Migrate students
        try {
            const oldStudents = oldDb.prepare('SELECT * FROM students').all();
            const ins2 = db.prepare('INSERT OR IGNORE INTO students (name,email,passwordHash,emailVerified,createdAt) VALUES (?,?,?,1,?)');
            for (const s of oldStudents) ins2.run(s.name, s.email, s.passwordHash, s.createdAt || '');
            if (oldStudents.length) console.log(`✅ Migrated ${oldStudents.length} students.`);
        } catch (e) { }
        // Migrate courses
        try {
            const oldCourses = oldDb.prepare('SELECT * FROM courses').all();
            const ins3 = db.prepare('INSERT OR IGNORE INTO courses (title,code,description,price,coverImage,instructor,duration,level,published) VALUES (?,?,?,?,?,?,?,?,?)');
            for (const c of oldCourses) ins3.run(c.title, c.code || '', c.description || '', c.price || 0, c.coverImage || '', c.instructor || 'NinjaHacker', c.duration || '', c.level || 'Beginner', c.published ?? 1);
            if (oldCourses.length) console.log(`✅ Migrated ${oldCourses.length} courses.`);
            // Migrate modules
            const oldMods = oldDb.prepare('SELECT * FROM course_modules').all();
            const ins4 = db.prepare('INSERT OR IGNORE INTO course_modules (courseId,title,sortOrder) VALUES (?,?,?)');
            for (const m of oldMods) ins4.run(m.courseId, m.title, m.sortOrder || 0);
            const oldItems = oldDb.prepare('SELECT * FROM module_items').all();
            const ins5 = db.prepare('INSERT OR IGNORE INTO module_items (moduleId,type,title,link,description,sortOrder) VALUES (?,?,?,?,?,?)');
            for (const i of oldItems) ins5.run(i.moduleId, i.type || 'recorded_class', i.title, i.link || '', i.description || '', i.sortOrder || 0);
        } catch (e) { }
        oldDb.close();
        // Remove old database
        fs.renameSync(oldDbPath, oldDbPath + '.migrated');
        console.log('✅ Old database.db renamed to database.db.migrated');
    } catch (e) { console.log('⚠️ Could not migrate old DB:', e.message); }
}

// ─── Seed admin ───
const adminExists = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(ADMIN_USERNAME);
if (!adminExists) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
    db.prepare('INSERT INTO admin_users (username, passwordHash) VALUES (?, ?)').run(ADMIN_USERNAME, hash);
    console.log(`✅ Admin user "${ADMIN_USERNAME}" created.`);
}

// ─── Seed blogs ───
const blogCount = db.prepare('SELECT COUNT(*) as count FROM blogs').get().count;
if (blogCount === 0) {
    const defaultBlogs = [
        {
            title: "SQL Injection to RCE: A Complete Exploitation Chain", author: "NinjaHacker", excerpt: "How I chained a blind SQLi vulnerability with file write permissions to gain remote code execution on a real-world target.", tags: JSON.stringify([{ label: "Web Security", cls: "tag-red" }, { label: "Writeup", cls: "tag-cyan" }]), date: "Feb 2025", readTime: "8 min read",
            content: `## Introduction\n\nDuring a recent bug bounty engagement, I found a login form that led to full remote code execution.\n\n> ⚠️ This was performed with written authorization.\n\n## Step 1 — Discovering the Injection Point\n\n\`\`\`sql\nusername=admin'--\npassword=anything\n\`\`\`\n\n## Step 2 — Blind SQLi Enumeration\n\n\`\`\`bash\nsqlmap -u "https://target.com/login" --data="username=admin&password=pass" --dbms=mysql --dump\n\`\`\`\n\n## Remediation\n\n- Use prepared statements\n- Revoke FILE privilege\n- Implement a WAF`
        },
        {
            title: "Buffer Overflow on 64-bit Linux: ret2libc Explained", author: "NinjaHacker", excerpt: "Step-by-step walkthrough of exploiting a stack buffer overflow with ret2libc in a CTF challenge.", tags: JSON.stringify([{ label: "CTF", cls: "tag-green" }, { label: "Binary Exploitation", cls: "tag-purple" }]), date: "Jan 2025", readTime: "12 min read",
            content: `## What is a Buffer Overflow?\n\nA buffer overflow overwrites adjacent memory including the saved return address.\n\n\`\`\`python\nfrom pwn import *\npayload = b'A' * 72\npayload += p64(pop_rdi)\np.interactive()\n\`\`\``
        },
        {
            title: "OSINT Investigation: Building a Target Profile from Scratch", author: "NinjaHacker", excerpt: "A deep dive into passive reconnaissance using Shodan, theHarvester, and Google Dorks.", tags: JSON.stringify([{ label: "OSINT", cls: "tag-cyan" }, { label: "Tutorial", cls: "tag-green" }]), date: "Jan 2025", readTime: "10 min read",
            content: `## What is OSINT?\n\nOpen Source Intelligence is the collection of information from publicly available sources.\n\n## Phase 1 — Domain Recon\n\n\`\`\`bash\ntheHarvester -d target.com -b all\n\`\`\``
        }
    ];
    const insert = db.prepare('INSERT INTO blogs (title,author,excerpt,tags,date,readTime,content,contentHtml) VALUES (?,?,?,?,?,?,?,?)');
    for (const b of defaultBlogs) insert.run(b.title, b.author, b.excerpt, b.tags, b.date, b.readTime, b.content, marked(b.content));
    console.log(`✅ Seeded ${defaultBlogs.length} default blog posts.`);
}

// ─── Seed sample course ───
const courseCount = db.prepare('SELECT COUNT(*) as count FROM courses').get().count;
if (courseCount === 0) {
    const r = db.prepare('INSERT INTO courses (title,code,description,price,instructor,duration,level) VALUES (?,?,?,?,?,?,?)')
        .run('Ethical Hacking Bootcamp', 'EHB-001', 'Learn ethical hacking from scratch — networking, web security, exploitation, and more.', 4999, 'NinjaHacker', '40+ Hours', 'Beginner');
    const cid = r.lastInsertRowid;
    const m1 = db.prepare('INSERT INTO course_modules (courseId,title,sortOrder) VALUES (?,?,?)').run(cid, 'Course Introduction', 0);
    const m2 = db.prepare('INSERT INTO course_modules (courseId,title,sortOrder) VALUES (?,?,?)').run(cid, 'Module 01: Networking Concepts', 1);
    db.prepare('INSERT INTO module_items (moduleId,type,title,link,sortOrder) VALUES (?,?,?,?,?)').run(m1.lastInsertRowid, 'recorded_class', 'Kick-off Session', 'https://drive.google.com/your-link', 0);
    db.prepare('INSERT INTO module_items (moduleId,type,title,link,sortOrder) VALUES (?,?,?,?,?)').run(m2.lastInsertRowid, 'live_class', 'Class 01: Networking Concepts', 'https://teamviewer.com/your-link', 0);
    db.prepare('INSERT INTO module_items (moduleId,type,title,link,sortOrder) VALUES (?,?,?,?,?)').run(m2.lastInsertRowid, 'notes', 'Notes - Networking Concepts', 'https://drive.google.com/your-notes-link', 1);
    console.log('✅ Seeded sample course with modules.');
}

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

function recordFailedLogin(table, id) {
    const user = db.prepare(`SELECT loginAttempts FROM ${table} WHERE id = ?`).get(id);
    const attempts = (user?.loginAttempts || 0) + 1;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
        db.prepare(`UPDATE ${table} SET loginAttempts = ?, lockedUntil = ? WHERE id = ?`).run(attempts, lockUntil, id);
    } else {
        db.prepare(`UPDATE ${table} SET loginAttempts = ? WHERE id = ?`).run(attempts, id);
    }
}

function resetLoginAttempts(table, id) {
    db.prepare(`UPDATE ${table} SET loginAttempts = 0, lockedUntil = NULL WHERE id = ?`).run(id);
}

// ═══════════════════════════════════════
//  OTP
// ═══════════════════════════════════════
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

async function sendOTPEmail(email, otp, name) {
    if (!transporter) {
        console.log(`📧 OTP for ${email}: ${otp} (email not configured, showing in console)`);
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
    const student = db.prepare('SELECT name, email FROM students WHERE id = ?').get(studentId);
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
function logSecurity(event, ip, details) {
    db.prepare('INSERT INTO security_logs (event, ip, details) VALUES (?,?,?)').run(event, ip || '', details || '');
}

function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection.remoteAddress;
}

// ═══════════════════════════════════════
//  EXPRESS APP
// ═══════════════════════════════════════
const app = express();

// Security headers
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));

// Additional security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

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
app.post('/api/admin/login', (req, res) => {
    const ip = getClientIP(req);
    // Rate limit: 5 attempts per 15 min
    if (!rateLimit(`admin-login:${ip}`, 5, 15 * 60 * 1000)) {
        logSecurity('ADMIN_LOGIN_RATE_LIMIT', ip, '');
        return res.status(429).json({ error: `Too many login attempts. Wait ${LOCKOUT_MINUTES} minutes.` });
    }

    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Credentials required.' });

    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!user) {
        logSecurity('ADMIN_LOGIN_FAIL', ip, `unknown user: ${username}`);
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Account lock check
    if (checkAccountLock(user)) {
        const remaining = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
        logSecurity('ADMIN_LOGIN_LOCKED', ip, username);
        return res.status(423).json({ error: `Account locked. Try again in ${remaining} minutes.` });
    }

    if (!bcrypt.compareSync(password, user.passwordHash)) {
        recordFailedLogin('admin_users', user.id);
        logSecurity('ADMIN_LOGIN_FAIL', ip, username);
        const remaining = MAX_LOGIN_ATTEMPTS - (user.loginAttempts + 1);
        return res.status(401).json({ error: `Invalid credentials.${remaining <= 2 ? ` ${remaining} attempts remaining.` : ''}` });
    }

    resetLoginAttempts('admin_users', user.id);
    // Set session data with fingerprint binding
    req.session.isAdmin = true;
    req.session.username = username;
    req.session._fingerprint = `${ip}|${(req.headers['user-agent'] || '').substring(0, 100)}`;
    req.session._lastActivity = Date.now();
    logSecurity('ADMIN_LOGIN_OK', ip, username);
    res.json({ success: true });
});

app.post('/api/admin/logout', (req, res) => {
    const username = req.session.username;
    req.session.destroy();
    logSecurity('ADMIN_LOGOUT', getClientIP(req), username);
    res.json({ success: true });
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

    const existing = db.prepare('SELECT id FROM students WHERE email = ?').get(email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

    // Password strength check
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and a number.' });
    }

    const hash = bcrypt.hashSync(password, 12);
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const result = db.prepare('INSERT INTO students (name,email,passwordHash,emailVerified,otpCode,otpExpiry) VALUES (?,?,?,0,?,?)')
        .run(name.trim(), email.toLowerCase().trim(), hash, otp, otpExpiry);

    // Send OTP
    await sendOTPEmail(email.toLowerCase().trim(), otp, name.trim());

    logSecurity('STUDENT_SIGNUP', ip, email.toLowerCase());
    res.json({
        success: true,
        requiresVerification: true,
        email: email.toLowerCase().trim(),
        message: 'Account created! Check your email for the verification code.'
    });
});

app.post('/api/student/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required.' });

    const ip = getClientIP(req);
    if (!rateLimit(`otp:${ip}`, 10, 15 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many attempts.' });
    }

    const student = db.prepare('SELECT * FROM students WHERE email = ?').get(email.toLowerCase());
    if (!student) return res.status(404).json({ error: 'Account not found.' });

    if (student.emailVerified) {
        // Already verified, just log them in
        req.session.studentId = student.id;
        req.session.studentName = student.name;
        req.session.studentEmail = student.email;
        return res.json({ success: true, message: 'Email already verified.' });
    }

    if (!student.otpCode || student.otpCode !== otp.trim()) {
        logSecurity('OTP_FAIL', ip, email);
        return res.status(400).json({ error: 'Invalid verification code.' });
    }

    if (new Date(student.otpExpiry) < new Date()) {
        return res.status(400).json({ error: 'Code expired. Please request a new one.' });
    }

    // Verify and login
    db.prepare('UPDATE students SET emailVerified = 1, otpCode = NULL, otpExpiry = NULL WHERE id = ?').run(student.id);
    req.session.studentId = student.id;
    req.session.studentName = student.name;
    req.session.studentEmail = student.email;
    logSecurity('OTP_VERIFIED', ip, email);
    res.json({ success: true, student: { id: student.id, name: student.name, email: student.email } });
});

app.post('/api/student/resend-otp', async (req, res) => {
    const { email } = req.body;
    const ip = getClientIP(req);
    if (!rateLimit(`resend-otp:${ip}`, 3, 10 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many resend attempts. Wait 10 minutes.' });
    }

    const student = db.prepare('SELECT * FROM students WHERE email = ?').get(email?.toLowerCase());
    if (!student) return res.status(404).json({ error: 'Account not found.' });
    if (student.emailVerified) return res.json({ success: true, message: 'Already verified. Please login.' });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    db.prepare('UPDATE students SET otpCode = ?, otpExpiry = ? WHERE id = ?').run(otp, otpExpiry, student.id);

    await sendOTPEmail(student.email, otp, student.name);
    res.json({ success: true, message: 'New code sent.' });
});

app.post('/api/student/login', (req, res) => {
    const ip = getClientIP(req);
    if (!rateLimit(`student-login:${ip}`, 10, 15 * 60 * 1000)) {
        logSecurity('STUDENT_LOGIN_RATE_LIMIT', ip, '');
        return res.status(429).json({ error: 'Too many login attempts. Wait 15 minutes.' });
    }

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

    const student = db.prepare('SELECT * FROM students WHERE email = ?').get(email.toLowerCase());
    if (!student) {
        logSecurity('STUDENT_LOGIN_FAIL', ip, `unknown: ${email}`);
        return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Account lock
    if (checkAccountLock(student)) {
        const remaining = Math.ceil((new Date(student.lockedUntil) - new Date()) / 60000);
        return res.status(423).json({ error: `Account locked. Try again in ${remaining} minutes.` });
    }

    if (!bcrypt.compareSync(password, student.passwordHash)) {
        recordFailedLogin('students', student.id);
        logSecurity('STUDENT_LOGIN_FAIL', ip, email);
        return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Must be verified
    if (!student.emailVerified) {
        return res.status(403).json({ error: 'Email not verified.', requiresVerification: true, email: student.email });
    }

    resetLoginAttempts('students', student.id);
    // Set session data with fingerprint binding
    req.session.studentId = student.id;
    req.session.studentName = student.name;
    req.session.studentEmail = student.email;
    req.session._fingerprint = `${ip}|${(req.headers['user-agent'] || '').substring(0, 100)}`;
    req.session._lastActivity = Date.now();
    logSecurity('STUDENT_LOGIN_OK', ip, email);
    res.json({ success: true, student: { id: student.id, name: student.name, email: student.email } });
});

app.post('/api/student/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
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

    const student = db.prepare('SELECT * FROM students WHERE email = ?').get(email.toLowerCase());
    if (!student) {
        // Don't reveal if email exists — return success anyway
        return res.json({ success: true, message: 'If this email is registered, you will receive a reset code.' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    db.prepare('UPDATE students SET otpCode = ?, otpExpiry = ? WHERE id = ?').run(otp, otpExpiry, student.id);

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
});

app.post('/api/student/reset-password', (req, res) => {
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

    const student = db.prepare('SELECT * FROM students WHERE email = ?').get(email.toLowerCase());
    if (!student) return res.status(404).json({ error: 'Account not found.' });

    if (!student.otpCode || student.otpCode !== otp.trim()) {
        logSecurity('PASSWORD_RESET_FAIL', ip, email);
        return res.status(400).json({ error: 'Invalid reset code.' });
    }

    if (new Date(student.otpExpiry) < new Date()) {
        return res.status(400).json({ error: 'Code expired. Please request a new one.' });
    }

    // Reset password
    const hash = bcrypt.hashSync(newPassword, 12);
    db.prepare('UPDATE students SET passwordHash = ?, otpCode = NULL, otpExpiry = NULL, emailVerified = 1, loginAttempts = 0, lockedUntil = NULL WHERE id = ?').run(hash, student.id);

    logSecurity('PASSWORD_RESET_OK', ip, email);
    res.json({ success: true, message: 'Password reset! You can now log in.' });
});

// ═══════════════════════════════════════
//  STUDENT — ENROLLED COURSES
// ═══════════════════════════════════════
app.get('/api/student/courses', requireStudent, (req, res) => {
    const courses = db.prepare(`SELECT c.*, e.enrolledAt FROM enrollments e JOIN courses c ON c.id = e.courseId WHERE e.studentId = ? ORDER BY e.enrolledAt DESC`).all(req.session.studentId);
    res.json(courses);
});

app.get('/api/student/courses/:id', requireStudent, (req, res) => {
    const enrollment = db.prepare('SELECT id FROM enrollments WHERE studentId = ? AND courseId = ?').get(req.session.studentId, req.params.id);
    if (!enrollment) return res.status(403).json({ error: 'You are not enrolled in this course.' });
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found.' });
    const modules = db.prepare('SELECT * FROM course_modules WHERE courseId = ? ORDER BY sortOrder').all(req.params.id);
    for (const mod of modules) {
        mod.items = db.prepare('SELECT * FROM module_items WHERE moduleId = ? ORDER BY sortOrder').all(mod.id);
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
});

// ═══════════════════════════════════════
//  PAYMENT — RAZORPAY
// ═══════════════════════════════════════
app.post('/api/payment/create-order', requireStudent, (req, res) => {
    const { courseId } = req.body;
    const course = db.prepare('SELECT id,title,price FROM courses WHERE id = ? AND published = 1').get(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found.' });
    const existing = db.prepare('SELECT id FROM enrollments WHERE studentId = ? AND courseId = ?').get(req.session.studentId, courseId);
    if (existing) return res.status(400).json({ error: 'Already enrolled.' });

    if (course.price === 0) {
        db.prepare('INSERT INTO enrollments (studentId,courseId) VALUES (?,?)').run(req.session.studentId, courseId);
        db.prepare('INSERT INTO payments (studentId,courseId,amount,status) VALUES (?,?,0,?)').run(req.session.studentId, courseId, 'free');
        // Send enrollment confirmation email
        sendEnrollmentEmail(req.session.studentId, course, 'FREE');
        return res.json({ success: true, free: true });
    }

    if (!razorpayInstance) return res.status(503).json({ error: 'Payment gateway not configured.' });

    const amountInPaise = course.price * 100;
    razorpayInstance.orders.create({
        amount: amountInPaise, currency: 'INR',
        receipt: `order_${req.session.studentId}_${courseId}_${Date.now()}`,
        notes: { studentId: String(req.session.studentId), courseId: String(courseId) }
    }).then(order => {
        db.prepare('INSERT INTO payments (studentId,courseId,razorpayOrderId,amount,status) VALUES (?,?,?,?,?)').run(req.session.studentId, courseId, order.id, course.price, 'pending');
        res.json({ success: true, order: { id: order.id, amount: order.amount, currency: order.currency }, key: process.env.RAZORPAY_KEY_ID, course: { title: course.title, price: course.price } });
    }).catch(err => {
        console.error('Razorpay error:', err);
        res.status(500).json({ error: 'Failed to create order.' });
    });
});

app.post('/api/payment/verify', requireStudent, (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ error: 'Missing payment data.' });

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

    if (expected !== razorpay_signature) {
        logSecurity('PAYMENT_TAMPER', getClientIP(req), `order:${razorpay_order_id} student:${req.session.studentId}`);
        return res.status(400).json({ error: 'Payment verification failed. Signature mismatch.' });
    }

    const payment = db.prepare('SELECT * FROM payments WHERE razorpayOrderId = ? AND studentId = ?').get(razorpay_order_id, req.session.studentId);
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });

    db.prepare('UPDATE payments SET razorpayPaymentId=?, razorpaySignature=?, status=? WHERE id=?').run(razorpay_payment_id, razorpay_signature, 'completed', payment.id);
    try { db.prepare('INSERT INTO enrollments (studentId,courseId) VALUES (?,?)').run(req.session.studentId, payment.courseId); } catch (e) { }

    // Send enrollment confirmation email
    const paidCourse = db.prepare('SELECT title,price FROM courses WHERE id=?').get(payment.courseId);
    if (paidCourse) sendEnrollmentEmail(req.session.studentId, paidCourse, `₹${payment.amount}`);

    logSecurity('PAYMENT_OK', getClientIP(req), `order:${razorpay_order_id}`);
    res.json({ success: true, message: 'Payment verified! You are now enrolled.' });
});

// ═══════════════════════════════════════
//  PUBLIC — COURSES
// ═══════════════════════════════════════
app.get('/api/courses', (req, res) => {
    const courses = db.prepare('SELECT id,title,code,description,price,coverImage,instructor,duration,level FROM courses WHERE published=1 ORDER BY id DESC').all();
    for (const c of courses) {
        c.moduleCount = db.prepare('SELECT COUNT(*) as count FROM course_modules WHERE courseId=?').get(c.id).count;
        c.itemCount = db.prepare('SELECT COUNT(*) as count FROM module_items mi JOIN course_modules cm ON mi.moduleId=cm.id WHERE cm.courseId=?').get(c.id).count;
    }
    if (req.session?.studentId) {
        const enrolled = db.prepare('SELECT courseId FROM enrollments WHERE studentId=?').all(req.session.studentId);
        const ids = new Set(enrolled.map(e => e.courseId));
        for (const c of courses) c.enrolled = ids.has(c.id);
    }
    res.json(courses);
});

// ═══════════════════════════════════════
//  PUBLIC — BLOGS
// ═══════════════════════════════════════
app.get('/api/blogs', (req, res) => {
    const blogs = db.prepare('SELECT id,title,author,excerpt,tags,date,readTime,contentHtml,coverImage,createdAt FROM blogs WHERE published=1 ORDER BY id DESC').all();
    res.json(blogs.map(b => ({ ...b, tags: JSON.parse(b.tags), content: b.contentHtml })));
});

app.get('/api/blogs/:id', (req, res) => {
    const blog = db.prepare('SELECT id,title,author,excerpt,tags,date,readTime,contentHtml,coverImage,createdAt FROM blogs WHERE id=? AND published=1').get(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Not found.' });
    blog.tags = JSON.parse(blog.tags); blog.content = blog.contentHtml;
    res.json(blog);
});

app.get('/api/blogs/:id/comments', (req, res) => {
    res.json(db.prepare('SELECT id,name,comment,createdAt FROM comments WHERE blogId=? ORDER BY createdAt DESC').all(req.params.id));
});

app.post('/api/blogs/:id/comments', (req, res) => {
    const ip = getClientIP(req);
    if (!rateLimit(`comment:${ip}`, 5, 60000)) return res.status(429).json({ error: 'Too many comments. Wait a minute.' });
    const { name, comment } = req.body;
    if (!name || !comment) return res.status(400).json({ error: 'Name and comment required.' });
    if (name.length > 100 || comment.length > 5000) return res.status(400).json({ error: 'Input too long.' });
    const blog = db.prepare('SELECT id FROM blogs WHERE id=? AND published=1').get(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Not found.' });
    const r = db.prepare('INSERT INTO comments (blogId,name,comment) VALUES (?,?,?)').run(req.params.id, name.trim(), comment.trim());
    res.json({ success: true, id: r.lastInsertRowid });
});

// ═══════════════════════════════════════
//  CONTACT
// ═══════════════════════════════════════
app.post('/api/contact', (req, res) => {
    const ip = getClientIP(req);
    if (!rateLimit(`contact:${ip}`, 3, 60 * 60 * 1000)) return res.status(429).json({ error: 'Too many messages. Try again later.' });
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'All fields required.' });
    if (name.length > 100 || email.length > 200 || message.length > 10000) return res.status(400).json({ error: 'Too long.' });
    db.prepare('INSERT INTO contact_messages (name,email,subject,message) VALUES (?,?,?,?)').run(name.trim(), email.trim(), (subject || '').trim(), message.trim());
    if (transporter) {
        transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER, to: process.env.CONTACT_TO || process.env.SMTP_USER,
            subject: `[NinjaHackers] Contact: ${subject || 'New Message'}`,
            html: `<h3>New Contact</h3><p><b>From:</b> ${name} (${email})</p><p><b>Subject:</b> ${subject || 'N/A'}</p><p>${message.replace(/\n/g, '<br>')}</p>`
        }).catch(err => console.error('Email error:', err));
    }
    res.json({ success: true, message: "Message sent! We'll get back to you soon." });
});

// ═══════════════════════════════════════
//  ADMIN — UPLOAD
// ═══════════════════════════════════════
app.post('/api/admin/upload', requireAdmin, (req, res) => {
    const { image, filename } = req.body;
    if (!image) return res.status(400).json({ error: 'No image.' });
    const matches = image.match(/^data:image\/([\w+]+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: 'Invalid format.' });
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
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
app.get('/api/admin/blogs', requireAdmin, (req, res) => {
    const blogs = db.prepare('SELECT id,title,author,excerpt,tags,date,readTime,content,coverImage,published,createdAt,updatedAt FROM blogs ORDER BY id DESC').all();
    res.json(blogs.map(b => ({ ...b, tags: JSON.parse(b.tags) })));
});
app.post('/api/admin/blogs', requireAdmin, (req, res) => {
    const { title, author, excerpt, tags, date, readTime, content, coverImage, published } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required.' });
    const now = new Date().toISOString();
    const r = db.prepare('INSERT INTO blogs (title,author,excerpt,tags,date,readTime,content,contentHtml,coverImage,published,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(title, author || 'NinjaHacker', excerpt || '', JSON.stringify(tags || []), date || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), readTime || '5 min read', content, marked(content), coverImage || '', published !== undefined ? (published ? 1 : 0) : 1, now, now);
    res.json({ success: true, id: r.lastInsertRowid });
});
app.put('/api/admin/blogs/:id', requireAdmin, (req, res) => {
    const { title, author, excerpt, tags, date, readTime, content, coverImage, published } = req.body;
    if (!db.prepare('SELECT id FROM blogs WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Not found.' });
    db.prepare(`UPDATE blogs SET title=?,author=?,excerpt=?,tags=?,date=?,readTime=?,content=?,contentHtml=?,coverImage=?,published=?,updatedAt=datetime('now') WHERE id=?`)
        .run(title, author || 'NinjaHacker', excerpt || '', JSON.stringify(tags || []), date || '', readTime || '5 min read', content || '', marked(content || ''), coverImage || '', published !== undefined ? (published ? 1 : 0) : 1, req.params.id);
    res.json({ success: true });
});
app.delete('/api/admin/blogs/:id', requireAdmin, (req, res) => { db.prepare('DELETE FROM blogs WHERE id=?').run(req.params.id); res.json({ success: true }); });
app.delete('/api/admin/comments/:id', requireAdmin, (req, res) => { db.prepare('DELETE FROM comments WHERE id=?').run(req.params.id); res.json({ success: true }); });

// ═══════════════════════════════════════
//  ADMIN — COURSE CRUD
// ═══════════════════════════════════════
app.get('/api/admin/courses', requireAdmin, (req, res) => {
    const courses = db.prepare('SELECT * FROM courses ORDER BY id DESC').all();
    for (const c of courses) { c.enrollmentCount = db.prepare('SELECT COUNT(*) as c FROM enrollments WHERE courseId=?').get(c.id).c; c.moduleCount = db.prepare('SELECT COUNT(*) as c FROM course_modules WHERE courseId=?').get(c.id).c; }
    res.json(courses);
});
app.post('/api/admin/courses', requireAdmin, (req, res) => {
    const { title, code, description, price, coverImage, instructor, duration, level, published } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required.' });
    const r = db.prepare('INSERT INTO courses (title,code,description,price,coverImage,instructor,duration,level,published) VALUES (?,?,?,?,?,?,?,?,?)').run(title, code || '', description || '', price || 0, coverImage || '', instructor || 'NinjaHacker', duration || '', level || 'Beginner', published !== undefined ? (published ? 1 : 0) : 1);
    res.json({ success: true, id: r.lastInsertRowid });
});
app.put('/api/admin/courses/:id', requireAdmin, (req, res) => {
    const { title, code, description, price, coverImage, instructor, duration, level, published } = req.body;
    db.prepare(`UPDATE courses SET title=?,code=?,description=?,price=?,coverImage=?,instructor=?,duration=?,level=?,published=?,updatedAt=datetime('now') WHERE id=?`).run(title, code || '', description || '', price || 0, coverImage || '', instructor || 'NinjaHacker', duration || '', level || 'Beginner', published !== undefined ? (published ? 1 : 0) : 1, req.params.id);
    res.json({ success: true });
});
app.delete('/api/admin/courses/:id', requireAdmin, (req, res) => { db.prepare('DELETE FROM courses WHERE id=?').run(req.params.id); res.json({ success: true }); });

// Modules
app.get('/api/admin/courses/:id/modules', requireAdmin, (req, res) => {
    const modules = db.prepare('SELECT * FROM course_modules WHERE courseId=? ORDER BY sortOrder').all(req.params.id);
    for (const m of modules) m.items = db.prepare('SELECT * FROM module_items WHERE moduleId=? ORDER BY sortOrder').all(m.id);
    res.json(modules);
});
app.post('/api/admin/modules', requireAdmin, (req, res) => {
    const { courseId, title } = req.body;
    if (!courseId || !title) return res.status(400).json({ error: 'Required.' });
    // Auto-increment sortOrder: next = max + 1
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sortOrder),-1) as mx FROM course_modules WHERE courseId=?').get(courseId).mx;
    const r = db.prepare('INSERT INTO course_modules (courseId,title,sortOrder) VALUES (?,?,?)').run(courseId, title, maxOrder + 1);
    res.json({ success: true, id: r.lastInsertRowid });
});
// Reorder modules (swap two modules) — MUST be before /:id route
app.put('/api/admin/modules/reorder', requireAdmin, (req, res) => {
    const { moduleId, direction, courseId } = req.body;
    if (!moduleId || !direction || !courseId) return res.status(400).json({ error: 'Required.' });
    const modules = db.prepare('SELECT id,sortOrder FROM course_modules WHERE courseId=? ORDER BY sortOrder').all(courseId);
    const idx = modules.findIndex(m => m.id === moduleId);
    if (idx < 0) return res.status(404).json({ error: 'Module not found.' });
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= modules.length) return res.json({ success: true }); // already at edge
    // Swap sortOrders
    const a = modules[idx], b = modules[swapIdx];
    db.prepare('UPDATE course_modules SET sortOrder=? WHERE id=?').run(b.sortOrder, a.id);
    db.prepare('UPDATE course_modules SET sortOrder=? WHERE id=?').run(a.sortOrder, b.id);
    res.json({ success: true });
});
app.put('/api/admin/modules/:id', requireAdmin, (req, res) => { db.prepare('UPDATE course_modules SET title=?,sortOrder=? WHERE id=?').run(req.body.title, req.body.sortOrder || 0, req.params.id); res.json({ success: true }); });
app.delete('/api/admin/modules/:id', requireAdmin, (req, res) => { db.prepare('DELETE FROM course_modules WHERE id=?').run(req.params.id); res.json({ success: true }); });

// Items
app.post('/api/admin/items', requireAdmin, (req, res) => {
    const { moduleId, type, title, link, description, sortOrder, scheduledAt } = req.body;
    if (!moduleId || !title) return res.status(400).json({ error: 'Required.' });
    const r = db.prepare('INSERT INTO module_items (moduleId,type,title,link,description,sortOrder,scheduledAt) VALUES (?,?,?,?,?,?,?)').run(moduleId, type || 'recorded_class', title, link || '', description || '', sortOrder || 0, scheduledAt || null);
    res.json({ success: true, id: r.lastInsertRowid });
});
app.put('/api/admin/items/:id', requireAdmin, (req, res) => { db.prepare('UPDATE module_items SET type=?,title=?,link=?,description=?,sortOrder=?,scheduledAt=? WHERE id=?').run(req.body.type || 'recorded_class', req.body.title, req.body.link || '', req.body.description || '', req.body.sortOrder || 0, req.body.scheduledAt || null, req.params.id); res.json({ success: true }); });
app.delete('/api/admin/items/:id', requireAdmin, (req, res) => { db.prepare('DELETE FROM module_items WHERE id=?').run(req.params.id); res.json({ success: true }); });

// Enrollments (with source tracking)
app.get('/api/admin/enrollments', requireAdmin, (req, res) => {
    const enrollments = db.prepare(`
    SELECT e.id, e.enrolledAt, e.studentId, e.courseId,
           s.name as studentName, s.email as studentEmail,
           c.title as courseTitle, c.code as courseCode
    FROM enrollments e 
    JOIN students s ON s.id=e.studentId 
    JOIN courses c ON c.id=e.courseId 
    ORDER BY e.enrolledAt DESC`).all();
    // Attach payment source
    for (const e of enrollments) {
        const payment = db.prepare('SELECT amount,status FROM payments WHERE studentId=? AND courseId=? AND status IN (?,?) ORDER BY createdAt DESC LIMIT 1').get(e.studentId, e.courseId, 'completed', 'free');
        e.paidAmount = payment ? payment.amount : null;
    }
    res.json(enrollments);
});
app.post('/api/admin/enrollments', requireAdmin, (req, res) => {
    const s = db.prepare('SELECT id FROM students WHERE email=?').get(req.body.studentEmail);
    if (!s) return res.status(404).json({ error: 'Student not found.' });
    try { db.prepare('INSERT INTO enrollments (studentId,courseId) VALUES (?,?)').run(s.id, req.body.courseId); res.json({ success: true }); } catch (e) { res.status(400).json({ error: 'Already enrolled.' }); }
});
app.delete('/api/admin/enrollments/:id', requireAdmin, (req, res) => { db.prepare('DELETE FROM enrollments WHERE id=?').run(req.params.id); res.json({ success: true }); });

// Students
app.get('/api/admin/students', requireAdmin, (req, res) => {
    const students = db.prepare('SELECT id,name,email,emailVerified,createdAt FROM students ORDER BY id DESC').all();
    for (const s of students) s.enrollmentCount = db.prepare('SELECT COUNT(*) as c FROM enrollments WHERE studentId=?').get(s.id).c;
    res.json(students);
});

// Per-student enrollments (with payment source)
app.get('/api/admin/students/:id/enrollments', requireAdmin, (req, res) => {
    const enrollments = db.prepare(`
    SELECT e.id as enrollmentId, e.courseId, e.enrolledAt,
           c.title as courseTitle, c.code as courseCode, c.price as coursePrice
    FROM enrollments e
    JOIN courses c ON c.id=e.courseId
    WHERE e.studentId=?
    ORDER BY e.enrolledAt DESC`).all(req.params.id);
    for (const e of enrollments) {
        const payment = db.prepare('SELECT amount,status FROM payments WHERE studentId=? AND courseId=? AND status IN (?,?) ORDER BY createdAt DESC LIMIT 1').get(req.params.id, e.courseId, 'completed', 'free');
        e.paidAmount = payment ? payment.amount : null; // null = admin assigned
    }
    res.json(enrollments);
});

// Per-student payments
app.get('/api/admin/students/:id/payments', requireAdmin, (req, res) => {
    res.json(db.prepare('SELECT p.*, c.title as courseTitle FROM payments p JOIN courses c ON c.id=p.courseId WHERE p.studentId=? ORDER BY p.createdAt DESC').all(req.params.id));
});

// Payments
app.get('/api/admin/payments', requireAdmin, (req, res) => { res.json(db.prepare('SELECT p.*,s.name as studentName,s.email as studentEmail,c.title as courseTitle FROM payments p JOIN students s ON s.id=p.studentId JOIN courses c ON c.id=p.courseId ORDER BY p.createdAt DESC').all()); });

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

app.put('/api/admin/assignments/:id/grade', requireAdmin, (req, res) => {
    const { grade, feedback } = req.body;
    db.prepare('UPDATE assignment_submissions SET grade=?,feedback=?,gradedAt=datetime(\'now\') WHERE id=?').run(grade, feedback || '', req.params.id);
    res.json({ success: true });
});

// ═══════════════════════════════════════
//  PROGRESS TRACKING — STUDENT
// ═══════════════════════════════════════
app.post('/api/student/progress/:itemId', requireStudent, (req, res) => {
    try { db.prepare('INSERT OR IGNORE INTO student_progress (studentId,itemId) VALUES (?,?)').run(req.session.studentId, req.params.itemId); } catch (e) { }
    res.json({ success: true });
});

app.get('/api/student/progress/:courseId', requireStudent, (req, res) => {
    const modules = db.prepare('SELECT id FROM course_modules WHERE courseId=?').all(req.params.courseId);
    if (!modules.length) return res.json({ completed: 0, total: 0, percent: 0, completedItems: [] });
    const moduleIds = modules.map(m => m.id);
    const totalItems = db.prepare(`SELECT COUNT(*) as c FROM module_items WHERE moduleId IN (${moduleIds.join(',')})`).get().c;
    const completed = db.prepare(`SELECT mi.id FROM student_progress sp JOIN module_items mi ON mi.id=sp.itemId WHERE sp.studentId=? AND mi.moduleId IN (${moduleIds.join(',')})`).all(req.session.studentId);
    res.json({ completed: completed.length, total: totalItems, percent: totalItems > 0 ? Math.round((completed.length / totalItems) * 100) : 0, completedItems: completed.map(c => c.id) });
});

// ═══════════════════════════════════════
//  COURSE REVIEWS — STUDENT
// ═══════════════════════════════════════
app.post('/api/student/reviews/:courseId', requireStudent, (req, res) => {
    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5.' });
    const enrolled = db.prepare('SELECT id FROM enrollments WHERE studentId=? AND courseId=?').get(req.session.studentId, req.params.courseId);
    if (!enrolled) return res.status(403).json({ error: 'Not enrolled.' });
    try {
        db.prepare('INSERT INTO course_reviews (studentId,courseId,rating,review) VALUES (?,?,?,?) ON CONFLICT(studentId,courseId) DO UPDATE SET rating=?,review=?,createdAt=datetime(\'now\')').run(req.session.studentId, req.params.courseId, rating, review || '', rating, review || '');
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/courses/:id/reviews', (req, res) => {
    const reviews = db.prepare('SELECT cr.rating,cr.review,cr.createdAt,s.name FROM course_reviews cr JOIN students s ON s.id=cr.studentId WHERE cr.courseId=? ORDER BY cr.createdAt DESC').all(req.params.id);
    const avg = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM course_reviews WHERE courseId=?').get(req.params.id);
    res.json({ reviews, avgRating: avg.avg ? Math.round(avg.avg * 10) / 10 : 0, totalReviews: avg.count });
});

// ═══════════════════════════════════════
//  STUDENT PROFILE
// ═══════════════════════════════════════
app.get('/api/student/profile', requireStudent, (req, res) => {
    const s = db.prepare('SELECT id,name,email,createdAt FROM students WHERE id=?').get(req.session.studentId);
    const enrollments = db.prepare('SELECT e.enrolledAt, c.title, c.id as courseId FROM enrollments e JOIN courses c ON c.id=e.courseId WHERE e.studentId=? ORDER BY e.enrolledAt DESC').all(req.session.studentId);
    res.json({ student: s, enrollments });
});

app.put('/api/student/profile', requireStudent, (req, res) => {
    const { name } = req.body;
    if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    db.prepare('UPDATE students SET name=? WHERE id=?').run(name.trim(), req.session.studentId);
    res.json({ success: true });
});

app.put('/api/student/change-password', requireStudent, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const student = db.prepare('SELECT passwordHash FROM students WHERE id=?').get(req.session.studentId);
    if (!bcrypt.compareSync(currentPassword, student.passwordHash)) return res.status(400).json({ error: 'Current password is wrong.' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    db.prepare('UPDATE students SET passwordHash=? WHERE id=?').run(bcrypt.hashSync(newPassword, 12), req.session.studentId);
    res.json({ success: true });
});

// ═══════════════════════════════════════
//  COUPONS — ADMIN
// ═══════════════════════════════════════
app.get('/api/admin/coupons', requireAdmin, (req, res) => { res.json(db.prepare('SELECT * FROM coupons ORDER BY createdAt DESC').all()); });

app.post('/api/admin/coupons', requireAdmin, (req, res) => {
    const { code, discountType, discountValue, maxUses, expiresAt } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required.' });
    try {
        db.prepare('INSERT INTO coupons (code,discountType,discountValue,maxUses,expiresAt) VALUES (?,?,?,?,?)').run(code.toUpperCase(), discountType || 'percent', discountValue || 10, maxUses || 100, expiresAt || null);
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: 'Code already exists.' }); }
});

app.delete('/api/admin/coupons/:id', requireAdmin, (req, res) => { db.prepare('DELETE FROM coupons WHERE id=?').run(req.params.id); res.json({ success: true }); });

// Validate coupon — Student
app.post('/api/student/validate-coupon', requireStudent, (req, res) => {
    const { code, courseId } = req.body;
    const coupon = db.prepare('SELECT * FROM coupons WHERE code=? AND active=1').get(code?.toUpperCase());
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon code.' });
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return res.status(400).json({ error: 'Coupon expired.' });
    if (coupon.usedCount >= coupon.maxUses) return res.status(400).json({ error: 'Coupon fully used.' });
    const used = db.prepare('SELECT id FROM coupon_usage WHERE couponId=? AND studentId=? AND courseId=?').get(coupon.id, req.session.studentId, courseId);
    if (used) return res.status(400).json({ error: 'Already used this coupon.' });

    const course = db.prepare('SELECT price FROM courses WHERE id=?').get(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found.' });
    let discount = coupon.discountType === 'percent' ? Math.round(course.price * coupon.discountValue / 100) : coupon.discountValue;
    if (discount > course.price) discount = course.price;
    res.json({ valid: true, discount, finalPrice: course.price - discount, couponId: coupon.id });
});

// ═══════════════════════════════════════
//  ANNOUNCEMENTS — ADMIN
// ═══════════════════════════════════════
app.get('/api/admin/announcements', requireAdmin, (req, res) => { res.json(db.prepare('SELECT a.*, c.title as courseTitle FROM announcements a LEFT JOIN courses c ON c.id=a.courseId ORDER BY a.createdAt DESC').all()); });

app.post('/api/admin/announcements', requireAdmin, (req, res) => {
    const { title, message, courseId } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message required.' });
    db.prepare('INSERT INTO announcements (title,message,courseId) VALUES (?,?,?)').run(title, message, courseId || null);
    res.json({ success: true });
});

app.delete('/api/admin/announcements/:id', requireAdmin, (req, res) => { db.prepare('DELETE FROM announcements WHERE id=?').run(req.params.id); res.json({ success: true }); });

// Student announcements
app.get('/api/student/announcements', requireStudent, (req, res) => {
    const enrolled = db.prepare('SELECT courseId FROM enrollments WHERE studentId=?').all(req.session.studentId).map(e => e.courseId);
    if (!enrolled.length) return res.json(db.prepare('SELECT * FROM announcements WHERE courseId IS NULL ORDER BY createdAt DESC LIMIT 20').all());
    res.json(db.prepare(`SELECT * FROM announcements WHERE courseId IS NULL OR courseId IN (${enrolled.join(',')}) ORDER BY createdAt DESC LIMIT 20`).all());
});

// ═══════════════════════════════════════
//  ANALYTICS — ADMIN
// ═══════════════════════════════════════
app.get('/api/admin/analytics', requireAdmin, (req, res) => {
    const totalStudents = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
    const totalEnrollments = db.prepare('SELECT COUNT(*) as c FROM enrollments').get().c;
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status='completed' OR status='free'").get().total;
    const totalCourses = db.prepare('SELECT COUNT(*) as c FROM courses WHERE published=1').get().c;
    const recentEnrollments = db.prepare('SELECT e.enrolledAt, s.name, s.email, c.title as courseTitle FROM enrollments e JOIN students s ON s.id=e.studentId JOIN courses c ON c.id=e.courseId ORDER BY e.enrolledAt DESC LIMIT 10').all();
    const popularCourses = db.prepare('SELECT c.title, c.id, COUNT(e.id) as enrollCount FROM courses c LEFT JOIN enrollments e ON e.courseId=c.id WHERE c.published=1 GROUP BY c.id ORDER BY enrollCount DESC LIMIT 5').all();
    const monthlyEnrollments = db.prepare("SELECT strftime('%Y-%m', enrolledAt) as month, COUNT(*) as count FROM enrollments GROUP BY month ORDER BY month DESC LIMIT 12").all();
    res.json({ totalStudents, totalEnrollments, totalRevenue, totalCourses, recentEnrollments, popularCourses, monthlyEnrollments });
});

// ═══════════════════════════════════════
//  START
// ═══════════════════════════════════════
app.listen(PORT, () => {
    console.log(`\n🥷 NinjaHackers server running at http://localhost:${PORT}`);
    console.log(`📝 Admin panel:     http://localhost:${PORT}/admin`);
    console.log(`🎓 Student portal:  http://localhost:${PORT}/learn`);
    console.log(`🔒 DB location:     .data/database.db (hidden)`);
    console.log(`🛡️  Security: Helmet, Rate Limiting, OTP, Brute Force Protection\n`);
});
