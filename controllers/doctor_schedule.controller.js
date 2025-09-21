const DoctorSchedule = require('../models/doctor_schedule.model');
const Room = require('../models/room.model');
const Doctor = require('../models/doctor.model');
const { Op } = require('sequelize');


const combineDateTime = (dateStr, timeStr) => {
    // dateStr 'YYYY-MM-DD', timeStr 'HH:mm:ss' -> tạo Date local
    return new Date(`${dateStr}T${timeStr}`);
};

// Kiểm tra xung đột theo khung giờ: cùng ngày và trùng giờ với cùng bác sĩ hoặc cùng phòng
const checkScheduleConflict = async (doctor_id, date, room_id, start_time, end_time, excludeId = null) => {
    const whereClause = {
        date,
        [Op.and]: [
            {
                [Op.or]: [
                    { doctor_id },
                    { room_id }
                ]
            },
            // Overlap condition: existing.start < newEnd AND existing.end > newStart
            {
                start_time: { [Op.lt]: end_time || '23:59:59' },
            },
            {
                end_time: { [Op.gt]: start_time || '00:00:00' },
            }
        ]
    };

    if (excludeId) {
        whereClause.id = { [Op.ne]: excludeId };
    }

    const conflict = await DoctorSchedule.findOne({ where: whereClause });
    return conflict;
};
// Lấy tất cả lịch làm việc của bác sĩ hiện tại
exports.getMySchedules = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const doctorId = req.params.doctor_id || req.query.doctor_id || req.doctor_id;
        if (!doctorId) {
            return res.status(400).json({ success: false, message: 'Thiếu doctor_id' });
        }

        const whereClause = { doctor_id: doctorId };

        if (start_date && end_date) {
            whereClause.date = { [Op.between]: [start_date, end_date] };
        } else if (start_date) {
            whereClause.date = start_date;
        }

        const schedules = await DoctorSchedule.findAll({
            where: whereClause,
            include: [
                { model: Room, attributes: ['id', 'name', 'status'] }
            ],
            order: [['date', 'ASC'], ['start_time', 'ASC']]
        });

        res.json({ success: true, data: schedules, count: schedules.length });
    } catch (err) {
        console.error('❌ Error getMySchedules:', err);
        res.status(500).json({ success: false, message: 'Lỗi lấy lịch làm việc', error: err.message });
    }
};
exports.getDoctorSchedules = async (req, res) => {
    try {
        const { start_date, end_date, doctor_name } = req.query;

        const whereClause = {};
        const doctorWhere = {};

        if (start_date && end_date) {
            whereClause.date = { [Op.between]: [start_date, end_date] };
        } else if (start_date) {
            whereClause.date = start_date;
        }

        if (doctor_name) {
            doctorWhere.full_name = { [Op.like]: `%${doctor_name}%` };
        }

        const schedules = await DoctorSchedule.findAll({
            where: whereClause,
            include: [
                { model: Room, attributes: ['id', 'name', 'status'] },
                { model: Doctor, attributes: ['id', 'user_id', 'full_name'], where: doctorWhere, required: Object.keys(doctorWhere).length > 0 }
            ],
            order: [['date', 'DESC'], ['start_time', 'ASC']]
        });

        res.json({ success: true, data: schedules, count: schedules.length });
    } catch (err) {
        console.error('❌ Error getDoctorSchedules:', err);
        res.status(500).json({ success: false, message: 'Lỗi lấy lịch làm việc', error: err.message });
    }
};

