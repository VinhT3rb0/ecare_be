const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Room = sequelize.define('Room', {
    name: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.ENUM('available', 'in-use'), allowNull: false, defaultValue: 'available' },
    department_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
    tableName: 'rooms',
    timestamps: false,
});

module.exports = Room; 