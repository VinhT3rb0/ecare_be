const Degree = require('../models/degree.model');
const PendingDegree = require('../models/pending_degree.model');

// Lấy danh sách bằng cấp của bác sĩ hiện tại
exports.getMyDegrees = async (req, res) => {
    console.log(req.params);

    try {
        const degrees = await Degree.findAll({ where: { doctor_id: req.params.doctor_id } });
        res.json(degrees);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy danh sách bằng cấp', error: err.message });
    }
};

// Thêm bằng cấp mới
exports.createDegree = async (req, res) => {
    try {
        const data = { ...req.body, doctor_id: req.userId };
        const degree = await Degree.create(data);
        res.status(201).json(degree);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi tạo bằng cấp', error: err.message });
    }
};

// Sửa bằng cấp
exports.updateDegree = async (req, res) => {
    try {
        const { id } = req.params;
        const degree = await Degree.findOne({ where: { id, doctor_id: req.userId } });
        if (!degree) return res.status(404).json({ message: 'Không tìm thấy bằng cấp' });
        await degree.update(req.body);
        res.json(degree);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật bằng cấp', error: err.message });
    }
};

// Xóa bằng cấp
exports.deleteDegree = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Degree.destroy({ where: { id, doctor_id: req.userId } });
        if (!deleted) return res.status(404).json({ message: 'Không tìm thấy bằng cấp để xóa' });
        res.json({ message: 'Đã xóa bằng cấp thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xóa bằng cấp', error: err.message });
    }
};
exports.createPendingDegree = async (req, res) => {
    try {
        const { doctor_id, full_name, date_of_birth, cccd, issue_date, issue_place, specialization, practice_scope } = req.body;
        const proof_image_url = req.file ? req.file.path : req.body.degree_proof_image || null;
        const existing = await PendingDegree.findOne({ where: { doctor_id } });

        let pendingDegree;

        if (existing) {
            await existing.update({
                full_name,
                date_of_birth,
                cccd,
                issue_date,
                issue_place,
                specialization,
                practice_scope,
                proof_image_url,
            });
            pendingDegree = existing;
        } else {
            pendingDegree = await PendingDegree.create({
                doctor_id,
                full_name,
                date_of_birth,
                cccd,
                issue_date,
                issue_place,
                specialization,
                practice_scope,
                proof_image_url,
            });
        }

        res.status(201).json(pendingDegree);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi tạo bằng cấp', error: err.message });
    }
};

exports.getPendingDegrees = async (req, res) => {
    const { doctor_id } = req.params;
    if (!doctor_id) return res.status(400).json({ message: 'Thiếu thông tin bác sĩ' });
    try {
        const pendingDegrees = await PendingDegree.findAll({ where: { doctor_id } });
        res.json(pendingDegrees);

    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy danh sách bằng cấp đang chờ', error: err.message });

    }
}