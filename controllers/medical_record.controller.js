const {
    MedicalRecord,
    MedicalRecordMedication,
    MedicalRecordService,
    Appointment,
    Doctor,
    Department,
    Medicine,
    Package
} = require('../models');
const { Op } = require('sequelize');

// Tạo hồ sơ bệnh án mới
exports.createMedicalRecord = async (req, res) => {
    try {
        const { appointment_id, symptoms, diagnosis, notes, medications = [], services = [] } = req.body;

        // Kiểm tra appointment_id có tồn tại không
        const appointment = await Appointment.findByPk(appointment_id, {
            include: [
                { model: Doctor, attributes: ["id", "full_name"] },
                { model: Department, attributes: ["id", "name"] }
            ]
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch hẹn',
            });
        }

        // Kiểm tra xem đã có hồ sơ bệnh án cho lịch hẹn này chưa
        const existingRecord = await MedicalRecord.findOne({
            where: { appointment_id }
        });

        if (existingRecord) {
            return res.status(400).json({
                success: false,
                message: 'Đã có hồ sơ bệnh án cho lịch hẹn này',
            });
        }

        // Tạo hồ sơ bệnh án
        const medicalRecord = await MedicalRecord.create({
            appointment_id,
            symptoms,
            diagnosis,
            notes,
        });

        // Thêm thuốc vào hồ sơ bệnh án
        if (medications && medications.length > 0) {
            const medicationData = medications.map(med => ({
                medical_record_id: medicalRecord.id,
                medicine_id: med.medicine_id,
                quantity: med.quantity,
                dosage: med.dosage,
                instructions: med.instructions
            }));

            await MedicalRecordMedication.bulkCreate(medicationData);
        }

        // Thêm dịch vụ vào hồ sơ bệnh án
        if (services && services.length > 0) {
            const serviceData = services.map(service => ({
                medical_record_id: medicalRecord.id,
                package_id: service.package_id,
                quantity: service.quantity,
                notes: service.notes
            }));

            await MedicalRecordService.bulkCreate(serviceData);
        }

        // Lấy hồ sơ bệnh án đầy đủ với thuốc và dịch vụ
        const fullRecord = await MedicalRecord.findByPk(medicalRecord.id, {
            include: [
                {
                    model: Appointment,
                    include: [
                        { model: Doctor, attributes: ["id", "full_name", "phone"] },
                        { model: Department, attributes: ["id", "name"] }
                    ]
                },
                {
                    model: MedicalRecordMedication,
                    as: 'medications',
                    include: [
                        { model: Medicine, as: 'medicine', attributes: ["id", "name", "unit", "price"] }
                    ]
                },
                {
                    model: MedicalRecordService,
                    as: 'services',
                    include: [
                        { model: Package, as: 'package', attributes: ["id", "name", "price", "description"] }
                    ]
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Tạo hồ sơ bệnh án thành công',
            data: fullRecord,
        });
    } catch (error) {
        console.error('❌ Error creating medical record:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo hồ sơ bệnh án',
            error: error.message,
        });
    }
};

// Lấy danh sách hồ sơ bệnh án
exports.getMedicalRecords = async (req, res) => {
    try {
        const { doctor_id, patient_id, appointment_id, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let whereCondition = {};
        let appointmentWhere = {};

        if (doctor_id) {
            appointmentWhere.doctor_id = doctor_id;
        }
        if (patient_id) {
            appointmentWhere.patient_id = patient_id;
        }
        if (appointment_id) {
            whereCondition.appointment_id = appointment_id;
        }

        const { count, rows } = await MedicalRecord.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: Appointment,
                    where: appointmentWhere,
                    include: [
                        { model: Doctor, attributes: ["id", "full_name", "phone"] },
                        { model: Department, attributes: ["id", "name"] }
                    ]
                },
                {
                    model: MedicalRecordMedication,
                    as: 'medications',
                    include: [
                        { model: Medicine, as: 'medicine', attributes: ["id", "name", "unit", "price"] }
                    ]
                },
                {
                    model: MedicalRecordService,
                    as: 'services',
                    include: [
                        { model: Package, as: 'package', attributes: ["id", "name", "price", "description"] }
                    ]
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

        res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ Error fetching medical records:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách hồ sơ bệnh án',
            error: error.message,
        });
    }
};

// Lấy chi tiết hồ sơ bệnh án
exports.getMedicalRecordById = async (req, res) => {
    try {
        const { id } = req.params;

        const medicalRecord = await MedicalRecord.findByPk(id, {
            include: [
                {
                    model: Appointment,
                    include: [
                        { model: Doctor, attributes: ["id", "full_name", "phone", "email"] },
                        { model: Department, attributes: ["id", "name"] }
                    ]
                },
                {
                    model: MedicalRecordMedication,
                    as: 'medications',
                    include: [
                        { model: Medicine, as: 'medicine', attributes: ["id", "name", "unit", "price", "description"] }
                    ]
                },
                {
                    model: MedicalRecordService,
                    as: 'services',
                    include: [
                        { model: Package, as: 'package', attributes: ["id", "name", "price", "description"] }
                    ]
                }
            ]
        });

        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hồ sơ bệnh án',
            });
        }

        res.status(200).json({
            success: true,
            data: medicalRecord,
        });
    } catch (error) {
        console.error('❌ Error fetching medical record:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy hồ sơ bệnh án',
            error: error.message,
        });
    }
};

