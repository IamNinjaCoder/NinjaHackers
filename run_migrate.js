const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');

const sqliteDbPath = path.join(__dirname, '.data', 'database.db');
const sqliteDb = new Database(sqliteDbPath);

const pgPool = new Pool({
    user: process.env.USER,
    host: 'localhost',
    database: 'ninjahackers',
    port: 5433,
});

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
        await client.query('SET CONSTRAINTS ALL DEFERRED');

        for (const table of tables) {
            console.log(`Migrating table: ${table}`);
            let rows;
            try {
                rows = sqliteDb.prepare(`SELECT * FROM ${table}`).all();
            } catch (e) {
                console.log(`  Table ${table} skipped.`);
                continue;
            }

            if (rows.length === 0) continue;

            await client.query(`TRUNCATE TABLE ${table} CASCADE`);

            const columns = Object.keys(rows[0]);
            for (const row of rows) {
                const values = columns.map(col => row[col] === null ? null : String(row[col]));
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

            if (columns.includes('id')) {
                try {
                    const maxIdRes = await client.query(`SELECT MAX(id) as max_id FROM ${table}`);
                    const maxId = maxIdRes.rows[0].max_id || 0;
                    await client.query(`SELECT setval('${table}_id_seq', ${maxId > 0 ? maxId : 1}, true)`);
                } catch (seqErr) { }
            }
            console.log(`  Migrated ${rows.length} rows for ${table}.`);
        }

        await client.query('COMMIT');
        console.log("Migration completed successfully!");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", err);
    } finally {
        client.release();
        sqliteDb.close();
        await pgPool.end();
    }
}
migrate();
