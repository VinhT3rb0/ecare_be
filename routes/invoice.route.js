const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');

// Lấy danh sách hóa đơn
router.get('/', invoiceController.getAllInvoices);

// Lấy chi tiết hóa đơn theo ID
router.get('/:id', invoiceController.getInvoiceById);

// Lấy hóa đơn theo appointment_id
router.get('/appointment/:appointment_id', invoiceController.getInvoiceByAppointment);

// Lấy hóa đơn theo patient_id
router.get('/patient/:patient_id', invoiceController.getInvoicesByPatient);

// Tạo hóa đơn mới
router.post('/', invoiceController.createInvoice);

// Thêm gói khám vào hóa đơn
router.post('/packages/:invoice_id', invoiceController.addPackageToInvoice);

// Lấy danh sách gói khám trong hóa đơn
router.get('/:invoice_id/packages', invoiceController.getInvoicePackages);

//cập nhật thông tin hóa đơn
router.put("/:id", invoiceController.updateInvoice);

// Cập nhật số lượng gói khám trong hóa đơn
router.put('/:invoice_id/packages/:package_id/quantity', invoiceController.updatePackageQuantity);

// Xóa gói khám khỏi hóa đơn
router.delete('/:invoice_id/packages/:package_id', invoiceController.removePackageFromInvoice);

// Thuốc trong hóa đơn
router.post('/:invoice_id/medicines/from-medical-record', invoiceController.addMedicinesFromMedicalRecord);
router.get('/:invoice_id/medicines', invoiceController.getInvoiceMedicines);
router.put('/:invoice_id/medicines/:medicine_id/quantity', invoiceController.updateInvoiceMedicineQuantity);
router.delete('/:invoice_id/medicines/:medicine_id', invoiceController.removeMedicineFromInvoice);

// Cập nhật trạng thái thanh toán hóa đơn
router.put('/:id/status', invoiceController.updateInvoiceStatus);

// Xóa hóa đơn
router.delete('/:id', invoiceController.deleteInvoice);

module.exports = router;
