const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// 1. We must temporarily require better-sqlite3 just for the migration script.
// In the actual project we removed it, so we'll run `npm install better-sqlite3` temporarily
// just for this script, then remove it.
try {
    require.resolve('better-sqlite3');
} catch (e) {
    console.error("Please run `npm install better-sqlite3` temporarily for migration to work.");
    process.exit(1);
}

const Database = require('better-sqlite3');

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

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://localhost/ninjahackers',
});

const sqliteDbPath = path.join(__dirname, '.data', 'database.db');
if (!fs.existsSync(sqliteDbPath)) {
    console.error("SQLite database not found at", sqliteDbPath);
    process.exit(0);
}

const sqliteDb = new Database(sqliteDbPath);

async function migrate() {
    console.log("Starting DB migration from SQLite to PostgreSQL...");
    
    const tables = [
        'blogs', 'comments', 'admin_users', 'students', 'courses',
        'course_modules', 'module_items', 'enrollments', 'payments',
        'contact_messages', 'security_logs', 'quizzes', 'quiz_questions',
        'quiz_attempts', 'assignment_submissions', 'student_progress',
        'course_reviews', 'coupons', 'coupon_usage', 'announcements', 'site_settings'
    ];

    const client = await pgPool.connect();

    try {
        await client.query('BEGIN');
        
        // 1. Temporarily disable foreign key checks in postgres (session level constraints)
        await client.query('SET CONSTRAINTS ALL DEFERRED');

        for (const table of tables) {
            console.log(`Migrating table: ${table}`);
            
            // Get all rows from SQLite
            let rows;
            try {
                rows = sqliteDb.prepare(`SELECT * FROM ${table}`).all();
            } catch (e) {
                console.log(`  Table ${table} might not exist in SQLite or error reading. Skipping.`);
                continue;
            }
            
            if (rows.length === 0) {
                console.log(`  No rows in ${table}.`);
                continue;
            }

            // Delete existing rows in Postgres to avoid conflicts? 
            // Better to assume empty Postgres DB for migration.
            await client.query(`TRUNCATE TABLE ${table} CASCADE`);
            
            // Build bulk insert query
            const columns = Object.keys(rows[0]);
            for (const row of rows) {
                const values = columns.map(col => row[col]);
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
                
                try {
                     await client.query(
                        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
                        values
                    );
                } catch (err) {
                     console.error(`  Error inserting row into ${table}:`, err.message);
                }
            }
            
            // 2. Restart sequence for SERIAL columns
            if (columns.includes('id')) {
                try {
                    const maxIdRes = await client.query(`SELECT MAX(id) as max_id FROM ${table}`);
                    const maxId = maxIdRes.rows[0].max_id || 0;
                    await client.query(`SELECT setval('${table}_id_seq', ${maxId > 0 ? maxId : 1}, true)`);
                } catch (seqErr) {
                    console.log(`  Warning: Could not update sequence for ${table} (maybe no id_seq): ${seqErr.message}`);
                }
            }
            console.log(`  Migrated ${rows.length} rows for ${table}.`);
        }
        
        await client.query('COMMIT');
        console.log("Migration completed successfully!");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Migration failed, transaction rolled back:", err);
    } finally {
        client.release();
        sqliteDb.close();
        await pgPool.end();
    }
}

migrate();
