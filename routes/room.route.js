const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');
const adminAuth = require('../middleware/adminAuth');

// Lấy danh sách phòng khám
router.get('/', adminAuth, roomController.getAllRooms);
// Thêm phòng khám mới
router.post('/', adminAuth, roomController.createRoom);
// Sửa thông tin phòng khám
router.put('/:id', adminAuth, roomController.updateRoom);
// Xóa phòng khám
router.delete('/:id', adminAuth, roomController.deleteRoom);

module.exports = router;
