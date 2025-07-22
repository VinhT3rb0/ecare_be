const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const nodemailer = require('nodemailer');
const Patient = require('../models/patient.model');
const Doctor = require('../models/doctor.model');
const Admin = require('../models/admin.model');


const pendingUsers = {};

exports.sendOtp = async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Thiếu thông tin' });
    if (pendingUsers[email]) return res.status(400).json({ message: 'Vui lòng kiểm tra email để xác thực OTP' });
    try {
        // Tạo OTP 6 số
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Lưu thông tin tạm
        pendingUsers[email] = {
            otp,
            userData: { email, password, role },
            expiresAt: Date.now() + 10 * 60 * 1000 // 10 phút
        };
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Mã xác thực đăng ký Ecare',
            text: `Mã xác thực của bạn là: ${otp}`
        });
        res.json({ message: 'Đã gửi mã xác thực đến email' });
    } catch (err) {
        delete pendingUsers[email];
        res.status(500).json({ message: 'Lỗi gửi OTP', error: err.message });
    }
};

// Hàm xác thực OTP và tạo user
exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    const pending = pendingUsers[email];
    if (!pending) return res.status(400).json({ message: 'Không tìm thấy yêu cầu đăng ký' });
    if (pending.otp !== otp) return res.status(400).json({ message: 'Sai mã xác thực' });
    if (pending.expiresAt < Date.now()) {
        delete pendingUsers[email];
        return res.status(400).json({ message: 'Mã xác thực đã hết hạn' });
    }
    try {
        const hash = await bcrypt.hash(pending.userData.password, 10);
        const user = await User.create({
            email: pending.userData.email,
            password: hash,
            role: pending.userData.role
        });
        // Tạo profile rỗng cho user mới
        if (user.role === 'patient') {
            await Patient.create({ user_id: user.id, full_name: '', dob: new Date(), cccd: '', gender: '', phone: '', address: '', insurance_number: '' });
        } else if (user.role === 'doctor') {
            await Doctor.create({ user_id: user.id, full_name: '', gender: '', phone: '', email: user.email, degree: '', experience_years: 0, is_approved: false });
        } else if (user.role === 'admin') {
            await Admin.create({ user_id: user.id, full_name: '' });
        }
        delete pendingUsers[email];
        res.status(201).json({ message: 'Đăng ký thành công', user });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi đăng ký', error: err.message });
    }
};


exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Sai mật khẩu' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, role: user.role });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi đăng nhập', error: err.message });
    }
};
exports.resendOtp = async (req, res) => {
    const { email } = req.body;
    const pending = pendingUsers[email];
    if (!pending) return res.status(400).json({ message: 'Không tìm thấy yêu cầu đăng ký để gửi lại OTP' });
    try {
        // Tạo OTP mới
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        pending.otp = otp;
        pending.expiresAt = Date.now() + 10 * 60 * 1000;
        // Gửi email
        const transporter = require('nodemailer').createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Mã xác thực đăng ký Ecare (Gửi lại)',
            text: `Mã xác thực mới của bạn là: ${otp}`
        });
        res.json({ message: 'Đã gửi lại mã xác thực đến email' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi gửi lại OTP', error: err.message });
    }
};

// Đổi mật khẩu
exports.changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ message: 'Thiếu thông tin' });
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ message: 'Thiếu token' });
        const token = authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Token không hợp lệ' });
        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Token không hợp lệ hoặc hết hạn' });
        }
        const { id } = payload;
        const user = await User.findOne({ where: { id } });
        if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
        const match = await bcrypt.compare(oldPassword, user.password);
        if (!match) return res.status(401).json({ message: 'Mật khẩu cũ không đúng' });
        const hash = await bcrypt.hash(newPassword, 10);
        user.password = hash;
        await user.save();
        res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi đổi mật khẩu', error: err.message });
    }
};

// Lấy profile theo role
exports.getProfile = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ message: 'Thiếu token' });
        const token = authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Token không hợp lệ' });
        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Token không hợp lệ hoặc hết hạn' });
        }
        const { id: user_id, role } = payload;
        let data;
        if (role === 'patient') {
            data = await Patient.findOne({ where: { user_id } });
        } else if (role === 'doctor') {
            data = await Doctor.findOne({ where: { user_id } });
        } else if (role === 'admin') {
            data = await Admin.findOne({ where: { user_id } });
        } else {
            return res.status(400).json({ message: 'Role không hợp lệ' });
        }
        if (!data) return res.status(404).json({ message: 'Không tìm thấy profile' });
        res.json({ data });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy profile', error: err.message });
    }
};

// Cập nhật profile theo role
exports.updateProfile = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ message: 'Thiếu token' });
        const token = authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Token không hợp lệ' });
        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Token không hợp lệ hoặc hết hạn' });
        }
        const { id: user_id, role } = payload;
        let Model;
        if (role === 'patient') Model = Patient;
        else if (role === 'doctor') Model = Doctor;
        else if (role === 'admin') Model = Admin;
        else return res.status(400).json({ message: 'Role không hợp lệ' });

        // Không cho phép cập nhật user_id
        const updateData = { ...req.body };
        delete updateData.user_id;

        const [affectedRows] = await Model.update(updateData, { where: { user_id } });
        if (affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy profile để cập nhật' });
        const updatedProfile = await Model.findOne({ where: { user_id } });
        res.json(updatedProfile);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật profile', error: err.message });
    }
};
