const DoctorSchedule = require('../models/doctor_schedule.model');
const { Op } = require('sequelize');
const Appointment = require('../models/appointment.model');
const Doctor = require('../models/doctor.model');
const Department = require('../models/department.model');
const { transporter, getFromAddress } = require('../config/mailer');

// Hàm auto hủy lịch hẹn quá giờ
exports.autoCancelOverdueAppointments = async (req, res) => {
    try {
        const now = new Date();
        const currentTimeStr = now.toTimeString().slice(0, 5); // HH:MM format
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Tìm các lịch hẹn quá giờ
        const overdueAppointments = await Appointment.findAll({
            where: {
                appointment_date: today,
                status: {
                    [Op.in]: ['pending', 'confirmed'] // Chỉ hủy pending và confirmed
                }
            },
            include: [
                { model: Doctor, attributes: ["id", "full_name", "email"] },
                { model: Department, attributes: ["id", "name"] }
            ]
        });

        const cancelledAppointments = [];
        const currentMinutes = parseInt(currentTimeStr.split(':')[0]) * 60 + parseInt(currentTimeStr.split(':')[1]);

        for (const appointment of overdueAppointments) {
            const appointmentTime = appointment.time_slot;
            const [appointmentHour, appointmentMinute] = appointmentTime.split(':').map(Number);
            const appointmentMinutes = appointmentHour * 60 + appointmentMinute;

            // Nếu quá giờ hẹn (cho phép trễ 30 phút)
            if (currentMinutes > appointmentMinutes + 30) {
                await appointment.update({
                    status: 'cancelled',
                    cancel_reason: 'Tự động hủy do quá giờ hẹn'
                });

                cancelledAppointments.push(appointment);

                // Gửi email thông báo hủy
                try {
                    await sendCancellationEmail(appointment);
                } catch (emailError) {
                    console.error('❌ Error sending cancellation email:', emailError);
                }
            }
        }

        res.status(200).json({
            success: true,
            message: `Đã tự động hủy ${cancelledAppointments.length} lịch hẹn quá giờ`,
            data: {
                cancelledCount: cancelledAppointments.length,
                cancelledAppointments: cancelledAppointments.map(apt => ({
                    id: apt.id,
                    patient_name: apt.patient_name,
                    appointment_date: apt.appointment_date,
                    time_slot: apt.time_slot,
                    doctor_name: apt.Doctor?.full_name
                }))
            }
        });
    } catch (error) {
        console.error('❌ Error auto cancelling overdue appointments:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tự động hủy lịch hẹn quá giờ',
            error: error.message,
        });
    }
};

// Hàm gửi email thông báo hủy lịch hẹn
const sendCancellationEmail = async (appointment) => {
    try {
        const fromAddress = getFromAddress();

        const mailOptions = {
            from: fromAddress,
            to: appointment.patient_email,
            subject: `Thông báo hủy lịch hẹn - ${appointment.Doctor?.full_name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #e74c3c;">Thông báo hủy lịch hẹn</h2>
                    <p>Xin chào <strong>${appointment.patient_name}</strong>,</p>
                    
                    <p>Chúng tôi xin thông báo lịch hẹn của bạn đã bị hủy do quá giờ hẹn:</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #2c3e50; margin-top: 0;">Thông tin lịch hẹn</h3>
                        <p><strong>Bác sĩ:</strong> ${appointment.Doctor?.full_name}</p>
                        <p><strong>Khoa:</strong> ${appointment.Department?.name}</p>
                        <p><strong>Ngày hẹn:</strong> ${new Date(appointment.appointment_date).toLocaleDateString('vi-VN')}</p>
                        <p><strong>Giờ hẹn:</strong> ${appointment.time_slot}</p>
                        <p><strong>Lý do hủy:</strong> ${appointment.cancel_reason}</p>
                    </div>
                    
                    <p>Vui lòng đặt lịch hẹn mới nếu bạn vẫn muốn khám bệnh.</p>
                    
                    <p>Trân trọng,<br>
                    <strong>Hệ thống E-Care</strong></p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Cancellation email sent to ${appointment.patient_email}`);
    } catch (error) {
        console.error('❌ Error sending cancellation email:', error);
        throw error;
    }
};

