const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// Tạo URL thanh toán MoMo cho hóa đơn
router.post('/momo/create', paymentController.createMomoPayment);

// Return URL (trình duyệt redirect về)
router.get('/momo/return', paymentController.momoReturn);

// IPN (MoMo gọi server-to-server)
router.post('/momo/ipn', paymentController.momoIpn);

// Thanh toán tiền mặt
router.post('/cash/create', paymentController.createCashPayment);

module.exports = router;




