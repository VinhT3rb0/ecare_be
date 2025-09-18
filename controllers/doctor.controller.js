const { Department } = require('../models');
const Degree = require('../models/degree.model');
const Doctor = require('../models/doctor.model');
const PendingDegree = require('../models/pending_degree.model');
const User = require('../models/user.model');
const DoctorSchedule = require('../models/doctor_schedule.model');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
// Lấy profile bác sĩ
exports.getProfile = async (req, res) => {
    const { id } = req.params;
    try {
        const doctor = await Doctor.findOne({
            where: { user_id: id },
            include: [
                {
                    model: Degree,
                },
                {
                    model: Department,
                    as: 'departments',
                    through: { attributes: [] }
                }
            ],
        });

        if (!doctor) {
            return res.status(404).json({ message: "Không tìm thấy hồ sơ bác sĩ" });
        }

        res.json(doctor);
    } catch (err) {
        res.status(500).json({
            message: "Lỗi lấy profile",
            error: err.message,
        });
    }
};

// Cập nhật profile bác sĩ
exports.updateProfile = async (req, res) => {
    try {
        const { user_id } = req.params;
        const {
            full_name,
            email,
            gender,
            phone,
            experience_years,
            education_level,
            education_history,
            specialty // mảng id departments gửi từ FE
        } = req.body;

        const avatar_img = req.file ? req.file.path : req.body.avatar_img || null;

        const doctor = await Doctor.findOne({ where: { user_id } });
        if (!doctor) {
            return res.status(404).json({ message: "Không tìm thấy hồ sơ bác sĩ để cập nhật" });
        }
        await doctor.update({
            full_name,
            email,
            gender,
            phone,
            experience_years,
            avatar_img,
            education_level,
            education_history
        });

        if (specialty && Array.isArray(specialty)) {
            await doctor.setDepartments(specialty);
        }
        const updatedDoctor = await Doctor.findOne({
            where: { user_id },
            include: [{ model: Department, as: "departments" }]
        });

        res.json(updatedDoctor);
    } catch (err) {
        console.error("Error in updateProfile:", err);
        res.status(500).json({ message: "Lỗi cập nhật profile", error: err.message });
    }
};