// Bắt đầu điều trị - kiểm tra ngày và giờ hẹn
exports.startTreatment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await Appointment.findByPk(id, {
            include: [
                { model: Doctor, attributes: ["id", "full_name", "email", "phone"] },
                { model: Department, attributes: ["id", "name"] }
            ]
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lịch hẹn",
            });
        }

        if (appointment.status !== "confirmed") {
            return res.status(400).json({
                success: false,
                message: "Chỉ có thể bắt đầu điều trị với lịch hẹn đã xác nhận",
            });
        }

        // Kiểm tra ngày hẹn
        const appointmentDate = new Date(appointment.appointment_date);
        const today = new Date();
        const isToday = appointmentDate.toDateString() === today.toDateString();

        if (!isToday) {
            return res.status(400).json({
                success: false,
                message: "Chỉ có thể bắt đầu điều trị vào ngày hẹn",
            });
        }

        // Kiểm tra giờ hẹn
        const appointmentTime = appointment.time_slot;
        const currentTime = new Date();
        const currentTimeStr = currentTime.toTimeString().slice(0, 5); // HH:MM format

        // So sánh thời gian (chỉ so sánh giờ:phút)
        const [appointmentHour, appointmentMinute] = appointmentTime.split(':').map(Number);
        const [currentHour, currentMinute] = currentTimeStr.split(':').map(Number);

        const appointmentMinutes = appointmentHour * 60 + appointmentMinute;
        const currentMinutes = currentHour * 60 + currentMinute;

        if (currentMinutes < appointmentMinutes) {
            return res.status(400).json({
                success: false,
                message: `Chưa đến giờ hẹn. Giờ hẹn: ${appointmentTime}, Giờ hiện tại: ${currentTimeStr}`,
            });
        }

        // Cập nhật trạng thái
        await appointment.update({ status: "in_treatment" });

        res.status(200).json({
            success: true,
            message: "Đã bắt đầu điều trị thành công",
            data: appointment,
        });
    } catch (error) {
        console.error('❌ Error starting treatment:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi bắt đầu điều trị',
            error: error.message,
        });
    }
};

// Kiểm tra xem bệnh nhân có thể đặt lịch không
exports.checkAppointmentAvailability = async (req, res) => {
    try {
        const { patient_id, doctor_id, appointment_date, time_slot } = req.query;

        if (!patient_id || !doctor_id || !appointment_date || !time_slot) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp đầy đủ thông tin: patient_id, doctor_id, appointment_date, time_slot",
            });
        }
        const existing = await Appointment.findOne({
            where: {
                patient_id: parseInt(patient_id),
                doctor_id: parseInt(doctor_id),
                appointment_date,
                time_slot,
                status: {
                    [Op.notIn]: ['cancelled']
                }
            }
        });

        if (existing) {
            return res.status(200).json({
                success: false,
                available: false,
                message: "Bạn đã có lịch hẹn với bác sĩ này trong khung giờ này.",
            });
        }
        const pendingAppointment = await Appointment.findOne({
            where: {
                patient_id: parseInt(patient_id),
                doctor_id: parseInt(doctor_id),
                appointment_date,
                status: 'pending'
            }
        });

        if (pendingAppointment) {
            return res.status(200).json({
                success: false,
                available: false,
                message: "Bạn đã có lịch hẹn đang chờ xác nhận với bác sĩ này trong ngày này.",
            });
        }

        res.status(200).json({
            success: true,
            available: true,
            message: "Có thể đặt lịch hẹn.",
        });
    } catch (error) {
        console.error('❌ Error checking appointment availability:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra tính khả dụng của lịch hẹn',
            error: error.message,
        });
    }
};

