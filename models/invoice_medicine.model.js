const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Invoice = require('./invoice.model');
const Medicine = require('./medicine.model');

const InvoiceMedicine = sequelize.define('InvoiceMedicine', {
    invoice_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: Invoice, key: 'id' } },
    medicine_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: Medicine, key: 'id' } },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    dosage: { type: DataTypes.STRING(255), allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
    tableName: 'invoice_medicines',
    timestamps: false,
});
module.exports = InvoiceMedicine;
