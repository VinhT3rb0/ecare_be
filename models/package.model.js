const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Package = sequelize.define('Package', {
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
    price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    image_url: { type: DataTypes.STRING, allowNull: true },
    discount: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    discount_expiry_date: { type: DataTypes.DATE, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    department_id: { type: DataTypes.INTEGER, allowNull: true },
}, {
    tableName: 'packages',
    timestamps: false,
});

module.exports = Package; 