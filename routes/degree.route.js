const express = require('express');
const router = express.Router();
const degreeController = require('../controllers/degree.controller');
const doctorAuth = require('../middleware/doctorAuth');
const upload = require('../middleware/uploadCloudinary'); // file vừa tạo

// Lấy danh sách bằng cấp của bác sĩ
router.get('/:doctor_id', doctorAuth, degreeController.getMyDegrees);
// Thêm bằng cấp mới
router.post('/', doctorAuth, degreeController.createDegree);
// Sửa bằng cấp
router.put('/:id', doctorAuth, degreeController.updateDegree);
// Xóa bằng cấp
router.delete('/:id', doctorAuth, degreeController.deleteDegree);


//pending degree
router.get('/pending/:doctor_id', doctorAuth, degreeController.getPendingDegrees);
router.post('/pending', doctorAuth, upload.single('proof_image_url'), degreeController.createPendingDegree);
// router.put('/pending/:id', doctorAuth, degreeController.updatePendingDegree);
// router.delete('/pending/:id', doctorAuth, degreeController.deletePendingDegree);

module.exports = router;