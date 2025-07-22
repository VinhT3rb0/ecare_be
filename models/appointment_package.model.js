const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AppointmentPackage = sequelize.define('AppointmentPackage', {
    appointment_id: { type: DataTypes.INTEGER, allowNull: false },
    package_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
    tableName: 'appointment_packages',
    timestamps: false,
});

module.exports = AppointmentPackage; 