exports.createSchedule = async (req, res) => {
    try {
        const { doctor_id, date, room_id, start_time, end_time, max_patients, notes } = req.body;

        if (!doctor_id || !date || !room_id) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc: doctor_id, date, room_id' });
        }

        // Không tạo lịch cho ngày đã qua
        if (new Date(date) < new Date().setHours(0, 0, 0, 0)) {
            return res.status(400).json({ success: false, message: 'Không thể tạo lịch cho ngày trong quá khứ' });
        }

        // Check conflict - cùng ngày bác sĩ hoặc phòng đã có lịch
        const conflict = await checkScheduleConflict(doctor_id, date, room_id, start_time || '08:00:00', end_time || '16:30:00');
        if (conflict) {
            return res.status(409).json({ success: false, message: 'Xung đột lịch làm việc: bác sĩ hoặc phòng đã có lịch trong ngày' });
        }

        const schedule = await DoctorSchedule.create({
            doctor_id,
            date,
            room_id,
            start_time: start_time || '08:00:00',
            end_time: end_time || '16:30:00',
            max_patients: max_patients || null,
            notes: notes || null,
            status: 'scheduled'
        });

        const created = await DoctorSchedule.findOne({
            where: { id: schedule.id },
            include: [
                { model: Room, attributes: ['id', 'name', 'status'] },
                { model: Doctor, attributes: ['id', 'user_id', 'full_name'] }
            ]
        });

        res.status(201).json({ success: true, message: 'Tạo lịch thành công', data: created });
    } catch (err) {
        console.error('❌ Error createSchedule:', err);
        res.status(500).json({ success: false, message: 'Lỗi tạo lịch', error: err.message });
    }
};
exports.createBulkSchedules = async (req, res) => {
    try {
        const { schedules } = req.body;
        if (!Array.isArray(schedules) || schedules.length === 0) {
            return res.status(400).json({ success: false, message: 'Danh sách lịch không hợp lệ' });
        }

        const created = [];
        const errors = [];

        for (let i = 0; i < schedules.length; i++) {
            const s = schedules[i];
            try {
                const { doctor_id, date, room_id, start_time, end_time, max_patients, notes } = s;
                if (!doctor_id || !date || !room_id) {
                    errors.push({ index: i, message: 'Thiếu doctor_id/date/room_id' });
                    continue;
                }
                if (new Date(date) < new Date().setHours(0, 0, 0, 0)) {
                    errors.push({ index: i, message: 'Ngày trong quá khứ' });
                    continue;
                }
                const conflict = await checkScheduleConflict(doctor_id, date, room_id, start_time || '08:00:00', end_time || '16:30:00');
                if (conflict) {
                    errors.push({ index: i, message: 'Xung đột lịch' });
                    continue;
                }
                const sch = await DoctorSchedule.create({
                    doctor_id,
                    date,
                    room_id,
                    start_time: start_time || '08:00:00',
                    end_time: end_time || '16:30:00',
                    max_patients: max_patients || null,
                    notes: notes || null,
                    status: 'scheduled'
                });
                created.push(sch);
            } catch (e) {
                errors.push({ index: i, message: e.message });
            }
        }

        // Nếu một số lịch tạo được và một số lỗi, trả về 207 Multi-Status hợp lý hơn
        const statusCode = created.length > 0 && errors.length > 0 ? 207 : 201;
        res.status(statusCode).json({ success: true, message: `Tạo ${created.length}/${schedules.length} lịch`, data: created, errors: errors.length ? errors : undefined });
    } catch (err) {
        console.error('❌ Error createBulkSchedules:', err);
        res.status(500).json({ success: false, message: 'Lỗi tạo hàng loạt', error: err.message });
    }
};
// Sửa lịch làm việc
exports.updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { doctor_id, date, room_id, start_time, end_time, max_patients, notes } = req.body;

        if (!doctor_id || !date || !room_id) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc: doctor_id, date, room_id' });
        }

        const schedule = await DoctorSchedule.findByPk(id);
        if (!schedule) return res.status(404).json({ success: false, message: 'Không tìm thấy lịch' });

        if (new Date(date) < new Date().setHours(0, 0, 0, 0)) {
            return res.status(400).json({ success: false, message: 'Không thể cập nhật lịch cho ngày trong quá khứ' });
        }

        const conflict = await checkScheduleConflict(doctor_id, date, room_id, id);
        if (conflict) {
            return res.status(409).json({ success: false, message: 'Xung đột lịch làm việc' });
        }

        await schedule.update({
            doctor_id,
            date,
            room_id,
            start_time: start_time || schedule.start_time || '08:00:00',
            end_time: end_time || schedule.end_time || '16:30:00',
            max_patients: max_patients ?? schedule.max_patients,
            notes: typeof notes !== 'undefined' ? notes : schedule.notes
        });

        const updated = await DoctorSchedule.findOne({
            where: { id: schedule.id },
            include: [
                { model: Room, attributes: ['id', 'name', 'status'] },
                { model: Doctor, attributes: ['id', 'user_id', 'full_name'] }
            ]
        });

        res.json({ success: true, message: 'Cập nhật thành công', data: updated });
    } catch (err) {
        console.error('❌ Error updateSchedule:', err);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật', error: err.message });
    }
};

