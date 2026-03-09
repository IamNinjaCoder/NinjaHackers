const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: 'bcodingninja@gmail.com', pass: 'optwdzeqmlchkmwa' },
    debug: true,
    logger: true
});

transporter.sendMail({
    from: 'bcodingninja@gmail.com',
    to: 'codingwarriorhu@gmail.com',
    subject: 'Test Email',
    text: 'This is a test'
}).then(info => {
    console.log("Message sent:", info.messageId);
    process.exit(0);
}).catch(err => {
    console.error("Error sending:", err);
    process.exit(1);
});
