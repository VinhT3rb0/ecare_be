const { Review, Doctor, Patient } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

// helper parseRange
function parseRange(query) {
    const { from, to } = query;
    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to) : new Date();
    return { start, end };
}
exports.getReviews = async (req, res) => {
    try {
        const where = {};
        if (req.query.doctor_id) where.doctor_id = req.query.doctor_id;
        if (req.query.patient_id) where.patient_id = req.query.patient_id;

        const reviews = await Review.findAll({
            where,
            include: [
                { model: Patient, attributes: ['id', 'full_name'] },
                { model: Doctor, attributes: ['id', 'full_name'] },
            ],
            order: [['created_at', 'DESC']]
        });

        return res.json({ data: reviews });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi lấy danh sách review', error: err.message });
    }
};
exports.getReviewsByDoctorId = async (req, res) => {
    try {
        const { doctor_id } = req.params; // lấy từ URL /reviews/doctor/:doctor_id
        if (!doctor_id) {
            return res.status(400).json({ message: 'Thiếu doctor_id' });
        }

        const reviews = await Review.findAll({
            where: { doctor_id },
            include: [
                { model: Patient, attributes: ['id', 'full_name'] },
                { model: Doctor, attributes: ['id', 'full_name'] },
            ],
            order: [['created_at', 'DESC']],
        });

        return res.json({ data: reviews });
    } catch (err) {
        return res.status(500).json({
            message: 'Lỗi lấy danh sách review theo doctor_id',
            error: err.message,
        });
    }
};
// ✅ POST /reviews
exports.createReview = async (req, res) => {
    try {
        // Lấy patient_id từ token (middleware auth) thay vì body
        const patient_id = req.user ? req.user.id : req.body.patient_id;
        const { doctor_id, rating, comment } = req.body;

        if (!patient_id || !doctor_id || !rating) {
            return res.status(400).json({ message: 'Thiếu dữ liệu bắt buộc.' });
        }

        // kiểm tra có review nào của bệnh nhân này cho bác sĩ này trong 24h không
        const recentReview = await Review.findOne({
            where: {
                patient_id,
                doctor_id,
                created_at: {
                    [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // trong 24 giờ
                }
            }
        });

        if (recentReview) {
            return res.status(429).json({
                message: 'Bạn đã đánh giá bác sĩ này gần đây. Vui lòng thử lại sau 24 giờ.'
            });
        }

        const review = await Review.create({
            patient_id,
            doctor_id,
            rating,
            comment: comment?.trim()
        });

        return res.status(201).json({ message: 'Tạo review thành công', data: review });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi tạo review', error: err.message });
    }
};

// ✅ GET /reviews/average?doctor_id
exports.getDoctorAverageRating = async (req, res) => {
    try {
        const { doctor_id } = req.query;
        if (!doctor_id) return res.status(400).json({ message: 'Thiếu doctor_id' });

        const row = await Review.findOne({
            attributes: [[fn('AVG', col('rating')), 'avg_rating'], [fn('COUNT', col('Review.id')), 'count']],
            where: { doctor_id },
            raw: true,
        });

        return res.json({
            data: {
                doctor_id,
                avg_rating: parseFloat(row.avg_rating || 0).toFixed(2),
                total_reviews: parseInt(row.count, 10)
            }
        });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi tính trung bình rating', error: err.message });
    }
};

exports.getReviewTrends = async (req, res) => {
    try {
        const { start, end } = parseRange(req.query);
        const granularity = (req.query.granularity || 'day').toString();
        const dateExpr = granularity === 'month' ? "DATE_FORMAT(created_at, '%Y-%m')" : "DATE(created_at)";

        const rows = await Review.findAll({
            attributes: [
                [literal(dateExpr), 'time'],
                [fn('COUNT', col('Review.id')), 'value']
            ],
            where: { created_at: { [Op.between]: [start, end] } },
            group: [literal(dateExpr)],
            order: [[literal('time'), 'ASC']],
            raw: true
        });

        return res.json({
            data: rows.map(r => ({ time: r.time, value: parseInt(r.value, 10) }))
        });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi lấy xu hướng review', error: err.message });
    }
};

exports.getTopDoctorsByRating = async (req, res) => {
    try {
        const { start, end } = parseRange(req.query);
        const limit = parseInt(req.query.limit || '5', 10);

        const rows = await Review.findAll({
            attributes: [
                'doctor_id',
                [fn('AVG', col('rating')), 'avg_rating'],
                [fn('COUNT', col('Review.id')), 'total_reviews']
            ],
            include: [{ model: Doctor, attributes: ['id', 'full_name', 'avatar_img'] }],
            where: { created_at: { [Op.between]: [start, end] } },
            group: ['doctor_id', 'Doctor.id', 'Doctor.full_name'],
            order: [[literal('avg_rating'), 'DESC']],
            limit,
            raw: true,
            nest: true,
        });

        return res.json({
            data: rows.map(r => ({
                doctor_id: r.doctor_id,
                doctor_name: r.Doctor?.full_name,
                doctor_avatar: r.Doctor?.avatar_img,
                avg_rating: parseFloat(r.avg_rating).toFixed(2),
                total_reviews: parseInt(r.total_reviews, 10)
            }))
        });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi lấy top bác sĩ theo rating', error: err.message });
    }
};