// Tạo mới một lịch hẹn
exports.createAppointment = async (req, res) => {
    try {
        const appointmentData = req.body;
        const existing = await Appointment.findOne({
            where: {
                patient_id: appointmentData.patient_id,
                doctor_id: appointmentData.doctor_id,
                appointment_date: appointmentData.appointment_date,
                time_slot: appointmentData.time_slot,
                status: {
                    [Op.notIn]: ['cancelled']
                }
            }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Bạn đã có lịch hẹn với bác sĩ này trong khung giờ này. Vui lòng chọn khung giờ khác.",
            });
        }

        // Kiểm tra thêm: bệnh nhân có lịch hẹn đang chờ xác nhận với cùng bác sĩ trong ngày không
        const pendingAppointment = await Appointment.findOne({
            where: {
                patient_id: appointmentData.patient_id,
                doctor_id: appointmentData.doctor_id,
                appointment_date: appointmentData.appointment_date,
                status: 'pending'
            }
        });

        if (pendingAppointment) {
            return res.status(400).json({
                success: false,
                message: "Bạn đã có lịch hẹn đang chờ xác nhận với bác sĩ này trong ngày này. Vui lòng chờ xác nhận hoặc chọn ngày khác.",
            });
        }

        const newAppointment = await Appointment.create(appointmentData);
        res.status(201).json({
            success: true,
            message: 'Appointment created successfully',
            data: newAppointment,
        });
    } catch (error) {
        console.error('❌ Error creating appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create appointment',
            error: error.message,
        });
    }
};

// Lấy danh sách lịch hẹn
exports.getAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.findAll();
        res.status(200).json({
            success: true,
            data: appointments,
        });
    } catch (error) {
        console.error('❌ Error fetching appointments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointments',
            error: error.message,
        });
    }
};

// Lấy thông tin chi tiết một lịch hẹn
exports.getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await Appointment.findByPk(id, {
            include: [
                {
                    model: Doctor,
                    attributes: ["id", "full_name", "phone"]
                },
                {
                    model: Department,
                    attributes: ["id", "name"]
                },
                {
                    model: DoctorSchedule,
                    attributes: ['id', 'date', 'max_patients'],
                }
            ]
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        res.status(200).json({
            success: true,
            data: appointment,
        });
    } catch (error) {
        console.error('❌ Error fetching appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointment',
            error: error.message,
        });
    }
};

