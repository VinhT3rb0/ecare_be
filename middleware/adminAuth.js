const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ message: 'Thiếu token' });
        const token = authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Token không hợp lệ' });
        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Token không hợp lệ hoặc hết hạn' });
        }
        // Kiểm tra role
        if (payload.role !== 'admin') {
            return res.status(403).json({ message: 'Chỉ admin mới được phép thực hiện chức năng này' });
        }
        // Gắn userId vào req để controller có thể dùng nếu cần
        req.userId = payload.id;
        next();
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xác thực admin', error: err.message });
    }
}; 