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
// const AppointmentPackage = require('./appointment_package.model'); // removed
const Invoice = require('./invoice.model');
const InvoicePackages = require('./invoice_packages.model');
const Payment = require('./payment.model');
const Review = require('./review.model');
const OtpToken = require('./otp_token.model');
const DoctorDepartment = require('./doctor_department.model');
const Degree = require('./degree.model');
const PendingDegree = require('./pending_degree.model');
const ChatMessage = require('./chat_message.model');
const Medicine = require('./medicine.model');
const InvoiceMedicine = require('./invoice_medicine.model');
const MedicalRecordService = require('./medical_record_service.model');
const MedicalRecordMedication = require('./medical_record_medicine.model');
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
Department.belongsToMany(Doctor, {
    through: DoctorDepartment,
    foreignKey: 'department_id',
    otherKey: 'doctor_id',
    as: 'doctors'
});

Doctor.belongsToMany(Department, {
    through: DoctorDepartment,
    foreignKey: 'doctor_id',
    otherKey: 'department_id',
    as: 'departments'
});

// Appointment - Doctor/Department/Schedule/Patient (n-1)
Doctor.hasMany(Appointment, { foreignKey: 'doctor_id' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctor_id' });
Department.hasMany(Appointment, { foreignKey: 'department_id' });
Appointment.belongsTo(Department, { foreignKey: 'department_id' });
DoctorSchedule.hasMany(Appointment, { foreignKey: 'schedule_id' });
Appointment.belongsTo(DoctorSchedule, { foreignKey: 'schedule_id' });
Patient.hasMany(Appointment, { foreignKey: 'patient_id' });
Appointment.belongsTo(Patient, { foreignKey: 'patient_id' });
// Removed AppointmentPackage relations

// Appointment - MedicalRecord (1-1)
Appointment.hasOne(MedicalRecord, { foreignKey: 'appointment_id' });
MedicalRecord.belongsTo(Appointment, { foreignKey: 'appointment_id' });


MedicalRecord.hasMany(MedicalRecordMedication, { foreignKey: "medical_record_id", as: "medications" });
MedicalRecordMedication.belongsTo(MedicalRecord, { foreignKey: "medical_record_id" });

MedicalRecordMedication.belongsTo(Medicine, { foreignKey: "medicine_id", as: "medicine" });
Medicine.hasMany(MedicalRecordMedication, { foreignKey: "medicine_id" });

// MedicalRecord <-> MedicalRecordService <-> Package
MedicalRecord.hasMany(MedicalRecordService, { foreignKey: "medical_record_id", as: "services" });
MedicalRecordService.belongsTo(MedicalRecord, { foreignKey: "medical_record_id" });

MedicalRecordService.belongsTo(Package, { foreignKey: "package_id", as: "package" });
Package.hasMany(MedicalRecordService, { foreignKey: "package_id" });
// Appointment - Invoice (1-1)
Appointment.hasOne(Invoice, { foreignKey: 'appointment_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Invoice.belongsTo(Appointment, { foreignKey: 'appointment_id' });

// Patient - Invoice (1-n)
Patient.hasMany(Invoice, { foreignKey: 'patient_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Invoice.belongsTo(Patient, { foreignKey: 'patient_id' });

// Invoice - InvoicePackages (1-n), Package - InvoicePackages (1-n)
// Explicit relations for through table so it can be included directly
Invoice.hasMany(InvoicePackages, { foreignKey: 'invoice_id', as: 'invoicePackages' });
InvoicePackages.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
Package.hasMany(InvoicePackages, { foreignKey: 'package_id', as: 'invoicePackages' });
InvoicePackages.belongsTo(Package, { foreignKey: 'package_id', as: 'package' });

Invoice.belongsToMany(Package, {
    through: InvoicePackages,
    foreignKey: 'invoice_id',
    otherKey: 'package_id',
    as: 'packages'
});

Package.belongsToMany(Invoice, {
    through: InvoicePackages,
    foreignKey: 'package_id',
    otherKey: 'invoice_id',
    as: 'invoices'
});

// Invoice - Payment (1-n)
Invoice.hasMany(Payment, { foreignKey: 'invoice_id' });
Payment.belongsTo(Invoice, { foreignKey: 'invoice_id' });

// Review - Patient/Doctor (n-1)
// GIỮ NGUYÊN VÌ REVIEW VẪN CẦN LIÊN KẾT PATIENT
Patient.hasMany(Review, { foreignKey: 'patient_id' });
Review.belongsTo(Patient, { foreignKey: 'patient_id' });
Doctor.hasMany(Review, { foreignKey: 'doctor_id' });
Review.belongsTo(Doctor, { foreignKey: 'doctor_id' });

// User - OtpToken (1-n)
User.hasMany(OtpToken, { foreignKey: 'user_id' });
OtpToken.belongsTo(User, { foreignKey: 'user_id' });

// Doctor - Degree (1-n)
Doctor.hasMany(Degree, { foreignKey: 'doctor_id' });
Degree.belongsTo(Doctor, { foreignKey: 'doctor_id' });

// ChatMessage
ChatMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
ChatMessage.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

Department.hasMany(Room, { foreignKey: 'department_id' });
Room.belongsTo(Department, { foreignKey: 'department_id' });

// Department - Package (1-n)
Department.hasMany(Package, { foreignKey: 'department_id' });
Package.belongsTo(Department, { foreignKey: 'department_id' });

InvoiceMedicine.belongsTo(Invoice, { foreignKey: 'invoice_id' });
InvoiceMedicine.belongsTo(Medicine, { foreignKey: 'medicine_id' });

Invoice.hasMany(InvoiceMedicine, { foreignKey: 'invoice_id', as: 'invoiceMedicines' });
// Use a distinct alias on Medicine side to avoid alias collisions
Medicine.hasMany(InvoiceMedicine, { foreignKey: 'medicine_id', as: 'medicineInvoices' });
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
    // AppointmentPackage,
    Invoice,
    InvoicePackages,
    Payment,
    Review,
    OtpToken,
    DoctorDepartment,
    Degree,
    PendingDegree,
    ChatMessage,
    Medicine,
    MedicalRecordService,
    MedicalRecordMedication,
    InvoiceMedicine
};