const { sequelize, Invoice, Appointment, Patient, Department, Package, InvoicePackages, Review, Doctor } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

function parseRange(query) {
    const { from, to } = query;
    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to) : new Date();
    return { start, end };
}

// GET /overview?from&to
exports.getOverview = async (req, res) => {
    try {
        const { start, end } = parseRange(req.query);

        const [revenueRow, invoicesRow, appointmentsRow] = await Promise.all([
            Invoice.findOne({
                attributes: [[fn('IFNULL', fn('SUM', col('total_amount')), 0), 'revenue']],
                where: { status: 'paid', created_at: { [Op.between]: [start, end] } }
            }),
            Invoice.findOne({
                attributes: [[fn('COUNT', col('id')), 'count']],
                where: { created_at: { [Op.between]: [start, end] } }
            }),
            Appointment.findOne({
                attributes: [[fn('COUNT', col('id')), 'count']],
                where: { appointment_date: { [Op.between]: [start, end] } },
                raw: true
            })
        ]);

        const revenue = parseFloat(revenueRow?.get('revenue') || 0);
        const invoices = parseInt(invoicesRow?.get('count') || 0, 10);
        const appointments = parseInt((appointmentsRow && appointmentsRow.count) || 0, 10);

        return res.json({ data: { revenue, invoices, appointments } });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi tổng quan thống kê', error: err.message });
    }
};

// GET /revenue-series?from&to&granularity=day|month
exports.getRevenueSeries = async (req, res) => {
    try {
        const { start, end } = parseRange(req.query);
        const granularity = (req.query.granularity || 'day').toString();
        const dateExpr = granularity === 'month' ? "DATE_FORMAT(created_at, '%Y-%m')" : "DATE(created_at)";

        const rows = await Invoice.findAll({
            attributes: [
                [literal(dateExpr), 'time'],
                [fn('SUM', col('total_amount')), 'value']
            ],
            where: { status: 'paid', created_at: { [Op.between]: [start, end] } },
            group: [literal(dateExpr)],
            order: [[literal('time'), 'ASC']],
            raw: true
        });

        return res.json({ data: rows.map(r => ({ time: r.time, value: parseFloat(r.value) })) });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi lấy biểu đồ doanh thu', error: err.message });
    }
};

// GET /invoices-series?from&to&granularity=day|month
exports.getInvoicesSeries = async (req, res) => {
    try {
        const { start, end } = parseRange(req.query);
        const granularity = (req.query.granularity || 'day').toString();
        const dateExpr = granularity === 'month' ? "DATE_FORMAT(created_at, '%Y-%m')" : "DATE(created_at)";

        const rows = await Invoice.findAll({
            attributes: [
                [literal(dateExpr), 'time'],
                [fn('COUNT', col('id')), 'value']
            ],
            where: { created_at: { [Op.between]: [start, end] } },
            group: [literal(dateExpr)],
            order: [[literal('time'), 'ASC']],
            raw: true
        });

        return res.json({ data: rows.map(r => ({ time: r.time, value: parseInt(r.value, 10) })) });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi lấy biểu đồ hóa đơn', error: err.message });
    }
};

// GET /revenue-by-department?from&to
exports.getRevenueByDepartment = async (req, res) => {
    try {
        const { start, end } = parseRange(req.query);
        const rows = await Invoice.findAll({
            attributes: [
                [col('Appointment.Department.name'), 'department'],
                [fn('SUM', col('Invoice.total_amount')), 'value']
            ],
            include: [{
                model: Appointment,
                attributes: [],
                include: [{ model: Department, attributes: [] }]
            }],
            where: { status: 'paid', created_at: { [Op.between]: [start, end] } },
            group: [col('Appointment.Department.name')],
            raw: true
        });
        return res.json({ data: rows.map(r => ({ type: r.department || 'Khác', value: parseFloat(r.value) })) });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi lấy cơ cấu doanh thu theo khoa', error: err.message });
    }
};

