const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/department.controller');
const adminAuth = require('../middleware/adminAuth');
const doctorAuth = require('../middleware/doctorAuth');

// Lấy danh sách chuyên khoa
router.get('/', departmentController.getAllDepartments);
// Thêm chuyên khoa mới
router.post('/', adminAuth, departmentController.createDepartment);
// Sửa thông tin chuyên khoa
router.put('/:id', adminAuth, departmentController.updateDepartment);
// Xóa chuyên khoa
router.delete('/:id', adminAuth, departmentController.deleteDepartment);
// Lấy danh sách chuyên khoa của bác sĩ
router.get('/doctor/:doctor_id', doctorAuth, departmentController.getMyDepartments);

// Thêm chuyên khoa cho bác sĩ
router.post('/doctor/:doctor_id', adminAuth, departmentController.addDepartments);
// Xóa chuyên khoa khỏi bác sĩ
router.delete('/doctor/:doctor_id/:department_id', adminAuth, departmentController.removeDepartment);
module.exports = router; 