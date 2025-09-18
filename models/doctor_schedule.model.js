const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DoctorSchedule = sequelize.define('DoctorSchedule', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'doctors',
            key: 'id'
        }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: true,
            isNotPast(value) {
                if (new Date(value) < new Date().setHours(0, 0, 0, 0)) {
                    throw new Error('Không thể tạo lịch làm việc cho ngày trong quá khứ');
                }
            }
        }
    },
    room_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'rooms',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM(
            'scheduled', 'in_progress', 'late',
            'left_early', 'completed', 'absent', 'cancelled'
        ),
        defaultValue: 'scheduled',
        allowNull: false
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false,
        defaultValue: '08:00:00',
        comment: 'Thời gian bắt đầu ca làm việc'
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false,
        defaultValue: '16:30:00',
        comment: 'Thời gian kết thúc ca làm việc'
    },
    check_in_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    check_out_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    max_patients: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 30, // ví dụ tăng lên vì cả ngày
        validate: {
            min: 1,
            max: 100
        }
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    }
}, {
    tableName: 'doctor_schedules',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['doctor_id', 'date'],
            unique: true,
            name: 'unique_doctor_date'
        },
        {
            fields: ['room_id', 'date'],
            unique: true,
            name: 'unique_room_date'
        }
    ],
    hooks: {
        beforeCreate: (schedule) => {
            if (!schedule.start_time) schedule.start_time = '08:00:00';
            if (!schedule.end_time) schedule.end_time = '16:30:00';
        },
        beforeUpdate: (schedule) => {
            schedule.updated_at = new Date();
        }
    }
});

module.exports = DoctorSchedule;
