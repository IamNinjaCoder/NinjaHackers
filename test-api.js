const fetch = require('node-fetch'); // or axios, or native fetch in node 18+
fetch('http://localhost:3000/api/student/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'codingwarriorhu@gmail.com' })
}).then(res => res.json()).then(console.log).catch(console.error);