// GET /top-services?from&to&limit=6
exports.getTopServices = async (req, res) => {
    try {
        const { start, end } = parseRange(req.query);
        const limit = parseInt(req.query.limit || '6', 10);

        const rows = await InvoicePackages.findAll({
            attributes: [
                [col('package.name'), 'type'],
                [fn('SUM', col('InvoicePackages.quantity')), 'value']
            ],
            include: [
                { model: Package, as: 'package', attributes: [] },
                { model: Invoice, as: 'invoice', attributes: [], where: { created_at: { [Op.between]: [start, end] } } }
            ],
            group: [col('package.name')],
            order: [[literal('value'), 'DESC']],
            limit,
            raw: true
        });

        return res.json({ data: rows.map(r => ({ type: r.type || 'Gói khác', value: parseInt(r.value, 10) })) });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi lấy top dịch vụ', error: err.message });
    }
};

// GET /doctor/overview?from&to&doctor_id
exports.getDoctorOverview = async (req, res) => {
    try {
        const { start, end } = parseRange(req.query);
        let { doctor_id } = req.query;
        if (!doctor_id) {
            // Try infer from authenticated user (doctor)
            const doctor = await Doctor.findOne({ where: { user_id: req.userId }, attributes: ['id'], raw: true });
            doctor_id = doctor?.id;
        }
        if (!doctor_id) return res.status(400).json({ message: 'Thiếu doctor_id' });

        const [appointmentsInRange, inTreatment, completedInRange, avgRatingRow] = await Promise.all([
            Appointment.count({ where: { doctor_id, appointment_date: { [Op.between]: [start, end] } } }),
            Appointment.count({ where: { doctor_id, status: 'in_treatment' } }),
            Appointment.count({ where: { doctor_id, status: 'completed', appointment_date: { [Op.between]: [start, end] } } }),
            Review.findOne({ attributes: [[fn('AVG', col('rating')), 'avg_rating']], where: { doctor_id, created_at: { [Op.between]: [start, end] } }, raw: true })
        ]);

        return res.json({
            data: {
                appointmentsInRange,
                inTreatment,
                completedInRange,
                avgRating: parseFloat(avgRatingRow?.avg_rating || 0).toFixed(2)
            }
        });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi lấy tổng quan doctor', error: err.message });
    }
};

// GET /doctor/upcoming?limit=5&doctor_id
exports.getDoctorUpcomingAppointments = async (req, res) => {
    try {
        let { doctor_id } = req.query;
        const limit = parseInt(req.query.limit || '5', 10);
        if (!doctor_id) {
            const doctor = await Doctor.findOne({ where: { user_id: req.userId }, attributes: ['id'], raw: true });
            doctor_id = doctor?.id;
        }
        if (!doctor_id) return res.status(400).json({ message: 'Thiếu doctor_id' });

        const rows = await Appointment.findAll({
            where: { doctor_id, appointment_date: { [Op.gte]: new Date() } },
            include: [{ model: Patient, attributes: ['id', 'full_name', 'phone'] }],
            order: [['appointment_date', 'ASC']],
            limit,
            raw: true,
            nest: true,
        });

        return res.json({
            data: rows.map(r => ({
                id: r.id,
                date: r.appointment_date,
                time: r.time_slot,
                patient_name: r.Patient?.full_name,
                patient_phone: r.Patient?.phone,
            }))
        });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi lấy lịch hẹn sắp tới', error: err.message });
    }
};

// GET /doctor/appointments-series?from&to&granularity=day|month
exports.getDoctorAppointmentsSeries = async (req, res) => {
    try {
        const { start, end } = parseRange(req.query);
        const granularity = (req.query.granularity || 'day').toString();
        const dateExpr = granularity === 'month' ? "DATE_FORMAT(appointment_date, '%Y-%m')" : "DATE(appointment_date)";

        let { doctor_id } = req.query;
        if (!doctor_id) {
            const doctor = await Doctor.findOne({ where: { user_id: req.userId }, attributes: ['id'], raw: true });
            doctor_id = doctor?.id;
        }
        if (!doctor_id) return res.status(400).json({ message: 'Thiếu doctor_id' });

        const rows = await Appointment.findAll({
            attributes: [
                [literal(dateExpr), 'time'],
                [fn('COUNT', col('id')), 'value']
            ],
            where: { doctor_id, appointment_date: { [Op.between]: [start, end] } },
            group: [literal(dateExpr)],
            order: [[literal('time'), 'ASC']],
            raw: true,
        });

        return res.json({ data: rows.map(r => ({ time: r.time, value: parseInt(r.value, 10) })) });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi lấy biểu đồ lịch hẹn bác sĩ', error: err.message });
    }
};


