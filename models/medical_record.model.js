const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MedicalRecord = sequelize.define('MedicalRecord', {
    appointment_id: { type: DataTypes.INTEGER, allowNull: false },
    symptoms: { type: DataTypes.STRING, allowNull: true },
    diagnosis: { type: DataTypes.STRING, allowNull: true },
    medications: { type: DataTypes.TEXT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
    tableName: 'medical_records',
    timestamps: false,
});

module.exports = MedicalRecord; 