// Cập nhật lịch hẹn
exports.updateAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        const appointment = await Appointment.findByPk(id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }
        const prevStatus = appointment.status;
        const prevDate = appointment.appointment_date;
        const prevSlot = appointment.time_slot;
        await appointment.update(updatedData);

        // Gửi email khi chuyển sang confirmed
        if (prevStatus !== 'confirmed' && appointment.status === 'confirmed') {
            try {
                const subject = 'Xác nhận lịch hẹn khám bệnh';
                const html = `
                    <div>
                        <h3>Xin chào ${appointment.patient_name},</h3>
                        <p>Lịch hẹn của bạn đã được xác nhận.</p>
                        <ul>
                            <li>Ngày khám: <b>${appointment.appointment_date}</b></li>
                            <li>Khung giờ: <b>${appointment.time_slot}</b></li>
                        </ul>
                        <p>Vui lòng đến đúng giờ. Cám ơn bạn đã sử dụng dịch vụ!</p>
                    </div>
                `;
                if (appointment.patient_email) {
                    await transporter.sendMail({
                        from: getFromAddress(),
                        to: appointment.patient_email,
                        subject,
                        html,
                    });
                }

            } catch (mailErr) {
                console.error('❌ Error sending confirmation email:', mailErr);
            }
        }

        // Gửi email khi chuyển sang cancelled
        if (prevStatus !== 'cancelled' && appointment.status === 'cancelled') {
            try {
                // Lấy thông tin bác sĩ và khoa để gửi email
                const appointmentWithDetails = await Appointment.findByPk(id, {
                    include: [
                        { model: Doctor, attributes: ["id", "full_name", "email"] },
                        { model: Department, attributes: ["id", "name"] }
                    ]
                });

                if (appointmentWithDetails && appointmentWithDetails.patient_email) {
                    await sendCancellationEmail(appointmentWithDetails);
                }
            } catch (mailErr) {
                console.error('❌ Error sending cancellation email:', mailErr);
            }
        }

        // Gửi email khi thay đổi ngày hoặc khung giờ
        const dateChanged = Object.prototype.hasOwnProperty.call(updatedData, 'appointment_date') && updatedData.appointment_date !== prevDate;
        const slotChanged = Object.prototype.hasOwnProperty.call(updatedData, 'time_slot') && updatedData.time_slot !== prevSlot;
        if (dateChanged || slotChanged) {
            try {
                const subject = 'Cập nhật lịch hẹn khám bệnh';
                const html = `
                    <div>
                        <h3>Xin chào ${appointment.patient_name},</h3>
                        <p>Lịch hẹn của bạn đã được cập nhật.</p>
                        <ul>
                            <li>Ngày cũ: <b>${prevDate || '-'}</b></li>
                            <li>Giờ cũ: <b>${prevSlot || '-'}</b></li>
                            <li>Ngày mới: <b>${appointment.appointment_date}</b></li>
                            <li>Giờ mới: <b>${appointment.time_slot}</b></li>
                        </ul>
                        <p>Nếu bạn có thắc mắc, vui lòng liên hệ với chúng tôi.</p>
                    </div>
                `;
                if (appointment.patient_email) {
                    await transporter.sendMail({
                        from: getFromAddress(),
                        to: appointment.patient_email,
                        subject,
                        html,
                    });
                }
            } catch (mailErr) {
                console.error('❌ Error sending reschedule email:', mailErr);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Appointment updated successfully',
            data: appointment,
        });
    } catch (error) {
        console.error('❌ Error updating appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update appointment',
            error: error.message,
        });
    }
};
// Patient requests cancellation
exports.requestCancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const appointment = await Appointment.findByPk(id);
        if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

        await appointment.update({ status: 'cancel_requested', cancel_reason: reason || null, cancel_requested_at: new Date() });
        return res.json({ success: true, message: 'Cancel request submitted', data: appointment });
    } catch (error) {
        console.error('❌ Error requestCancelAppointment:', error);
        res.status(500).json({ success: false, message: 'Failed to request cancellation', error: error.message });
    }
};

// Doctor approves cancellation
exports.approveCancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await Appointment.findByPk(id);
        if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

        await appointment.update({ status: 'cancelled', cancel_confirmed_at: new Date() });

        // send email notify
        try {
            const subject = 'Hủy lịch hẹn đã được xác nhận';
            const html = `
                <div>
                    <h3>Xin chào ${appointment.patient_name},</h3>
                    <p>Yêu cầu hủy lịch hẹn của bạn đã được xác nhận.</p>
                    <ul>
                        <li>Ngày: <b>${appointment.appointment_date}</b></li>
                        <li>Khung giờ: <b>${appointment.time_slot}</b></li>
                        <li>Lý do: ${appointment.cancel_reason || '-'}</li>
                    </ul>
                </div>
            `;
            if (appointment.patient_email) {
                await transporter.sendMail({ from: getFromAddress(), to: appointment.patient_email, subject, html });
            }
        } catch (mailErr) {
            console.error('❌ Error sending cancel email:', mailErr);
        }

        return res.json({ success: true, message: 'Appointment cancelled', data: appointment });
    } catch (error) {
        console.error('❌ Error approveCancelAppointment:', error);
        res.status(500).json({ success: false, message: 'Failed to approve cancellation', error: error.message });
    }
};

