const express = require('express');
const router = express.Router();
const medicalRecordController = require('../controllers/medical_record.controller');
const doctorAuth = require('../middleware/doctorAuth');

// Tạo hồ sơ bệnh án mới (chỉ bác sĩ)
router.post('/', medicalRecordController.createMedicalRecord);

// Lấy danh sách hồ sơ bệnh án
router.get('/', medicalRecordController.getMedicalRecords);

// Lấy chi tiết hồ sơ bệnh án
router.get('/:id', medicalRecordController.getMedicalRecordById);

// Cập nhật hồ sơ bệnh án (chỉ bác sĩ)
router.put('/:id', doctorAuth, medicalRecordController.updateMedicalRecord);

// Xóa hồ sơ bệnh án (chỉ bác sĩ)
router.delete('/:id', doctorAuth, medicalRecordController.deleteMedicalRecord);

// Lấy hồ sơ bệnh án theo bác sĩ
router.get('/doctor/:doctor_id', medicalRecordController.getMedicalRecordsByDoctor);

// Lấy hồ sơ bệnh án theo bệnh nhân
router.get('/patient/:patient_id', medicalRecordController.getMedicalRecordsByPatient);

module.exports = router;
