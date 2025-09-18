const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

const pendingUsers = {}; // { email: { otp, userData, expiresAt } }

router.post('/login', authController.login);
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.post('/change-password', authController.changePassword);
router.get('/profile', authController.getProfile);
router.patch('/profile', authController.updateProfile);
router.get('/patients', authController.getPatientAccount);

module.exports = router;
