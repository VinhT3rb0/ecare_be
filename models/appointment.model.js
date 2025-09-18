const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Appointment = sequelize.define('Appointment', {
    patient_id: { type: DataTypes.INTEGER, allowNull: false },
    patient_name: { type: DataTypes.STRING, allowNull: false },
    patient_dob: { type: DataTypes.DATEONLY, allowNull: false },
    patient_phone: { type: DataTypes.STRING, allowNull: false },
    patient_email: { type: DataTypes.STRING, allowNull: true },
    patient_gender: { type: DataTypes.ENUM('male', 'female', 'other'), allowNull: false },
    patient_address: { type: DataTypes.TEXT, allowNull: true },
    doctor_id: { type: DataTypes.INTEGER, allowNull: false },
    department_id: { type: DataTypes.INTEGER, allowNull: false },
    schedule_id: { type: DataTypes.INTEGER, allowNull: false },
    appointment_date: { type: DataTypes.DATEONLY, allowNull: false },
    time_slot: {
        type: DataTypes.ENUM(
            '08:00-09:00',
            '09:00-10:00',
            '10:00-11:00',
            '13:30-14:30',
            '14:30-15:30',
            '15:30-16:30'
        ),
        allowNull: false,
    },
    reason: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled', "in_treatment", 'cancel_requested'), allowNull: false, defaultValue: 'pending' },
    cancel_reason: { type: DataTypes.STRING, allowNull: true },
    cancel_requested_at: { type: DataTypes.DATEONLY, allowNull: true },
    cancel_confirmed_at: { type: DataTypes.DATEONLY, allowNull: true },
}, {
    tableName: 'appointments',
    timestamps: true,
});

module.exports = Appointment;