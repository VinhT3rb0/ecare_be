const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'doctor', 'patient'), allowNull: false },
}, {
    tableName: 'users',
    timestamps: true,
});

// Add unique index after table creation
User.sync().then(async () => {
    try {
        await sequelize.query('ALTER TABLE Users ADD UNIQUE INDEX email_unique (email);');
    } catch (error) {
        console.error('Error adding unique index:', error);
    }
});

module.exports = User;