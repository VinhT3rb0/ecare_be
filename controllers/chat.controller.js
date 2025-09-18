const ChatMessage = require("../models/chat_message.model");
const { Op } = require("sequelize");
const sequelize = require("../config/db");
const { QueryTypes } = require("sequelize")
exports.getConversation = async (req, res) => {
    try {
        const { userId1, userId2 } = req.params;

        const messages = await ChatMessage.findAll({
            where: {
                [Op.or]: [
                    { sender_id: userId1, receiver_id: userId2 },
                    { sender_id: userId2, receiver_id: userId1 }
                ]
            },
            order: [["created_at", "ASC"]],
        });

        res.json(messages);
    } catch (err) {
        console.error("❌ Lỗi lấy conversation:", err);
        res.status(500).json({ error: "Lỗi server" });
    }
};
exports.saveMessage = async (req, res) => {
    try {
        const { sender_id, receiver_id, message_type } = req.body;
        let messageContent = req.body.message || null;
        let fileUrl = null;

        if (req.file && req.file.path) {
            fileUrl = req.file.path;
            messageContent = fileUrl;
        }

        const newMessage = await ChatMessage.create({
            sender_id,
            receiver_id,
            message: messageContent,
            message_type: message_type || (req.file ? "image" : "text"),
        });

        return res.status(201).json({ success: true, data: newMessage });
    } catch (error) {
        console.error("❌ Lỗi khi lưu chat:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};
exports.updateMessage = async (req, res) => {
    try {
        const { sender_id, receiver_id, message_type } = req.body;
        let messageContent = req.body.message || null;

        if (!sender_id || !receiver_id) {
            return res.status(400).json({ error: "Thiếu sender_id hoặc receiver_id" });
        }
        if (req.file && req.file.path) {
            messageContent = req.file.path;
        }

        const newMessage = await ChatMessage.create({
            sender_id,
            receiver_id,
            message: messageContent,
            message_type: message_type || (req.file ? "image" : "text"),
        });

        return res.status(201).json({ success: true, data: newMessage });
    } catch (error) {
        console.error("❌ Lỗi khi lưu chat:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};
exports.deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await ChatMessage.destroy({ where: { id } });
        if (!deleted) {
            return res.status(404).json({ error: "Tin nhắn không tồn tại" });
        }

        res.json({ success: true, message: "Đã xóa tin nhắn" });
    } catch (err) {
        console.error("❌ Lỗi delete message:", err);
        res.status(500).json({ error: "Lỗi server" });
    }
};

// Lấy tất cả các cuộc trò chuyện (distinct userId)
exports.getAllConversations = async (req, res) => {
    try {
        const adminId = 2; // hoặc lấy từ req.user.id sau này

        const rows = await sequelize.query(
            `
        SELECT m.*
        FROM chat_messages m
        INNER JOIN (
          SELECT 
            LEAST(sender_id, receiver_id) as u1,
            GREATEST(sender_id, receiver_id) as u2,
            MAX(created_at) as last_time
          FROM chat_messages
          WHERE sender_id = :adminId OR receiver_id = :adminId
          GROUP BY u1, u2
        ) t 
        ON ((LEAST(m.sender_id, m.receiver_id) = t.u1)
         AND (GREATEST(m.sender_id, m.receiver_id) = t.u2)
         AND m.created_at = t.last_time)
        ORDER BY m.created_at DESC
        `,
            {
                replacements: { adminId },
                type: QueryTypes.SELECT,
            }
        );

        res.json(rows);
    } catch (err) {
        console.error("getAllConversations error:", err);
        res.status(500).json({ error: err.message });
    }
};

