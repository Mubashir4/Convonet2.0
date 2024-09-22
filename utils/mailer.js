const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // Using Gmail's SMTP service
    auth: {
        user: 'begin@convonote.com', // Your Google Workspace email
        pass: 'AINote25##' // Your Google Workspace email password or app-specific password
    }
});

module.exports = transporter;