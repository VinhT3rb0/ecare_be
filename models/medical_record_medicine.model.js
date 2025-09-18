const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const MedicalRecordMedication = sequelize.define("MedicalRecordMedication", {
    medical_record_id: DataTypes.INTEGER,
    medicine_id: DataTypes.INTEGER,
    quantity: DataTypes.INTEGER,
    dosage: DataTypes.STRING,
    instructions: DataTypes.TEXT,
}, { tableName: "medical_record_medications", timestamps: false });
module.exports = MedicalRecordMedication;
