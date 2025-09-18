const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/auth.route');
const roomRoutes = require('./routes/room.route');
const packageRoutes = require('./routes/package.route');
const doctorRoutes = require('./routes/doctor.route');
const doctorScheduleRoutes = require('./routes/doctor_schedule.route');
const departmentRoutes = require('./routes/department.route');
const degreeRoutes = require('./routes/degree.route');
const chatRoutes = require('./routes/chat.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const invoiceRoutes = require('./routes/invoice.route');
const paymentRoutes = require('./routes/payment.routes');
const medicineRoutes = require('./routes/medicine.routes');
const medicalRecordRoutes = require('./routes/medical_record.routes');
const app = express();
app.use(cors());
app.use(bodyParser.json());
// Route chính
app.use('/api/app-home/v1/', authRoutes);
app.use('/api/app-room/v1/', roomRoutes);
app.use('/api/app-package/v1/', packageRoutes);
app.use('/api/app-doctor/v1/', doctorRoutes);
app.use('/api/app-degree/v1/', degreeRoutes);
app.use('/api/app-doctor-schedule/v1/', doctorScheduleRoutes);
app.use('/api/app-department/v1/', departmentRoutes);
app.use('/api/app-chat/v1/', chatRoutes);
app.use('/api/app-appointment/v1/', appointmentRoutes);
app.use('/api/app-invoice/v1/', invoiceRoutes);
app.use('/api/app-payment/v1/', paymentRoutes);
app.use('/api/app-medicine/v1/', medicineRoutes);
app.use('/api/medical-record/v1/', medicalRecordRoutes);

module.exports = app;
