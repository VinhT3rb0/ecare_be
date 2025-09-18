const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DoctorDepartment = sequelize.define('DoctorDepartment', {
    doctor_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    department_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
}, {
    tableName: 'doctor_departments',
    timestamps: false,
    id: false, // Tắt trường id
    indexes: [
        {
            unique: true,
            fields: ['doctor_id', 'department_id']
        }
    ]
});

module.exports = DoctorDepartment; 