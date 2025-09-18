const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MedicalRecordService = sequelize.define("MedicalRecordService", {
    medical_record_id: DataTypes.INTEGER,
    package_id: DataTypes.INTEGER,
    quantity: DataTypes.INTEGER,
    notes: DataTypes.TEXT,
}, { tableName: "medical_record_services", timestamps: false });

module.exports = MedicalRecordService;