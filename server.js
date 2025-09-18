const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'healthcare_platform_default_secret_key_2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'healthcare_platform'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Patient Registration
app.post('/api/patients/register', async (req, res) => {
    try {
        const {
            firstName, lastName, email, phone, dateOfBirth, gender,
            address, emergencyContactName, emergencyContactPhone,
            bloodGroup, allergies, medicalHistory, password
        } = req.body;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.execute(
            `INSERT INTO patients (first_name, last_name, email, phone, date_of_birth, 
             gender, address, emergency_contact_name, emergency_contact_phone, 
             blood_group, allergies, medical_history, password_hash) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [firstName, lastName, email, phone, dateOfBirth, gender, address,
             emergencyContactName, emergencyContactPhone, bloodGroup, allergies,
             medicalHistory, hashedPassword]
        );

        res.status(201).json({
            message: 'Patient registered successfully',
            patientId: result.insertId
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Patient Login
app.post('/api/patients/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [rows] = await pool.execute(
            'SELECT * FROM patients WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const patient = rows[0];
        const validPassword = await bcrypt.compare(password, patient.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: patient.patient_id, type: 'patient' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            patient: {
                id: patient.patient_id,
                firstName: patient.first_name,
                lastName: patient.last_name,
                email: patient.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get patient profile
app.get('/api/patients/profile', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'patient') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [rows] = await pool.execute(
            'SELECT * FROM patients WHERE patient_id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        const patient = rows[0];
        delete patient.password_hash;

        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Get all healthcare professionals
app.get('/api/professionals', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT professional_id, first_name, last_name, specialization, 
             department, experience_years, consultation_fee, 
             availability_start, availability_end 
             FROM healthcare_professionals`
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch professionals' });
    }
});

// Get professionals by specialization
app.get('/api/professionals/specialization/:spec', async (req, res) => {
    try {
        const { spec } = req.params;
        const [rows] = await pool.execute(
            `SELECT professional_id, first_name, last_name, specialization, 
             department, experience_years, consultation_fee,
             availability_start, availability_end 
             FROM healthcare_professionals WHERE specialization LIKE ?`,
            [`%${spec}%`]
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch professionals' });
    }
});

// Book appointment
app.post('/api/appointments', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'patient') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { professionalId, appointmentDate, appointmentTime, reason } = req.body;

        // Check if the time slot is available
        const [existing] = await pool.execute(
            `SELECT * FROM appointments 
             WHERE professional_id = ? AND appointment_date = ? 
             AND appointment_time = ? AND status != 'Cancelled'`,
            [professionalId, appointmentDate, appointmentTime]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Time slot not available' });
        }

        const [result] = await pool.execute(
            `INSERT INTO appointments (patient_id, professional_id, appointment_date, 
             appointment_time, reason) VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, professionalId, appointmentDate, appointmentTime, reason]
        );

        res.status(201).json({
            message: 'Appointment booked successfully',
            appointmentId: result.insertId
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to book appointment' });
    }
});

// Get patient appointments
app.get('/api/appointments', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'patient') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [rows] = await pool.execute(
            `SELECT a.*, hp.first_name AS doctor_first_name, 
             hp.last_name AS doctor_last_name, hp.specialization
             FROM appointments a
             JOIN healthcare_professionals hp ON a.professional_id = hp.professional_id
             WHERE a.patient_id = ?
             ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

// Update appointment status
app.put('/api/appointments/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const [result] = await pool.execute(
            'UPDATE appointments SET status = ? WHERE appointment_id = ? AND patient_id = ?',
            [status, id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        res.json({ message: 'Appointment updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update appointment' });
    }
});

// Get available time slots for a professional on a specific date
app.get('/api/professionals/:id/availability/:date', async (req, res) => {
    try {
        const { id, date } = req.params;

        // Get professional's working hours
        const [professional] = await pool.execute(
            'SELECT availability_start, availability_end FROM healthcare_professionals WHERE professional_id = ?',
            [id]
        );

        if (professional.length === 0) {
            return res.status(404).json({ error: 'Professional not found' });
        }

        // Get booked appointments for that day
        const [booked] = await pool.execute(
            `SELECT appointment_time FROM appointments 
             WHERE professional_id = ? AND appointment_date = ? AND status != 'Cancelled'`,
            [id, date]
        );

        const bookedTimes = booked.map(apt => apt.appointment_time);

        // Generate available slots (every 30 minutes)
        const availableSlots = [];
        const startTime = new Date(`1970-01-01T${professional[0].availability_start}`);
        const endTime = new Date(`1970-01-01T${professional[0].availability_end}`);

        while (startTime < endTime) {
            const timeString = startTime.toTimeString().slice(0, 5) + ':00';
            
            if (!bookedTimes.some(booked => 
                booked.toTimeString().slice(0, 8) === timeString)) {
                availableSlots.push(timeString);
            }
            
            startTime.setMinutes(startTime.getMinutes() + 30);
        }

        res.json(availableSlots);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Healthcare platform server running on port ${PORT}`);
});