// Xóa lịch làm việc
exports.deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await DoctorSchedule.findByPk(id);
        if (!schedule) return res.status(404).json({ success: false, message: 'Không tìm thấy lịch' });

        // Không xóa lịch đã qua
        if (new Date(schedule.date) < new Date().setHours(0, 0, 0, 0)) {
            return res.status(400).json({ success: false, message: 'Không thể xóa lịch đã qua' });
        }

        await schedule.destroy();
        res.json({ success: true, message: 'Xóa thành công' });
    } catch (err) {
        console.error('❌ Error deleteSchedule:', err);
        res.status(500).json({ success: false, message: 'Lỗi xóa', error: err.message });
    }
};

// Xóa nhiều lịch làm việc
exports.deleteBulkSchedules = async (req, res) => {
    try {
        const { schedule_ids } = req.body;

        if (!Array.isArray(schedule_ids) || schedule_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Danh sách ID lịch làm việc không hợp lệ'
            });
        }

        const schedules = await DoctorSchedule.findAll({
            where: {
                id: { [Op.in]: schedule_ids }
            }
        });

        if (schedules.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch làm việc nào để xóa'
            });
        }

        // Check for past schedules
        const pastSchedules = schedules.filter(s =>
            new Date(s.date) < new Date().setHours(0, 0, 0, 0)
        );

        if (pastSchedules.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa lịch làm việc đã qua',
                past_schedules: pastSchedules.map(s => ({ id: s.id, date: s.date }))
            });
        }

        await DoctorSchedule.destroy({
            where: {
                id: { [Op.in]: schedule_ids }
            }
        });

        res.json({
            success: true,
            message: `Đã xóa thành công ${schedules.length} lịch làm việc`
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Lỗi xóa lịch làm việc hàng loạt',
            error: err.message
        });
    }
};

exports.getScheduleStats = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const doctorId = req.doctor_id || null;

        const whereClause = {};
        if (doctorId) whereClause.doctor_id = doctorId;
        if (start_date && end_date) whereClause.date = { [Op.between]: [start_date, end_date] };

        const totalSchedules = await DoctorSchedule.count({ where: whereClause });

        // Thống kê theo trạng thái
        const schedulesByStatus = await DoctorSchedule.findAll({
            where: whereClause,
            attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['status']
        });

        // Thống kê theo ngày
        const schedulesByDate = await DoctorSchedule.findAll({
            where: whereClause,
            attributes: ['date', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['date'],
            order: [['date', 'ASC']]
        });

        res.json({ success: true, data: { total: totalSchedules, by_status: schedulesByStatus, by_date: schedulesByDate } });
    } catch (err) {
        console.error('❌ Error getScheduleStats:', err);
        res.status(500).json({ success: false, message: 'Lỗi thống kê', error: err.message });
    }
};
exports.checkIn = async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await DoctorSchedule.findByPk(id);
        if (!schedule) return res.status(404).json({ success: false, message: 'Không tìm thấy lịch' });

        const doctorIdFromReq = req.body.doctor_id || req.doctor_id;
        if (String(schedule.doctor_id) !== String(doctorIdFromReq)) {
            return res.status(403).json({ success: false, message: 'Không có quyền' });
        }

        const todayYmd = new Date().toISOString().slice(0, 10);
        if (schedule.date !== todayYmd) {
            return res.status(400).json({ success: false, message: 'Chỉ check-in trong ngày của lịch' });
        }

        if (schedule.check_in_time) {
            return res.status(400).json({ success: false, message: 'Đã check-in trước đó' });
        }

        const now = new Date();
        const startAt = combineDateTime(schedule.date, schedule.start_time || '08:00:00');
        const status = now <= startAt ? 'in_progress' : 'late';

        await schedule.update({ check_in_time: now, status });
        return res.json({ success: true, message: 'Check-in thành công', data: schedule });
    } catch (err) {
        console.error('❌ Error checkIn:', err);
        res.status(500).json({ success: false, message: 'Lỗi check-in', error: err.message });
    }
};

