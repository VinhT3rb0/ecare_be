const express = require('express');
const router = express.Router();
const doctorScheduleController = require('../controllers/doctor_schedule.controller');
const doctorAuth = require('../middleware/doctorAuth');
const adminAuth = require('../middleware/adminAuth');

// ===== DOCTOR ROUTES (requires doctor authentication) =====
// Lấy tất cả lịch làm việc của bác sĩ hiện tại (yêu cầu truyền :doctor_id trên URL)
router.get('/my-schedules/:doctor_id', doctorAuth, doctorScheduleController.getMySchedules);

// Check-in / Check-out (doctor only)
router.post('/:id/check-in', doctorAuth, doctorScheduleController.checkIn);
router.post('/:id/check-out', doctorAuth, doctorScheduleController.checkOut);

// Thêm lịch làm việc mới
router.post('/', adminAuth, doctorScheduleController.createSchedule);

// Tạo nhiều lịch làm việc cùng lúc
router.post('/bulk', adminAuth, doctorScheduleController.createBulkSchedules);

// Sửa lịch làm việc
router.put('/:id', adminAuth, doctorScheduleController.updateSchedule);

// Xóa lịch làm việc
router.delete('/:id', adminAuth, doctorScheduleController.deleteSchedule);

// Xóa nhiều lịch làm việc
router.delete('/bulk', adminAuth, doctorScheduleController.deleteBulkSchedules);

// Lấy thống kê lịch làm việc
router.get('/stats', adminAuth, doctorScheduleController.getScheduleStats);

// Tự động cập nhật trạng thái (admin triggers or scheduled)
router.post('/internal/auto-update-statuses', doctorScheduleController.autoUpdateStatuses);
// Lấy ca làm việc trong 2 tuần của bác sĩ
router.get('/doctor/:doctor_id/schedules', doctorScheduleController.getSchedulesForDoctor);

// Lấy danh sách bác sĩ làm việc trong ngày
router.get('/doctors-for-date/:date', doctorScheduleController.getDoctorsForDate);
// ===== ADMIN ROUTES (requires admin authentication) =====
// Lấy lịch làm việc của tất cả bác sĩ hoặc 1 cụ thể trong 1 khoảng thời gian
router.get('/', doctorScheduleController.getDoctorSchedules);


module.exports = router; 