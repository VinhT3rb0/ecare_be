const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Doctor = sequelize.define('Doctor', {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    full_name: { type: DataTypes.STRING, allowNull: false },
    gender: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    degree: { type: DataTypes.STRING, allowNull: false },
    experience_years: { type: DataTypes.INTEGER, allowNull: false },
    is_approved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    degree_image_url: { type: DataTypes.STRING, allowNull: true },

}, {
    tableName: 'doctors',
    timestamps: false,
});

module.exports = Doctor; 