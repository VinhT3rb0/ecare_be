const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PendingDegree = sequelize.define('PendingDegree', {
    doctor_id: { type: DataTypes.INTEGER, allowNull: false },
    full_name: { type: DataTypes.STRING, allowNull: false },
    date_of_birth: { type: DataTypes.DATEONLY, allowNull: false },
    cccd: { type: DataTypes.STRING, allowNull: false },
    issue_date: { type: DataTypes.DATEONLY, allowNull: false },
    issue_place: { type: DataTypes.STRING, allowNull: false },
    specialization: { type: DataTypes.STRING, allowNull: false },
    practice_scope: { type: DataTypes.STRING, allowNull: false },
    proof_image_url: { type: DataTypes.TEXT, allowNull: true },
    is_update_request: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    original_degree_id: { type: DataTypes.INTEGER, allowNull: true },
}, {
    tableName: 'pending_degrees',
    timestamps: false,
});

module.exports = PendingDegree;