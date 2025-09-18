const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Invoice = sequelize.define('Invoice', {
    appointment_id: { type: DataTypes.INTEGER, allowNull: false },
    patient_id: { type: DataTypes.INTEGER, allowNull: false },
    total_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    payment_method: { type: DataTypes.ENUM('Momo', 'VNPay', 'Cash'), allowNull: true },
    status: { type: DataTypes.ENUM('paid', 'unpaid'), allowNull: false, defaultValue: 'unpaid' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    has_insurance: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, },
}, {
    tableName: 'invoices',
    timestamps: false,
});

module.exports = Invoice; 