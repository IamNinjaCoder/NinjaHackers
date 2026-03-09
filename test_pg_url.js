const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  password: 'password',
  host: '127.0.0.1',
  database: 'postgres',
  port: 5432,
});
client.connect().then(()=> { console.log("OK"); client.end(); }).catch(e => { console.error("ERR:", e.message); client.end(); });
