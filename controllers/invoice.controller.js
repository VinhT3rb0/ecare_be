const Invoice = require('../models/invoice.model');
const InvoicePackages = require('../models/invoice_packages.model');
const InvoiceMedicine = require('../models/invoice_medicine.model');
const Package = require('../models/package.model');
const Appointment = require('../models/appointment.model');
const Patient = require('../models/patient.model');
const Doctor = require("../models/doctor.model");
const Department = require("../models/department.model");
const Medicine = require('../models/medicine.model');
const MedicalRecord = require('../models/medical_record.model');
const MedicalRecordMedication = require('../models/medical_record_medicine.model');
const { Op } = require('sequelize');

// Lấy danh sách hóa đơn
exports.getAllInvoices = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, patient_id } = req.query;
        const offset = (page - 1) * limit;
        const where = {};

        if (status) {
            where.status = status;
        }
        if (patient_id) {
            where.patient_id = patient_id;
        }

        const { count, rows } = await Invoice.findAndCountAll({
            where,
            include: [
                {
                    model: Appointment,
                    attributes: ['id', 'patient_name', 'appointment_date', 'time_slot'],
                    include: [
                        {
                            model: Patient,
                            attributes: ['id', 'full_name', 'phone']
                        }
                    ]
                },
                {
                    model: InvoiceMedicine,
                    as: 'invoiceMedicines',
                    include: [{ model: Medicine }]
                }
            ],
            offset: parseInt(offset),
            limit: parseInt(limit),
            order: [['created_at', 'DESC']]
        });

        res.json({
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            data: rows
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy danh sách hóa đơn', error: err.message });
    }
};

// Lấy chi tiết hóa đơn theo ID
exports.getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const invoice = await Invoice.findByPk(id, {
            include: [
                {
                    model: Appointment,
                    include: [
                        { model: Patient },
                        { model: Doctor },
                        { model: Department },
                    ]
                },
                {
                    model: InvoicePackages,
                    as: 'invoicePackages',
                    include: [
                        {
                            model: Package,
                            as: 'package',
                            attributes: ['id', 'name', 'description', 'discount', 'price', 'image_url']
                        }
                    ]
                },
                {
                    model: InvoiceMedicine,
                    as: 'invoiceMedicines',
                    include: [{ model: Medicine }]
                }
            ]
        });

        if (!invoice) {
            return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
        }

        res.json({ data: invoice });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy chi tiết hóa đơn', error: err.message });
    }
};


// Lấy hóa đơn theo appointment_id
exports.getInvoiceByAppointment = async (req, res) => {
    try {
        const { appointment_id } = req.params;

        const invoice = await Invoice.findOne({
            where: { appointment_id },
            include: [
                {
                    model: Appointment,
                    include: [
                        { model: Patient },
                        { model: Doctor },
                        { model: Department },
                    ]
                },
                {
                    model: InvoicePackages,
                    as: 'invoicePackages',
                    include: [
                        {
                            model: Package,
                            as: 'package',
                            // giữ lại attributes nếu muốn tối ưu
                            attributes: ['id', 'name', 'description', 'discount', 'price']
                        }
                    ]
                },
                {
                    model: InvoiceMedicine,
                    as: 'invoiceMedicines',
                    include: [{ model: Medicine }]
                }
            ]
        });

        if (!invoice) {
            return res.status(404).json({ message: 'Không tìm thấy hóa đơn cho lịch hẹn này' });
        }

        res.json({ data: invoice });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy hóa đơn theo lịch hẹn', error: err.message });
    }
};


