const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OtpToken = sequelize.define('OtpToken', {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    otp_code: { type: DataTypes.STRING, allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
    tableName: 'otp_tokens',
    timestamps: false,
});

module.exports = OtpToken; 