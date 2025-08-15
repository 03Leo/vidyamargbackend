const express = require('express');
const cors = require('cors');
const app = express();
const port = 5000;
const hostels = require('./dummyHostels.json')
const nodemailer = require('nodemailer');

app.use(cors());
app.use(express.json());

app.get('/api/hostels', (req, res) => {
    res.json(hostels);
});

// Send email
app.post('/api/send-mail', async (req, res) => {
    const { name, age, educationDomain, locationPreference, email, mobile, hostelName, hostelId } = req.body;

    // Create transporter
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'hk4hritikjaiswal@gmail.com',
            pass: 'hgjokhjetzolmbfo'  // Use an App Password, not your Gmail password
        }
    });

    // Mail content
    const mailOptions = {
        from: 'hk4hritikjaiswal@gmail.com',
        to: '03hritik.20@gmail.com', // Where you want to receive the mail
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