// Doctor rejects cancellation
exports.rejectCancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await Appointment.findByPk(id);
        if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

        await appointment.update({ status: 'confirmed' });

        try {
            const subject = 'Yêu cầu hủy lịch hẹn bị từ chối';
            const html = `
                <div>
                    <h3>Xin chào ${appointment.patient_name},</h3>
                    <p>Yêu cầu hủy lịch hẹn của bạn đã <b>bị từ chối</b>.</p>
                    <ul>
                        <li>Ngày: <b>${appointment.appointment_date}</b></li>
                        <li>Khung giờ: <b>${appointment.time_slot}</b></li>
                    </ul>
                    <p>Vui lòng đến đúng giờ để được khám. Nếu có vấn đề, vui lòng liên hệ lại với chúng tôi.</p>
                </div>
            `;
            if (appointment.patient_email) {
                await transporter.sendMail({
                    from: getFromAddress(),
                    to: appointment.patient_email,
                    subject,
                    html
                });
            }
        } catch (mailErr) {
            console.error('❌ Error sending reject cancel email:', mailErr);
        }

        return res.json({ success: true, message: 'Cancellation rejected', data: appointment });
    } catch (error) {
        console.error('❌ Error rejectCancelAppointment:', error);
        res.status(500).json({ success: false, message: 'Failed to reject cancellation', error: error.message });
    }
};

// Doctor cancels appointment directly
exports.doctorCancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const appointment = await Appointment.findByPk(id, {
            include: [
                { model: Doctor, attributes: ["id", "full_name", "email"] },
                { model: Department, attributes: ["id", "name"] }
            ]
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Kiểm tra trạng thái hiện tại
        if (appointment.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Lịch hẹn đã được hủy trước đó'
            });
        }

        if (appointment.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Không thể hủy lịch hẹn đã hoàn thành'
            });
        }

        // Cập nhật trạng thái
        await appointment.update({
            status: 'cancelled',
            cancel_reason: reason || 'Bác sĩ hủy lịch hẹn',
            cancel_confirmed_at: new Date()
        });

        // Gửi email thông báo hủy cho bệnh nhân
        try {
            await sendCancellationEmail(appointment);
        } catch (emailError) {
            console.error('❌ Error sending cancellation email:', emailError);
        }

        res.status(200).json({
            success: true,
            message: 'Đã hủy lịch hẹn thành công',
            data: appointment
        });
    } catch (error) {
        console.error('❌ Error doctorCancelAppointment:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hủy lịch hẹn',
            error: error.message
        });
    }
};


