const express = require('express');
const router = express.Router();
const packageController = require('../controllers/package.controller');
const adminAuth = require('../middleware/adminAuth');
const upload = require('../middleware/uploadCloudinary'); // file vừa tạo

// Lấy danh sách gói khám
router.get('/', packageController.getAllPackages);
// Lấy gói khám theo department
router.get('/department/:department_id', adminAuth, packageController.getPackagesByDepartment);
// Thêm gói khám mới
router.post('/', adminAuth, upload.single('image'), packageController.createPackage);
// Sửa thông tin gói khám
router.patch('/:id', adminAuth, upload.single('image'), packageController.updatePackage);
// Xóa gói khám
router.delete('/:id', adminAuth, packageController.deletePackage);

module.exports = router; 