// Lấy hóa đơn theo patient_id
exports.getInvoicesByPatient = async (req, res) => {
    try {
        const { patient_id } = req.params;
        const { page = 1, limit = 10, status } = req.query;
        const offset = (page - 1) * limit;
        const where = { patient_id };

        if (status) {
            where.status = status;
        }

        const { count, rows } = await Invoice.findAndCountAll({
            where,
            include: [
                {
                    model: Appointment,
                    include: [
                        { model: Patient },
                        { model: Doctor },
                        { model: Department },
                    ]
                },
                {
                    model: InvoicePackages,
                    as: 'invoicePackages',
                    include: [
                        {
                            model: Package,
                            as: 'package',
                            attributes: ['id', 'name', 'description', 'discount', 'price']
                        }
                    ]
                },
                {
                    model: InvoiceMedicine,
                    as: 'invoiceMedicines',
                    include: [{ model: Medicine }]
                }
            ],
            offset: parseInt(offset),
            limit: parseInt(limit),
            order: [['created_at', 'DESC']]
        });

        res.json({
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            data: rows
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy hóa đơn theo bệnh nhân', error: err.message });
    }
};


// Tạo hóa đơn mới
exports.createInvoice = async (req, res) => {
    try {
        const { appointment_id, patient_id, payment_method } = req.body;

        // Kiểm tra lịch hẹn tồn tại
        const appointment = await Appointment.findByPk(appointment_id);
        if (!appointment) {
            return res.status(404).json({ message: 'Không tìm thấy lịch hẹn' });
        }

        // Kiểm tra hóa đơn đã tồn tại chưa
        const existingInvoice = await Invoice.findOne({ where: { appointment_id } });
        if (existingInvoice) {
            return res.status(400).json({ message: 'Hóa đơn cho lịch hẹn này đã tồn tại' });
        }

        const invoice = await Invoice.create({
            appointment_id,
            patient_id,
            total_amount: 0,
            payment_method: payment_method ?? null,
            status: 'unpaid',
            has_insurance: req.body.has_insurance ?? false,
        });

        res.status(201).json({
            message: 'Tạo hóa đơn thành công',
            data: invoice
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi tạo hóa đơn', error: err.message });
    }
};

// Thêm gói khám vào hóa đơn
exports.addPackageToInvoice = async (req, res) => {
    try {
        const { invoice_id } = req.params;
        const { package_id, quantity } = req.body;

        // Kiểm tra hóa đơn tồn tại
        const invoice = await Invoice.findByPk(invoice_id);
        if (!invoice) {
            return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
        }

        // Kiểm tra gói khám tồn tại
        const packageItem = await Package.findByPk(package_id);
        if (!packageItem) {
            return res.status(404).json({ message: 'Không tìm thấy gói khám' });
        }

        // Kiểm tra gói đã có trong hóa đơn chưa
        const existingItem = await InvoicePackages.findOne({
            where: { invoice_id, package_id }
        });

        if (existingItem) {
            // Cập nhật số lượng
            const newQuantity = existingItem.quantity + quantity;
            const price = packageItem.price;

            await existingItem.update({
                quantity: newQuantity,
                price: price
            });
        } else {
            // Thêm mới
            const price = packageItem.price;

            await InvoicePackages.create({
                invoice_id,
                package_id,
                quantity,
                price: price
            });
        }

        // Cập nhật tổng tiền hóa đơn
        await updateInvoiceTotal(invoice_id);

        res.json({ message: 'Thêm gói khám vào hóa đơn thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi thêm gói khám vào hóa đơn', error: err.message });
    }
};

// Xóa gói khám khỏi hóa đơn
exports.removePackageFromInvoice = async (req, res) => {
    try {
        const { invoice_id, package_id } = req.params;

        const deleted = await InvoicePackages.destroy({
            where: { invoice_id, package_id }
        });

        if (!deleted) {
            return res.status(404).json({ message: 'Không tìm thấy gói khám trong hóa đơn' });
        }

        // Cập nhật tổng tiền hóa đơn
        await updateInvoiceTotal(invoice_id);

        res.json({ message: 'Xóa gói khám khỏi hóa đơn thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xóa gói khám khỏi hóa đơn', error: err.message });
    }
};
//cập nhật thông tin hóa đơn
exports.updateInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const { has_insurance, status, payment_method } = req.body;

        const invoice = await Invoice.findByPk(id);
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Cập nhật field được phép
        if (has_insurance !== undefined) invoice.has_insurance = has_insurance;
        if (status !== undefined) invoice.status = status;
        if (payment_method !== undefined) invoice.payment_method = payment_method;

        await invoice.save();

        return res.json({ message: "Invoice updated successfully", data: invoice });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
// Cập nhật số lượng gói khám trong hóa đơn
exports.updatePackageQuantity = async (req, res) => {
    try {
        const { invoice_id, package_id } = req.params;
        const { quantity } = req.body;

        if (quantity <= 0) {
            return res.status(400).json({ message: 'Số lượng phải lớn hơn 0' });
        }

        const invoicePackage = await InvoicePackages.findOne({
            where: { invoice_id, package_id }
        });

        if (!invoicePackage) {
            return res.status(404).json({ message: 'Không tìm thấy gói khám trong hóa đơn' });
        }

        await invoicePackage.update({ quantity });

        // Cập nhật tổng tiền hóa đơn
        await updateInvoiceTotal(invoice_id);

        res.json({ message: 'Cập nhật số lượng thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật số lượng', error: err.message });
    }
};

// Lấy danh sách gói khám trong hóa đơn
exports.getInvoicePackages = async (req, res) => {
    try {
        const { invoice_id } = req.params;

        const invoicePackages = await InvoicePackages.findAll({
            where: { invoice_id },
            include: [{
                model: Package,
                attributes: ['id', 'name', 'description', 'image_url']
            }],
            order: [['id', 'ASC']]
        });

        res.json({ data: invoicePackages });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy danh sách gói khám trong hóa đơn', error: err.message });
    }
};

// Cập nhật trạng thái thanh toán hóa đơn
exports.updateInvoiceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, payment_method } = req.body;

        const invoice = await Invoice.findByPk(id);
        if (!invoice) {
            return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
        }

        const updateData = { status };
        if (payment_method) {
            updateData.payment_method = payment_method;
        }

        await invoice.update(updateData);

        res.json({
            message: 'Cập nhật trạng thái hóa đơn thành công',
            data: invoice
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật trạng thái hóa đơn', error: err.message });
    }
};

// Xóa hóa đơn
exports.deleteInvoice = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Invoice.destroy({ where: { id } });
        if (!deleted) {
            return res.status(404).json({ message: 'Không tìm thấy hóa đơn để xóa' });
        }

        res.json({ message: 'Xóa hóa đơn thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xóa hóa đơn', error: err.message });
    }
};

// Hàm helper để cập nhật tổng tiền hóa đơn
async function updateInvoiceTotal(invoice_id) {
    const [invoicePackages, invoiceMedicines] = await Promise.all([
        InvoicePackages.findAll({ where: { invoice_id } }),
        InvoiceMedicine.findAll({ where: { invoice_id } })
    ]);

    const packagesAmount = invoicePackages.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const medicinesAmount = invoiceMedicines.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const totalAmount = packagesAmount + medicinesAmount;

    await Invoice.update({ total_amount: totalAmount }, { where: { id: invoice_id } });
}

// ===== Medicines management on invoice =====
// Add all medications from medical record of the appointment to the invoice
exports.addMedicinesFromMedicalRecord = async (req, res) => {
    try {
        const { invoice_id } = req.params;
        const invoice = await Invoice.findByPk(invoice_id, { include: [{ model: Appointment }] });
        if (!invoice) return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });

        const appointment_id = invoice.appointment_id;
        const medicalRecord = await MedicalRecord.findOne({ where: { appointment_id } });
        if (!medicalRecord) return res.status(404).json({ message: 'Không tìm thấy hồ sơ bệnh án' });

        const meds = await MedicalRecordMedication.findAll({ where: { medical_record_id: medicalRecord.id } });
        if (!meds.length) return res.json({ message: 'Không có thuốc trong hồ sơ bệnh án để thêm', added: 0 });

        // Load existing invoice medicines map
        const existing = await InvoiceMedicine.findAll({ where: { invoice_id } });
        const existingMap = new Map(existing.map(e => [e.medicine_id, e]));

        let added = 0;
        for (const m of meds) {
            const medModel = await Medicine.findByPk(m.medicine_id);
            if (!medModel) continue;
            const price = parseFloat(medModel.price);
            const found = existingMap.get(m.medicine_id);
            if (found) {
                await found.update({ quantity: found.quantity + m.quantity, price });
            } else {
                await InvoiceMedicine.create({
                    invoice_id,
                    medicine_id: m.medicine_id,
                    quantity: m.quantity,
                    price,
                    dosage: m.dosage || null,
                    note: m.instructions || null,
                });
            }
            added++;
        }

        await updateInvoiceTotal(invoice_id);
        return res.json({ message: 'Đã thêm thuốc từ hồ sơ bệnh án', added });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi thêm thuốc từ hồ sơ bệnh án', error: err.message });
    }
};

