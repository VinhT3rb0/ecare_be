const Package = require('../models/package.model');

// Lấy danh sách gói khám
exports.getAllPackages = async (req, res) => {
    try {
        const packages = await Package.findAll();
        res.json(packages);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy danh sách gói khám', error: err.message });
    }
};

// Thêm gói khám mới
exports.createPackage = async (req, res) => {
    try {
        const { name, description, price, discount } = req.body;
        const image_url = req.file ? req.file.path : null;
        const pkg = await Package.create({ name, description, price, discount, image_url });
        res.status(201).json(pkg);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi tạo gói khám', error: err.message });
        console.log(err.message);

    }
};

// Sửa thông tin gói khám
exports.updatePackage = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price } = req.body;
        const [affectedRows] = await Package.update({ name, description, price }, { where: { id } });
        if (affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy gói khám để cập nhật' });
        const updatedPackage = await Package.findByPk(id);
        res.json(updatedPackage);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật gói khám', error: err.message });
    }
};

// Xóa gói khám
exports.deletePackage = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Package.destroy({ where: { id } });
        if (!deleted) return res.status(404).json({ message: 'Không tìm thấy gói khám để xóa' });
        res.json({ message: 'Đã xóa gói khám thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xóa gói khám', error: err.message });
    }
}; 