// Xóa lịch hẹn
exports.deleteAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await Appointment.findByPk(id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }
        await appointment.destroy();
        res.status(200).json({
            success: true,
            message: 'Appointment deleted successfully',
        });
    } catch (error) {
        console.error('❌ Error deleting appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete appointment',
            error: error.message,
        });
    }
};
exports.getAvailableTimeSlots = async (req, res) => {
    try {
        const { doctor_id, appointment_date } = req.params;

        // Kiểm tra đầu vào
        if (!doctor_id || !appointment_date) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp doctor_id và appointment_date',
            });
        }

        const allTimeSlots = [
            '08:00-09:00',
            '09:00-10:00',
            '10:00-11:00',
            '13:30-14:30',
            '14:30-15:30',
            '15:30-16:30',
        ];

        // Lấy schedule của bác sĩ trong ngày để biết sức chứa tối đa/khung giờ
        const schedule = await DoctorSchedule.findOne({
            where: { doctor_id, date: appointment_date },
            attributes: ['id', 'max_patients'],
        });

        if (!schedule) {
            return res.status(200).json({ success: true, data: [] });
        }

        const maxPerSlot = Number(schedule.max_patients) || 1;
        const appointments = await Appointment.findAll({
            where: { doctor_id, appointment_date },
            attributes: ['time_slot'],
        });

        const countBySlot = appointments.reduce((acc, a) => {
            const slot = a.time_slot;
            acc[slot] = (acc[slot] || 0) + 1;
            return acc;
        }, {});
        const availableTimeSlots = allTimeSlots.filter((slot) => {
            const current = countBySlot[slot] || 0;
            return current < maxPerSlot;
        });

        res.status(200).json({ success: true, data: availableTimeSlots });
    } catch (error) {
        console.error('❌ Error fetching available time slots:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách khung giờ còn lại',
            error: error.message,
        });
    }
};
// Lấy danh sách lịch khám theo doctor_id
exports.getAppointmentsByDoctor = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { status } = req.query;

        // Kiểm tra đầu vào
        if (!doctor_id) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp doctor_id',
            });
        }
        const whereCondition = { doctor_id };
        if (status) {
            whereCondition.status = status;
        }

        // Lấy danh sách lịch hẹn của bác sĩ
        const appointments = await Appointment.findAll({
            where: whereCondition,
            include: [
                {
                    model: DoctorSchedule,
                    attributes: ['date'],
                },
                { model: Doctor, attributes: ["id", "full_name", "email", "phone"] },
                { model: Department, attributes: ["id", "name"] }
            ],
            order: [['appointment_date', 'ASC'], ['time_slot', 'ASC']], // Sắp xếp theo ngày và giờ
        });

        res.status(200).json({
            success: true,
            data: appointments,
        });
    } catch (error) {
        console.error('❌ Error fetching appointments by doctor:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách lịch khám',
            error: error.message,
        });
    }
};
exports.getAppointmentsByPatient = async (req, res) => {
    try {
        const { patient_id } = req.params;

        const appointments = await Appointment.findAll({
            where: { patient_id },
            include: [
                { model: Doctor, attributes: ["id", "full_name", "email", "phone"] },
                { model: Department, attributes: ["id", "name"] },
                { model: DoctorSchedule, attributes: ["id", "date"] }
            ],
            order: [["appointment_date", "DESC"]],
        });

        res.json({
            success: true,
            data: appointments,
        });
    } catch (err) {
        console.error("Error getAppointmentsByPatient:", err);
        res.status(500).json({ success: false, message: "Lỗi lấy lịch hẹn", error: err.message });
    }
};
// Lấy danh sách lịch hẹn theo status
exports.getAppointmentsByStatus = async (req, res) => {
    try {
        const { status } = req.params;

        // Kiểm tra nếu status không hợp lệ
        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'cancel_requested', 'in_treatment'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status không hợp lệ. Hãy chọn một trong: ${validStatuses.join(', ')}`,
            });
        }

        const appointments = await Appointment.findAll({
            where: { status },
            include: [
                { model: Doctor, attributes: ["id", "full_name", "email", "phone"] },
                { model: Department, attributes: ["id", "name"] }
            ],
            order: [['appointment_date', 'DESC']],
        });

        res.status(200).json({
            success: true,
            data: appointments,
        });
    } catch (error) {
        console.error('❌ Error fetching appointments by status:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách lịch hẹn theo trạng thái',
            error: error.message,
        });
    }
};
//lấy lịch hẹn theo ngày của bác sĩ
exports.getAppointmentsByDoctorAndDate = async (req, res) => {
    try {
        const { doctor_id, appointment_date } = req.params;

        if (!doctor_id || !appointment_date) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp doctor_id và appointment_date",
            });
        }

        const appointments = await Appointment.findAll({
            where: {
                doctor_id,
                appointment_date
            },
            include: [
                { model: Doctor, attributes: ["id", "full_name", "email", "phone"] },
                { model: Department, attributes: ["id", "name"] },
                { model: DoctorSchedule, attributes: ["id", "date"] }
            ],
            order: [["time_slot", "ASC"]],
        });

        res.status(200).json({
            success: true,
            data: appointments,
        });
    } catch (error) {
        console.error("❌ Error fetching appointments by doctor and date:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách lịch hẹn theo bác sĩ và ngày",
            error: error.message,
        });
    }
};
