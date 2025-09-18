const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');
const adminAuth = require('../middleware/adminAuth');

// Kiểm tra tính khả dụng của lịch hẹn
router.get('/check-availability', appointmentController.checkAppointmentAvailability);

// Tạo mới một lịch hẹn
router.post('/', appointmentController.createAppointment);

// Lấy danh sách lịch hẹn
router.get('/', appointmentController.getAppointments);

// Lấy thông tin chi tiết một lịch hẹn
router.get('/:id', appointmentController.getAppointmentById);

// Cập nhật lịch hẹn
router.put('/:id', appointmentController.updateAppointment);

// Bắt đầu điều trị
router.post('/:id/start-treatment', appointmentController.startTreatment);

// Auto hủy lịch hẹn quá giờ
router.post('/auto-cancel-overdue', appointmentController.autoCancelOverdueAppointments);

// Xóa lịch hẹn
router.delete('/:id', appointmentController.deleteAppointment);
router.get('/doctor/:doctor_id', appointmentController.getAppointmentsByDoctor);
// Lấy lịch hẹn theo bác sĩ và ngày
router.get('/doctor/:doctor_id/date/:appointment_date', appointmentController.getAppointmentsByDoctorAndDate);
// Lấy danh sách ca làm việc khả dụng của bác sĩ
router.get('/available-time-slots/:doctor_id/:appointment_date', appointmentController.getAvailableTimeSlots);

router.get("/patient/:patient_id", appointmentController.getAppointmentsByPatient);

// Yêu cầu hủy từ bệnh nhân
router.post('/:id/cancel-request', appointmentController.requestCancelAppointment);
// Bác sĩ xác nhận hủy
router.post('/:id/cancel-approve', appointmentController.approveCancelAppointment);
// Bác sĩ từ chối hủy
router.post('/:id/cancel-reject', appointmentController.rejectCancelAppointment);
// Bác sĩ hủy lịch hẹn trực tiếp
router.post('/:id/doctor-cancel', appointmentController.doctorCancelAppointment);
// Lấy danh sách lịch hẹn theo status
router.get('/status/:status', appointmentController.getAppointmentsByStatus);
module.exports = router;