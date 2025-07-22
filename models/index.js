const sequelize = require('../config/db');
const User = require('./user.model');
const Patient = require('./patient.model');
const Doctor = require('./doctor.model');
const Admin = require('./admin.model');
const Department = require('./department.model');
const Room = require('./room.model');
const DoctorSchedule = require('./doctor_schedule.model');
const Appointment = require('./appointment.model');
const MedicalRecord = require('./medical_record.model');
const Package = require('./package.model');
const AppointmentPackage = require('./appointment_package.model');
const Invoice = require('./invoice.model');
const Payment = require('./payment.model');
const Review = require('./review.model');
const OtpToken = require('./otp_token.model');
const DoctorDepartment = require('./doctor_department.model');

// User - Patient/Doctor/Admin (1-1)
User.hasOne(Patient, { foreignKey: 'user_id' });
Patient.belongsTo(User, { foreignKey: 'user_id' });
User.hasOne(Doctor, { foreignKey: 'user_id' });
Doctor.belongsTo(User, { foreignKey: 'user_id' });
User.hasOne(Admin, { foreignKey: 'user_id' });
Admin.belongsTo(User, { foreignKey: 'user_id' });

// Doctor - DoctorSchedule (1-n)
Doctor.hasMany(DoctorSchedule, { foreignKey: 'doctor_id' });
DoctorSchedule.belongsTo(Doctor, { foreignKey: 'doctor_id' });

// Room - DoctorSchedule (1-n)
Room.hasMany(DoctorSchedule, { foreignKey: 'room_id' });
DoctorSchedule.belongsTo(Room, { foreignKey: 'room_id' });

// Department - DoctorDepartment (1-n), Doctor - DoctorDepartment (1-n)
Department.belongsToMany(Doctor, { through: DoctorDepartment, foreignKey: 'department_id', otherKey: 'doctor_id' });
Doctor.belongsToMany(Department, { through: DoctorDepartment, foreignKey: 'doctor_id', otherKey: 'department_id' });

// Appointment - Patient/Doctor/Department/Schedule (n-1)
Patient.hasMany(Appointment, { foreignKey: 'patient_id' });
Appointment.belongsTo(Patient, { foreignKey: 'patient_id' });
Doctor.hasMany(Appointment, { foreignKey: 'doctor_id' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctor_id' });
Department.hasMany(Appointment, { foreignKey: 'department_id' });
Appointment.belongsTo(Department, { foreignKey: 'department_id' });
DoctorSchedule.hasMany(Appointment, { foreignKey: 'schedule_id' });
Appointment.belongsTo(DoctorSchedule, { foreignKey: 'schedule_id' });

// Appointment - AppointmentPackage (1-n), Package - AppointmentPackage (1-n)
Appointment.belongsToMany(Package, { through: AppointmentPackage, foreignKey: 'appointment_id', otherKey: 'package_id' });
Package.belongsToMany(Appointment, { through: AppointmentPackage, foreignKey: 'package_id', otherKey: 'appointment_id' });

// Appointment - MedicalRecord (1-1)
Appointment.hasOne(MedicalRecord, { foreignKey: 'appointment_id' });
MedicalRecord.belongsTo(Appointment, { foreignKey: 'appointment_id' });

// Appointment - Invoice (1-1), Patient - Invoice (1-n)
Appointment.hasOne(Invoice, { foreignKey: 'appointment_id' });
Invoice.belongsTo(Appointment, { foreignKey: 'appointment_id' });
Patient.hasMany(Invoice, { foreignKey: 'patient_id' });
Invoice.belongsTo(Patient, { foreignKey: 'patient_id' });

// Invoice - Payment (1-n)
Invoice.hasMany(Payment, { foreignKey: 'invoice_id' });
Payment.belongsTo(Invoice, { foreignKey: 'invoice_id' });

// Review - Patient/Doctor (n-1)
Patient.hasMany(Review, { foreignKey: 'patient_id' });
Review.belongsTo(Patient, { foreignKey: 'patient_id' });
Doctor.hasMany(Review, { foreignKey: 'doctor_id' });
Review.belongsTo(Doctor, { foreignKey: 'doctor_id' });

// User - OtpToken (1-n)
User.hasMany(OtpToken, { foreignKey: 'user_id' });
OtpToken.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
    sequelize,
    User,
    Patient,
    Doctor,
    Admin,
    Department,
    Room,
    DoctorSchedule,
    Appointment,
    MedicalRecord,
    Package,
    AppointmentPackage,
    Invoice,
    Payment,
    Review,
    OtpToken,
    DoctorDepartment
}; 