// Tạo tài khoản bác sĩ
exports.createDoctorAccount = async (req, res) => {
    try {
        const hash = await bcrypt.hash(req.body.password, 10);
        const user = await User.create({
            email: req.body.email,
            password: hash,
            role: 'doctor'
        });

        const doctor = await Doctor.create({
            user_id: user.id,
            full_name: req.body.full_name,
            email: req.body.email,
            is_approved: false,
        });

        res.status(201).json({ user, doctor });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
// Phê duyệt bác sĩ
exports.approveDoctor = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        if (!doctor_id) {
            return res.status(400).json({ message: "Thiếu doctor_id" });
        }
        const doctor = await Doctor.findOne({ where: { id: doctor_id } });
        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy hồ sơ bác sĩ' });
        const pendingDegree = await PendingDegree.findOne({ where: { doctor_id } });
        if (!pendingDegree) {
            return res.status(404).json({ message: 'Không tìm thấy bằng cấp đang chờ' });
        }
        const proof_image_url = req.file ? req.file.path : pendingDegree.proof_image_url;
        const newDegree = await Degree.create({
            doctor_id,
            full_name: pendingDegree.full_name,
            date_of_birth: pendingDegree.date_of_birth,
            cccd: pendingDegree.cccd,
            issue_date: pendingDegree.issue_date,
            issue_place: pendingDegree.issue_place,
            specialization: pendingDegree.specialization,
            practice_scope: pendingDegree.practice_scope,
            proof_image_url,
        });
        await doctor.update({ is_approved: true });
        await pendingDegree.destroy();
        res.json({ message: 'Phê duyệt bác sĩ thành công', doctor, degree: newDegree });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi phê duyệt bác sĩ', error: err.message });
    }
};
// Lấy danh sách bác sĩ với phân trang và lọc
exports.getDoctorList = async (req, res) => {
    try {
        const { name, page = 1, pageSize = 10 } = req.query;
        const where = {};

        if (name) where.full_name = { [Op.like]: `%${name}%` };

        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        const limit = parseInt(pageSize);

        const include = [
            {
                model: Degree,
                required: false
            },
            {
                model: Department,
                as: 'departments', // Alias trùng với quan hệ
                through: { attributes: {} },
                required: false
            }
        ];

        const { count, rows } = await Doctor.findAndCountAll({
            where,
            offset,
            limit,
            include,
            order: [['full_name', 'ASC']]
        });
        const doctorList = await Promise.all(rows.map(async (doctor) => {
            const doctorData = doctor.toJSON();

            if (!doctorData.is_approved) {
                const pendingDegree = await PendingDegree.findOne({
                    where: { doctor_id: doctor.id }
                });
                doctorData.pending_degree = pendingDegree;
            }
            return doctorData;
        }));

        res.json({
            total: count,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            doctors: doctorList
        });

    } catch (err) {
        console.error('Error in getDoctorList:', err);
        res.status(500).json({ message: 'Lỗi lấy danh sách bác sĩ', error: err.message });
    }
};
// Cập nhật thông tin bác sĩ và bằng cấp
exports.updateDoctorAndDegree = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        if (!doctor_id) {
            return res.status(400).json({ message: "Thiếu doctor_id" });
        }

        // Tìm Doctor
        const doctor = await Doctor.findOne({ where: { id: doctor_id } });
        if (!doctor) {
            return res.status(404).json({ message: 'Không tìm thấy hồ sơ bác sĩ' });
        }

        // Tìm Degree (đã tồn tại vì bác sĩ đã được phê duyệt)
        const degree = await Degree.findOne({ where: { doctor_id } });
        if (!degree) {
            return res.status(404).json({ message: 'Không tìm thấy bằng cấp của bác sĩ' });
        }

        // Lấy dữ liệu từ body
        const {
            full_name,
            email,
            gender,
            phone,
            experience_years,
            specialization,
            practice_scope,
            date_of_birth,
            cccd,
            issue_date,
            issue_place
        } = req.body;

        // File ảnh mới (nếu có)
        const avatar_img = req.files?.avatar_img
            ? req.files.avatar_img[0].path
            : req.body.avatar_img || doctor.avatar_img;

        const proof_image_url = req.files?.proof_image_url
            ? req.files.proof_image_url[0].path
            : req.body.proof_image_url || degree.proof_image_url;

        // Cập nhật Doctor
        await doctor.update({
            full_name,
            email,
            gender,
            phone,
            experience_years,
            avatar_img
        });

        // Cập nhật Degree
        await degree.update({
            full_name,
            date_of_birth,
            cccd,
            issue_date,
            issue_place,
            specialization,
            practice_scope,
            proof_image_url
        });

        // Lấy lại thông tin đã cập nhật
        const updatedDoctor = await Doctor.findOne({
            where: { id: doctor_id },
            include: [{ model: Degree }]
        });

        res.json({
            message: 'Cập nhật thông tin bác sĩ và bằng cấp thành công',
            doctor: updatedDoctor
        });

    } catch (err) {
        res.status(500).json({
            message: 'Lỗi cập nhật thông tin bác sĩ và bằng cấp',
            error: err.message
        });
    }
};
// Lấy danh sách bác sĩ đã được phê duyệt
exports.getApprovedDoctors = async (req, res) => {
    try {
        const { name, page = 1, pageSize = 10 } = req.query;

        const where = { is_approved: true }; // chỉ lấy bác sĩ đã duyệt
        if (name) where.full_name = { [Op.like]: `%${name}%` };

        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        const limit = parseInt(pageSize);

        const include = [
            {
                model: Degree,
                required: false
            },
            {
                model: Department,
                as: 'departments', // Alias phải trùng với quan hệ đã định nghĩa
                through: { attributes: {} },
                required: false
            }
        ];

        const { count, rows } = await Doctor.findAndCountAll({
            where,
            offset,
            limit,
            include,
            order: [['full_name', 'ASC']]
        });

        const doctorList = rows.map((doctor) => doctor.toJSON());

        res.json({
            total: count,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            doctors: doctorList
        });

    } catch (err) {
        console.error('Error in getApprovedDoctors:', err);
        res.status(500).json({
            message: 'Lỗi khi lấy danh sách bác sĩ đã được phê duyệt',
            error: err.message
        });
    }
};
// Lấy danh sách bác sĩ theo chuyên khoa
exports.getDoctorsByDepartment = async (req, res) => {
    try {
        const { department_id } = req.params;

        if (!department_id) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp department_id',
            });
        }

        // Tìm department và lấy danh sách bác sĩ
        const department = await Department.findByPk(department_id);

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy chuyên khoa',
            });
        }

        // Lấy danh sách bác sĩ thuộc department này + đầy đủ thông tin
        const doctors = await Doctor.findAll({
            include: [
                {
                    model: Degree,
                    required: false
                },
                {
                    model: Department,
                    as: "departments",
                    through: { attributes: [] },
                    required: false
                }
            ],
            where: {
                is_approved: true // chỉ lấy bác sĩ đã duyệt
            },
            order: [["full_name", "ASC"]]
        });

        // Lọc lại chỉ những bác sĩ thuộc department_id
        const filteredDoctors = doctors.filter((doc) =>
            doc.departments.some((d) => d.id === parseInt(department_id))
        );

        res.status(200).json({
            success: true,
            department: department.name,
            total: filteredDoctors.length,
            doctors: filteredDoctors,
        });
    } catch (error) {
        console.error("❌ Error fetching doctors by department:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách bác sĩ",
            error: error.message,
        });
    }
};

// Lấy danh sách bác sĩ theo ngày và chuyên khoa
exports.getDoctorsByDateAndDepartment = async (req, res) => {
    try {
        const { date, department_id } = req.query;
        if (!date || !department_id) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp date và department_id',
            });
        }
        const department = await Department.findByPk(department_id, {
            include: [
                {
                    model: Doctor,
                    as: 'doctors',
                    through: { attributes: [] },
                    attributes: ['id', 'full_name', 'email', 'phone'],
                },
            ],
        });

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy chuyên khoa',
            });
        }
        const doctors = await Promise.all(
            department.doctors.map(async (doctor) => {
                const schedule = await DoctorSchedule.findOne({
                    where: {
                        doctor_id: doctor.id,
                        date,
                    },
                });

                if (schedule) {
                    return doctor;
                }
                return null;
            })
        );
        const filteredDoctors = doctors.filter((doctor) => doctor !== null);

        res.status(200).json({
            success: true,
            data: filteredDoctors,
        });
    } catch (error) {
        console.error('❌ Error fetching doctors by date and department:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách bác sĩ',
            error: error.message,
        });
    }
};