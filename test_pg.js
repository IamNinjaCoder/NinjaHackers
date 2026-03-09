const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://ninjacoder:password@localhost:5432/ninjahackers',
});
pool.query('SELECT 1').then(()=> { console.log('success'); pool.end(); }).catch(e => { console.error('fail:', e.message); pool.end(); });
