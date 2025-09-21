const { Op } = require('sequelize');
const Medicine = require('../models/medicine.model');

// Lấy danh sách thuốc (có phân trang, tìm kiếm)
exports.getAllMedicines = async (req, res) => {
    try {
        let page = parseInt(req.query.page, 10);
        let limit = parseInt(req.query.limit, 10);

        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(limit) || limit < 1) limit = 10;

        const offset = (page - 1) * limit;
        const where = {};
        if (req.query.search) {
            where.name = { [Op.like]: `%${req.query.search}%` };
        }

        const { count, rows } = await Medicine.findAndCountAll({
            where,
            offset,
            limit,
            order: [['created_at', 'DESC']],
        });

        res.json({
            total: count,
            page,
            limit,
            data: rows,
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy danh sách thuốc', error: err.message });
    }
};
// Lấy chi tiết thuốc theo ID
exports.getMedicineById = async (req, res) => {
    try {
        const { id } = req.params;
        const medicine = await Medicine.findByPk(id);

        if (!medicine) {
            return res.status(404).json({ message: 'Không tìm thấy thuốc' });
        }

        res.json({ data: medicine });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy thông tin thuốc', error: err.message });
    }
};

// Tạo thuốc mới
exports.createMedicine = async (req, res) => {
    try {
        const { name, description, unit, price, manufacturer, stock_quantity } = req.body;

        const medicine = await Medicine.create({
            name,
            description,
            unit,
            price,
            manufacturer,
            stock_quantity: stock_quantity ?? 0,
        });

        res.status(201).json({ message: 'Thêm thuốc thành công', data: medicine });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi thêm thuốc', error: err.message });
    }
};

// Cập nhật thuốc
exports.updateMedicine = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, unit, price, manufacturer, stock_quantity } = req.body;

        const medicine = await Medicine.findByPk(id);
        if (!medicine) {
            return res.status(404).json({ message: 'Không tìm thấy thuốc' });
        }

        // Chỉ update field có trong body
        if (name !== undefined) medicine.name = name;
        if (description !== undefined) medicine.description = description;
        if (unit !== undefined) medicine.unit = unit;
        if (price !== undefined) medicine.price = price;
        if (manufacturer !== undefined) medicine.manufacturer = manufacturer;
        if (stock_quantity !== undefined) medicine.stock_quantity = stock_quantity;
        await medicine.save();

        res.json({ message: 'Cập nhật thuốc thành công', data: medicine });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật thuốc', error: err.message });
    }
};

// Xóa thuốc
exports.deleteMedicine = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Medicine.destroy({ where: { id } });
        if (!deleted) {
            return res.status(404).json({ message: 'Không tìm thấy thuốc để xóa' });
        }

        res.json({ message: 'Xóa thuốc thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xóa thuốc', error: err.message });
    }
};

// Cập nhật số lượng tồn kho của thuốc sau khi thanh toán
exports.updateMedicineStock = async (req, res) => {
    try {
        const { medications } = req.body;
        if (!Array.isArray(medications) || medications.length === 0) {
            return res.status(400).json({ message: 'Dữ liệu thuốc không hợp lệ' });
        }

        const results = [];
        const errors = [];

        for (const item of medications) {
            const { medicine_id, quantity, action } = item;

            if (!medicine_id || !quantity || quantity <= 0) {
                errors.push({ medicine_id, message: 'Thông tin thuốc không hợp lệ' });
                continue;
            }

            const medicine = await Medicine.findByPk(medicine_id);
            if (!medicine) {
                errors.push({ medicine_id, message: 'Không tìm thấy thuốc' });
                continue;
            }

            if (action === 'export') {
                // Xuất thuốc: giảm tồn kho
                if (medicine.stock_quantity < quantity) {
                    errors.push({
                        medicine_id,
                        name: medicine.name,
                        message: 'Số lượng tồn kho không đủ',
                        available: medicine.stock_quantity,
                        requested: quantity
                    });
                    continue;
                }
                medicine.stock_quantity -= quantity;
            } else if (action === 'import') {
                // Nhập thuốc: tăng tồn kho
                medicine.stock_quantity += quantity;
            } else {
                errors.push({ medicine_id, message: 'Hành động không hợp lệ' });
                continue;
            }

            await medicine.save();

            results.push({
                medicine_id,
                name: medicine.name,
                action,
                quantity,
                current_stock: medicine.stock_quantity
            });
        }

        res.json({
            success: errors.length === 0,
            message:
                errors.length === 0
                    ? 'Cập nhật số lượng tồn kho thành công'
                    : 'Có lỗi xảy ra khi cập nhật số lượng tồn kho',
            results,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật số lượng tồn kho', error: err.message });
    }
};

