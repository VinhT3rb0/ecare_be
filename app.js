const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/auth.route');
const roomRoutes = require('./routes/room.route');
const packageRoutes = require('./routes/package.route');
const doctorRoutes = require('./routes/doctor.route');
const app = express();
app.use(cors());
app.use(bodyParser.json());
// Route chính
app.use('/api/app-home/v1/', authRoutes);
app.use('/api/app-room/v1/', roomRoutes);
app.use('/api/app-package/v1/', packageRoutes);
app.use('/api/app-doctor/v1/', doctorRoutes);
module.exports = app;
