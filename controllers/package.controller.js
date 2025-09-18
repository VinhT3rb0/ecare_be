const Package = require('../models/package.model');
const Department = require('../models/department.model');
const { Op } = require('sequelize');

// Lấy danh sách gói khám
// Lấy danh sách gói khám
exports.getAllPackages = async (req, res) => {
    try {
        let { page, limit, name } = req.query;
        const where = {};

        if (name) {
            where.name = { [Op.like]: `%${name}%` };
        }

        // Nếu có page & limit thì phân trang
        if (page && limit) {
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;

            const { count, rows } = await Package.findAndCountAll({
                where,
                include: [
                    {
                        model: Department,
                        attributes: ["id", "name", "description"],
                    },
                ],
                offset,
                limit,
                order: [["id", "DESC"]],
            });

            return res.json({
                total: count,
                page,
                limit,
                data: rows,
            });
        }
        const rows = await Package.findAll({
            where,
            include: [
                {
                    model: Department,
                    attributes: ["id", "name", "description"],
                },
            ],
            order: [["id", "DESC"]],
        });

        return res.json({
            total: rows.length,
            data: rows,
        });
    } catch (err) {
        res
            .status(500)
            .json({ message: "Lỗi lấy danh sách gói khám", error: err.message });
    }
};


// Thêm gói khám mới
exports.createPackage = async (req, res) => {
    try {
        const { name, description, price, discount, discount_expiry_date, department_id, is_active } = req.body;

        // Validate department_id exists
        // if (department_id) {
        //     const department = await Department.findByPk(department_id);
        //     if (!department) {
        //         return res.status(400).json({ message: 'Chuyên khoa không tồn tại' });
        //     }
        // }

        const image_url = req.file ? req.file.path : null;
        const pkg = await Package.create({
            name,
            description,
            price,
            discount,
            image_url,
            discount_expiry_date,
            is_active,
            ...(department_id ? { department_id } : {})
        });

        // Return package with department info
        const packageWithDept = await Package.findByPk(pkg.id, {
            include: [{
                model: Department,
                attributes: ['id', 'name', 'description']
            }]
        });

        res.status(201).json(packageWithDept);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi tạo gói khám', error: err.message });
    }
};

// Sửa thông tin gói khám
exports.updatePackage = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, discount, discount_expiry_date, department_id, is_active } = req.body;

        // Validate department_id exists
        if (department_id) {
            const department = await Department.findByPk(department_id);
            if (!department) {
                return res.status(400).json({ message: 'Chuyên khoa không tồn tại' });
            }
        }

        const image_url = req.file ? req.file.path : req.body.image_url || null;
        const [affectedRows] = await Package.update(
            { name, description, price, discount, image_url, discount_expiry_date, department_id, is_active },
            { where: { id } }
        );
        if (affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy gói khám để cập nhật' });

        // Return updated package with department info
        const updatedPackage = await Package.findByPk(id, {
            include: [{
                model: Department,
                attributes: ['id', 'name', 'description']
            }]
        });

        res.json(updatedPackage);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật gói khám', error: err.message });
        console.log(err); // Log the error for debugging
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

// Lấy gói khám theo department
exports.getPackagesByDepartment = async (req, res) => {
    try {
        const { department_id } = req.params;
        const { page = 1, limit = 10, name } = req.query;
        const offset = (page - 1) * limit;

        const nameCondition = name ? { name: { [Op.like]: `%${name}%` } } : {};

        // Lấy packages thuộc chuyên khoa cụ thể
        const { count: countDept, rows: deptRows } = await Package.findAndCountAll({
            where: { department_id, ...nameCondition },
            include: [
                {
                    model: Department,
                    attributes: ["id", "name", "description"],
                },
            ],
            offset: parseInt(offset),
            limit: parseInt(limit),
            order: [["id", "DESC"]],
        });

        // Lấy packages không thuộc chuyên khoa nào
        const noDeptRows = await Package.findAll({
            where: { department_id: null, ...nameCondition },
            include: [
                {
                    model: Department,
                    attributes: ["id", "name", "description"],
                },
            ],
            order: [["id", "DESC"]],
        });

        res.json({
            total: countDept + noDeptRows.length,
            page: parseInt(page),
            limit: parseInt(limit),
            data: [...deptRows, ...noDeptRows],
        });
    } catch (err) {
        res
            .status(500)
            .json({ message: "Lỗi lấy gói khám theo chuyên khoa", error: err.message });
    }
};
