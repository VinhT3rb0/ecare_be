const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const doctorAuth = require('../middleware/doctorAuth');
const upload = require('../middleware/uploadCloudinary');
const adminAuth = require('../middleware/adminAuth');

// Lấy profile bác sĩ
router.get('/profile/:id', doctorController.getProfile);
// Cập nhật profile bác sĩ  
router.patch('/profile/:user_id', doctorAuth, upload.single('avatar_img'), doctorController.updateProfile);
//admin
router.get('/doctor-approved', doctorController.getApprovedDoctors);

router.post('/create-doctor', adminAuth, doctorController.createDoctorAccount);
router.post('/approve-doctor/:doctor_id', adminAuth, upload.single('proof_image_url'), doctorController.approveDoctor);
router.get('/doctor-list', doctorController.getDoctorList);
router.put('/doctors/:doctor_id', adminAuth, upload.single('proof_image_url'), doctorController.updateDoctorAndDegree);
router.get('/:department_id/doctor', doctorController.getDoctorsByDepartment);
router.get('/by-date-and-department', doctorController.getDoctorsByDateAndDepartment)
module.exports = router;