// Cập nhật hồ sơ bệnh án
exports.updateMedicalRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { symptoms, diagnosis, notes, medications = [], services = [] } = req.body;

        const medicalRecord = await MedicalRecord.findByPk(id);
        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hồ sơ bệnh án',
            });
        }

        // Cập nhật thông tin cơ bản
        await medicalRecord.update({
            symptoms,
            diagnosis,
            notes,
        });

        // Xóa thuốc cũ và thêm thuốc mới
        await MedicalRecordMedication.destroy({
            where: { medical_record_id: id }
        });

        if (medications && medications.length > 0) {
            const medicationData = medications.map(med => ({
                medical_record_id: id,
                medicine_id: med.medicine_id,
                quantity: med.quantity,
                dosage: med.dosage,
                instructions: med.instructions
            }));

            await MedicalRecordMedication.bulkCreate(medicationData);
        }

        // Xóa dịch vụ cũ và thêm dịch vụ mới
        await MedicalRecordService.destroy({
            where: { medical_record_id: id }
        });

        if (services && services.length > 0) {
            const serviceData = services.map(service => ({
                medical_record_id: id,
                package_id: service.package_id,
                quantity: service.quantity,
                notes: service.notes
            }));

            await MedicalRecordService.bulkCreate(serviceData);
        }

        // Lấy hồ sơ bệnh án đầy đủ sau khi cập nhật
        const updatedRecord = await MedicalRecord.findByPk(id, {
            include: [
                {
                    model: Appointment,
                    include: [
                        { model: Doctor, attributes: ["id", "full_name", "phone"] },
                        { model: Department, attributes: ["id", "name"] }
                    ]
                },
                {
                    model: MedicalRecordMedication,
                    as: 'medications',
                    include: [
                        { model: Medicine, as: 'medicine', attributes: ["id", "name", "unit", "price"] }
                    ]
                },
                {
                    model: MedicalRecordService,
                    as: 'services',
                    include: [
                        { model: Package, as: 'package', attributes: ["id", "name", "price", "description"] }
                    ]
                }
            ]
        });

        res.status(200).json({
            success: true,
            message: 'Cập nhật hồ sơ bệnh án thành công',
            data: updatedRecord,
        });
    } catch (error) {
        console.error('❌ Error updating medical record:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật hồ sơ bệnh án',
            error: error.message,
        });
    }
};

// Xóa hồ sơ bệnh án
exports.deleteMedicalRecord = async (req, res) => {
    try {
        const { id } = req.params;

        const medicalRecord = await MedicalRecord.findByPk(id);
        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hồ sơ bệnh án',
            });
        }

        // Xóa thuốc và dịch vụ liên quan
        await MedicalRecordMedication.destroy({
            where: { medical_record_id: id }
        });

        await MedicalRecordService.destroy({
            where: { medical_record_id: id }
        });

        // Xóa hồ sơ bệnh án
        await medicalRecord.destroy();

        res.status(200).json({
            success: true,
            message: 'Xóa hồ sơ bệnh án thành công',
        });
    } catch (error) {
        console.error('❌ Error deleting medical record:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa hồ sơ bệnh án',
            error: error.message,
        });
    }
};

// Lấy hồ sơ bệnh án theo bác sĩ
exports.getMedicalRecordsByDoctor = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { count, rows } = await MedicalRecord.findAndCountAll({
            include: [
                {
                    model: Appointment,
                    where: { doctor_id },
                    include: [
                        { model: Doctor, attributes: ["id", "full_name", "phone"] },
                        { model: Department, attributes: ["id", "name"] }
                    ]
                },
                {
                    model: MedicalRecordMedication,
                    include: [
                        { model: Medicine, attributes: ["id", "name", "unit", "price"] }
                    ]
                },
                {
                    model: MedicalRecordService,
                    include: [
                        { model: Package, attributes: ["id", "name", "price", "description"] }
                    ]
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

        res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ Error fetching medical records by doctor:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy hồ sơ bệnh án theo bác sĩ',
            error: error.message,
        });
    }
};

// Lấy hồ sơ bệnh án theo bệnh nhân
exports.getMedicalRecordsByPatient = async (req, res) => {
    try {
        const { patient_id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { count, rows } = await MedicalRecord.findAndCountAll({
            include: [
                {
                    model: Appointment,
                    where: { patient_id },
                    include: [
                        { model: Doctor, attributes: ["id", "full_name", "phone"] },
                        { model: Department, attributes: ["id", "name"] }
                    ]
                },
                {
                    model: MedicalRecordMedication,
                    include: [
                        { model: Medicine, attributes: ["id", "name", "unit", "price"] }
                    ]
                },
                {
                    model: MedicalRecordService,
                    include: [
                        { model: Package, attributes: ["id", "name", "price", "description"] }
                    ]
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

        res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ Error fetching medical records by patient:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy hồ sơ bệnh án theo bệnh nhân',
            error: error.message,
        });
    }
};
