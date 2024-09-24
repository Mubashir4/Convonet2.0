const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // Using Gmail's SMTP service
    auth: {
        user: 'noreply.system.assist@gmail.com', // Your Google Workspace email
        pass: 'ljae wwxn fwgc adjl' // Your Google Workspace email password or app-specific password
    }
});

module.exports = transporter;