const Doctor = require('../models/doctor.model');
const User = require('../models/user.model');

// Lấy thông tin hồ sơ bác sĩ theo user_id
exports.getDoctorProfile = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ where: { user_id: req.params.user_id } });
        if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
        res.json(doctor);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Cập nhật thông tin hồ sơ bác sĩ
exports.updateDoctorProfile = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ where: { user_id: req.params.user_id } });
        if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

        await doctor.update(req.body);
        res.json(doctor);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Tạo tài khoản bác sĩ mới
exports.createDoctorAccount = async (req, res) => {
    try {
        // Tạo user trước
        const user = await User.create({
            email: req.body.email,
            password: req.body.password, // Nên mã hóa ở middleware hoặc trước khi lưu
            role: 'doctor',
            is_verified: false
        });

        // Tạo hồ sơ bác sĩ
        const doctor = await Doctor.create({
            user_id: user.id,
            full_name: req.body.full_name,
            gender: req.body.gender,
            phone: req.body.phone,
            email: req.body.email,
            degree: req.body.degree,
            experience_years: req.body.experience_years,
            is_approved: false,
            degree_image_url: req.body.degree_image_url || null
        });

        res.status(201).json({ user, doctor });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};