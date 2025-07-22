const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DoctorDepartment = sequelize.define('DoctorDepartment', {
    doctor_id: { type: DataTypes.INTEGER, allowNull: false },
    department_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
    tableName: 'doctor_departments',
    timestamps: false,
});

module.exports = DoctorDepartment; 