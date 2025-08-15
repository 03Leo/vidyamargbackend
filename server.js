const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Load env variables

const app = express();
const port = process.env.PORT || 5000;
const hostels = require('./dummyHostels.json');

app.use(cors());
app.use(express.json());

app.get('/api/hostels', (req, res) => {
    res.json(hostels);
});

// Send email
app.post('/api/send-mail', async (req, res) => {
    const { name, age, educationDomain, locationPreference, email, mobile, hostelName, hostelId } = req.body;

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: '03hritik.20@gmail.com',
        subject: `New Booking Request for ${hostelName}`,
        text: `
        Name: ${name}
        Age: ${age}
        Email: ${email}
        Mobile: ${mobile}
        Education Domain: ${educationDomain}
        Location Preference: ${locationPreference}
        Hostel: ${hostelName}
        Hostel ID: ${hostelId}
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Mail sent successfully! Server', info });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error sending mail Server', error });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
