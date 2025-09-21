const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');

router.get('/overview', statsController.getOverview);
router.get('/revenue-series', statsController.getRevenueSeries);
router.get('/invoices-series', statsController.getInvoicesSeries);
router.get('/revenue-by-department', statsController.getRevenueByDepartment);
router.get('/top-services', statsController.getTopServices);

module.exports = router;


