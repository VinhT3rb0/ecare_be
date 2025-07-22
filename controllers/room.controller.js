const Room = require('../models/room.model');

// Lấy danh sách phòng khám
exports.getAllRooms = async (req, res) => {
    try {
        const rooms = await Room.findAll();
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy danh sách phòng', error: err.message });
    }
};

// Thêm phòng khám mới
exports.createRoom = async (req, res) => {
    try {
        const { name, status } = req.body;
        const room = await Room.create({ name, status });
        res.status(201).json(room);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi tạo phòng', error: err.message });
    }
};

// Sửa thông tin phòng khám
exports.updateRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, status } = req.body;
        const [affectedRows] = await Room.update({ name, status }, { where: { id } });
        if (affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy phòng để cập nhật' });
        const updatedRoom = await Room.findByPk(id);
        res.json(updatedRoom);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật phòng', error: err.message });
    }
};

// Xóa phòng khám
exports.deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Room.destroy({ where: { id } });
        if (!deleted) return res.status(404).json({ message: 'Không tìm thấy phòng để xóa' });
        res.json({ message: 'Đã xóa phòng thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xóa phòng', error: err.message });
    }
};
