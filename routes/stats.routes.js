const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const doctorAuth = require('../middleware/doctorAuth');

router.get('/overview', statsController.getOverview);
router.get('/revenue-series', statsController.getRevenueSeries);
router.get('/invoices-series', statsController.getInvoicesSeries);
router.get('/revenue-by-department', statsController.getRevenueByDepartment);
router.get('/top-services', statsController.getTopServices);
// Doctor-specific stats
router.get('/doctor/overview', doctorAuth, statsController.getDoctorOverview);
router.get('/doctor/upcoming', doctorAuth, statsController.getDoctorUpcomingAppointments);
router.get('/doctor/appointments-series', doctorAuth, statsController.getDoctorAppointmentsSeries);

module.exports = router;


