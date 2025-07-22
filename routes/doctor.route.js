const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const authMiddleware = require('../middleware/doctorAuth');

// Lấy hồ sơ bác sĩ theo user_id
router.get('/profile/:user_id', authMiddleware, doctorController.getDoctorProfile);
router.post('/register', doctorController.createDoctorAccount);
router.put('/profile/:user_id', authMiddleware, doctorController.updateDoctorProfile);

module.exports = router;