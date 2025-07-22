const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DoctorSchedule = sequelize.define('DoctorSchedule', {
    doctor_id: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    shift: { type: DataTypes.ENUM('sáng', 'chiều', 'tối'), allowNull: false },
    room_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
    tableName: 'doctor_schedules',
    timestamps: false,
});

module.exports = DoctorSchedule; 