// Doctor check-out
exports.checkOut = async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await DoctorSchedule.findByPk(id);
        if (!schedule) return res.status(404).json({ success: false, message: 'Không tìm thấy lịch' });

        const doctorIdFromReq = req.body.doctor_id || req.doctor_id;
        if (String(schedule.doctor_id) !== String(doctorIdFromReq)) {
            return res.status(403).json({ success: false, message: 'Không có quyền' });
        }

        if (!schedule.check_in_time) {
            return res.status(400).json({ success: false, message: 'Chưa check-in' });
        }
        if (schedule.check_out_time) {
            return res.status(400).json({ success: false, message: 'Đã check-out trước đó' });
        }

        const now = new Date();
        const endAt = combineDateTime(schedule.date, schedule.end_time || '16:30:00');
        const status = now >= endAt ? 'completed' : 'left_early';

        await schedule.update({ check_out_time: now, status });
        return res.json({ success: true, message: 'Check-out thành công', data: schedule });
    } catch (err) {
        console.error('❌ Error checkOut:', err);
        res.status(500).json({ success: false, message: 'Lỗi check-out', error: err.message });
    }
};

exports.autoUpdateStatuses = async (req, res) => {
    try {
        const todayYmd = new Date().toISOString().slice(0, 10);
        const now = new Date();

        // 1) Past schedules without check-in -> absent
        const pastNoCheckIn = await DoctorSchedule.findAll({
            where: {
                date: { [Op.lt]: todayYmd },
                check_in_time: null,
                status: { [Op.notIn]: ['absent', 'cancelled'] }
            }
        });
        for (const s of pastNoCheckIn) {
            await s.update({ status: 'absent' });
        }

        // 2) For today's schedules: if end_time passed
        const todaySchedules = await DoctorSchedule.findAll({ where: { date: todayYmd } });
        for (const s of todaySchedules) {
            const endAt = combineDateTime(s.date, s.end_time || '16:30:00');
            if (now > endAt) {
                if (s.check_in_time && !s.check_out_time) {
                    await s.update({ status: 'completed' });
                }
                if (!s.check_in_time && s.status !== 'absent' && s.status !== 'cancelled') {
                    await s.update({ status: 'absent' });
                }
            }
        }

        return res.json({ success: true, message: 'Đã cập nhật trạng thái tự động' });
    } catch (err) {
        console.error('❌ Error autoUpdateStatuses:', err);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái', error: err.message });
    }
};
exports.getSchedulesForDoctor = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        if (!doctor_id) return res.status(400).json({ success: false, message: 'Thiếu doctor_id' });

        const today = new Date();
        const twoWeeksLater = new Date();
        twoWeeksLater.setDate(today.getDate() + 14);

        const schedules = await DoctorSchedule.findAll({
            where: {
                doctor_id,
                date: { [Op.between]: [today.toISOString().split('T')[0], twoWeeksLater.toISOString().split('T')[0]] }
            },
            include: [{ model: Room, attributes: ['id', 'name', 'status'] }],
            order: [['date', 'ASC'], ['start_time', 'ASC']]
        });

        res.status(200).json({ success: true, data: schedules });
    } catch (err) {
        console.error('❌ Error getSchedulesForDoctor:', err);
        res.status(500).json({ success: false, message: 'Lỗi lấy lịch', error: err.message });
    }
};

// Lấy bác sĩ làm việc trong 1 ngày
exports.getDoctorsForDate = async (req, res) => {
    try {
        const { date } = req.params;
        if (!date) return res.status(400).json({ success: false, message: 'Thiếu date' });

        const schedules = await DoctorSchedule.findAll({
            where: { date },
            include: [
                { model: Doctor, attributes: ['id', 'full_name', 'email', 'phone'] },
                { model: Room, attributes: ['id', 'name', 'status'] }
            ],
            order: [['start_time', 'ASC']]
        });

        res.status(200).json({ success: true, data: schedules });
    } catch (err) {
        console.error('❌ Error getDoctorsForDate:', err);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách bác sĩ', error: err.message });
    }
};