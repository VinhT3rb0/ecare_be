const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const InvoicePackages = sequelize.define('InvoicePackages', {
    invoice_id: { type: DataTypes.INTEGER, allowNull: false },
    package_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
}, {
    tableName: 'invoice_packages',
    timestamps: false,
});

module.exports = InvoicePackages;
