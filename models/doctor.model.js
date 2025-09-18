const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Doctor = sequelize.define('Doctor', {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    full_name: { type: DataTypes.STRING, allowNull: true },
    gender: { type: DataTypes.STRING, allowNull: true, },
    phone: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    experience_years: { type: DataTypes.INTEGER, allowNull: true },
    avatar_img: { type: DataTypes.TEXT, allowNull: true },
    education_level: { type: DataTypes.STRING, allowNull: true },
    education_history: {
        type: DataTypes.TEXT, allowNull: true
    },
    is_approved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

}, {
    tableName: 'doctors',
    timestamps: false,
});

module.exports = Doctor; 