// Get medicines in invoice
exports.getInvoiceMedicines = async (req, res) => {
    try {
        const { invoice_id } = req.params;
        const rows = await InvoiceMedicine.findAll({
            where: { invoice_id },
            include: [{ model: Medicine }],
            order: [['id', 'ASC']]
        });
        return res.json({ data: rows });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi lấy danh sách thuốc trong hóa đơn', error: err.message });
    }
};

// Update quantity of a medicine in invoice
exports.updateInvoiceMedicineQuantity = async (req, res) => {
    try {
        const { invoice_id, medicine_id } = req.params;
        const { quantity } = req.body;
        if (!quantity || quantity <= 0) return res.status(400).json({ message: 'Số lượng phải lớn hơn 0' });
        const row = await InvoiceMedicine.findOne({ where: { invoice_id, medicine_id } });
        if (!row) return res.status(404).json({ message: 'Không tìm thấy thuốc trong hóa đơn' });
        await row.update({ quantity });
        await updateInvoiceTotal(invoice_id);
        return res.json({ message: 'Cập nhật số lượng thuốc thành công' });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi cập nhật số lượng thuốc', error: err.message });
    }
};

// Remove a medicine from invoice
exports.removeMedicineFromInvoice = async (req, res) => {
    try {
        const { invoice_id, medicine_id } = req.params;
        const deleted = await InvoiceMedicine.destroy({ where: { invoice_id, medicine_id } });
        if (!deleted) return res.status(404).json({ message: 'Không tìm thấy thuốc trong hóa đơn' });
        await updateInvoiceTotal(invoice_id);
        return res.json({ message: 'Đã xóa thuốc khỏi hóa đơn' });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi xóa thuốc khỏi hóa đơn', error: err.message });
    }
};
