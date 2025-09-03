const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ✅ MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,     // e.g. 'localhost'
    user: process.env.DB_USER,     // e.g. 'root'
    password: process.env.DB_PASS, // your MySQL password
    database: process.env.DB_NAME,  // e.g. 'vidyamarg'
    port: process.env.DB_PORT
});

db.connect(err => {
    if (err) {
        console.error('❌ MySQL connection failed:', err);
        return;
    }
    console.log('✅ Connected to MySQL');
});

// ------------------ APIs ------------------

// Get all hostels with images
app.get('/api/hostels', (req, res) => {
  const query = `
    SELECT 
      hi.hostel_id, hi.hostel_name, hi.owner_name, hi.gender, hi.address,
      hi.common_amenities, hi.inroom_amenities, hi.area_tag, hi.sub_area_tag,
      hi.total_beds, hi.beds_available, hi.contact_number, hi.email_id,
      hi.about_hostel, hi.building_age_years,
      hrt.room_type, hrt.price_per_person, hrt.security_deposit, hrt.payment_frequency, hrt.room_size_sqft,
      him.image_url
    FROM hostel_information hi
    LEFT JOIN hostel_room_types hrt ON hi.hostel_id = hrt.hostel_id
    LEFT JOIN hostel_images him ON hi.hostel_id = him.hostel_id;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error fetching hostels:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const hostels = {};
    results.forEach(row => {
      if (!hostels[row.hostel_id]) {
        hostels[row.hostel_id] = {
          hostel_information: {
            hostel_name: row.hostel_name,
            owner_name: row.owner_name,
            gender: row.gender,
            address: row.address,
            common_amenities: row.common_amenities ? JSON.parse(row.common_amenities) : [],
            inroom_amenities: row.inroom_amenities ? JSON.parse(row.inroom_amenities) : [],
            area_tag: row.area_tag,
            sub_area_tag: row.sub_area_tag,
            total_beds: row.total_beds,
            beds_available: row.beds_available,
            contact_number: row.contact_number,
            email_id: row.email_id,
            about_hostel: row.about_hostel,
            building_age_years: row.building_age_years
          },
          hostel_room_types: [],
          images: []
        };
      }

      if (row.room_type) {
        hostels[row.hostel_id].hostel_room_types.push({
          room_type: row.room_type,
          price_per_person: row.price_per_person,
          security_deposit: row.security_deposit,
          payment_frequency: row.payment_frequency,
          room_size_sqft: row.room_size_sqft
        });
      }

      if (row.image_url && !hostels[row.hostel_id].images.includes(row.image_url)) {
        hostels[row.hostel_id].images.push(row.image_url);
      }
    });

    const response = Object.values(hostels);
    res.json(response);
  });
});



app.post('/api/hostels', (req, res) => {
    console.log('Request Body Node:', req.body);

    const { hostel_information, hostel_room_types, hostel_images } = req.body;
    console.log('Hostel Images:', hostel_images);
    

    if (!hostel_information) {
        return res.status(400).json({ error: 'hostel_information is required' });
    }

    const {
        hostel_name,
        owner_name,
        gender,
        address,
        common_amenities,
        inroom_amenities,
        area_tag,
        sub_area_tag,
        total_beds,
        beds_available,
        contact_number,
        email_id,
        about_hostel,
        building_age_years
    } = hostel_information;

    const hostelQuery = `
        INSERT INTO hostel_information 
        (hostel_name, owner_name, gender, address, common_amenities, inroom_amenities, area_tag, sub_area_tag, total_beds, beds_available, contact_number, email_id, about_hostel, building_age_years) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        hostelQuery,
        [
            hostel_name,
            owner_name,
            gender,
            address,
            JSON.stringify(common_amenities),
            JSON.stringify(inroom_amenities),
            area_tag,
            sub_area_tag,
            total_beds,
            beds_available,
            contact_number,
            email_id,
            about_hostel,
            building_age_years
        ],
        (err, result) => {
            if (err) {
                console.error('❌ Error inserting hostel:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            const hostelId = result.insertId;

            // Insert hostel room types
            const insertRooms = () => {
                if (hostel_room_types && hostel_room_types.length > 0) {
                    const roomQuery = `
                        INSERT INTO hostel_room_types 
                        (hostel_id, room_type, price_per_person, security_deposit, payment_frequency, room_size_sqft) 
                        VALUES ?
                    `;

                    const values = hostel_room_types.map(rt => [
                        hostelId,
                        rt.room_type,
                        rt.price,
                        rt.deposit,
                        rt.frequency,
                        rt.size
                    ]);

                    return new Promise((resolve, reject) => {
                        db.query(roomQuery, [values], (err2) => {
                            if (err2) {
                                console.error('❌ Error inserting room types:', err2);
                                return reject('Database error inserting room types');
                            }
                            resolve();
                        });
                    });
                }
                return Promise.resolve();
            };

            // Insert hostel images
            const insertImages = () => {
                if (hostel_images && hostel_images.length > 0) {
                    const imageQuery = `
                        INSERT INTO hostel_images 
                        (hostel_id, image_url) 
                        VALUES ?
                    `;

                    const values = hostel_images.map(url => [hostelId, url]);

                    return new Promise((resolve, reject) => {
                        db.query(imageQuery, [values], (err3) => {
                            if (err3) {
                                console.error('❌ Error inserting hostel images:', err3);
                                return reject('Database error inserting images');
                            }
                            resolve();
                        });
                    });
                }
                return Promise.resolve();
            };

            // Chain all insertions
            insertRooms()
                .then(insertImages)
                .then(() => {
                    res.status(201).json({ message: '✅ Hostel, rooms, and images added successfully!' });
                })
                .catch((errMsg) => {
                    res.status(500).json({ error: errMsg });
                });
        }
    );
});



// Send email (Booking request)
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
        res.status(200).json({ message: '✅ Mail sent successfully!', info });
    } catch (error) {
        console.error('❌ Mail error:', error);
        res.status(500).json({ message: 'Error sending mail', error });
    }
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server running at https://localhost:${port}`);
});
