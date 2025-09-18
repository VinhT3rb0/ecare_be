const { Doctor } = require('../models');
const Department = require('../models/department.model');
const DoctorDepartment = require('../models/doctor_department.model');
const { Op, fn, col } = require('sequelize');

exports.getAllDepartments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const name = req.query.name || '';

        const departments = await Department.findAll({
            where: name ? { name: { [Op.like]: `%${name}%` } } : {},
            attributes: {
                include: [
                    [fn('COUNT', col('doctors.id')), 'doctor_count'] // dùng alias doctors
                ]
            },
            include: [
                {
                    model: Doctor,
                    as: 'doctors', // alias trùng với quan hệ
                    attributes: [],
                    through: { attributes: [] }
                }
            ],
            group: ['Department.id'],
            limit,
            offset,
            subQuery: false
        });

        const total = await Department.count({
            where: name ? { name: { [Op.like]: `%${name}%` } } : {}
        });

        res.json({
            total,
            page,
            pageSize: limit,
            departments
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Thêm chuyên khoa mới
exports.createDepartment = async (req, res) => {
    try {
        const { name, description } = req.body;
        const department = await Department.create({ name, description });
        res.status(201).json(department);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi tạo chuyên khoa', error: err.message });
    }
};

// Sửa thông tin chuyên khoa
exports.updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const [affectedRows] = await Department.update({ name, description }, { where: { id } });
        if (affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy chuyên khoa để cập nhật' });
        const updatedDepartment = await Department.findByPk(id);
        res.json(updatedDepartment);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật chuyên khoa', error: err.message });
    }
};

// Xóa chuyên khoa
exports.deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Department.destroy({ where: { id } });
        if (!deleted) return res.status(404).json({ message: 'Không tìm thấy chuyên khoa để xóa' });
        res.json({ message: 'Đã xóa chuyên khoa thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xóa chuyên khoa', error: err.message });
    }
};


// Lấy danh sách chuyên khoa của bác sĩ hiện tại
exports.getMyDepartments = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const doctor = await Doctor.findByPk(doctor_id, {
            include: [{
                model: Department,
                as: 'departments',
                through: { attributes: [] }, // ẩn bảng trung gian
                attributes: ['id', 'name', 'description']
            }]
        });

        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy bác sĩ' });

        res.json(doctor.departments);
    } catch (err) {
        console.log('Error in getMyDepartments:', err);
        res.status(500).json({ message: 'Lỗi lấy chuyên khoa', error: err.message });
    }
};


// Thêm chuyên khoa cho bác sĩ (có thể truyền mảng department_id)
exports.addDepartments = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        let { department_ids } = req.body;
        const doctor = await Doctor.findByPk(doctor_id);
        if (!doctor) {
            return res.status(404).json({ message: "Bác sĩ không tồn tại" });
        }

        if (!Array.isArray(department_ids)) {
            department_ids = [department_ids];
        }

        const bulk = department_ids.map((department_id) => ({
            doctor_id,
            department_id,
        }));
        for (const item of bulk) {
            await DoctorDepartment.findOrCreate({ where: item });
        }

        res.json({ message: "Đã thêm chuyên khoa cho bác sĩ" });
    } catch (err) {
        console.error("Error in addDepartments:", err);
        res.status(500).json({ message: "Lỗi thêm chuyên khoa", error: err.message });
    }
};
exports.removeDepartment = async (req, res) => {
    try {
        const { doctor_id, department_id } = req.params;
        const deleted = await DoctorDepartment.destroy({ where: { doctor_id, department_id } });
        if (!deleted) return res.status(404).json({ message: 'Không tìm thấy chuyên khoa để xóa' });
        res.json({ message: 'Đã xóa chuyên khoa khỏi bác sĩ' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xóa chuyên khoa', error: err.message });
    }
};
