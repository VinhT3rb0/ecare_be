// server.js
const express = require('express');
const dotenv = require('dotenv');
const sequelize = require('./config/db');
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// Import cron job
require('./cron/autoCancelAppointments');

dotenv.config();
const app = require('./app');

// CORS cho REST
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

const socketsMeta = new Map();

io.on("connection", (socket) => {
    socket.on("join_room", (payload) => {
        const role = payload?.role;
        const idUser = payload?.idUser ?? payload?.userId;

        if (!role || !idUser) {
            console.log("❌ Thiếu role hoặc idUser trong join_room");
            return;
        }
        socketsMeta.set(socket.id, { userId: idUser, role });
        socket.join(idUser);

        console.log(`✅ ${role} ${idUser} joined (socket: ${socket.id})`);
        socket.emit("joined_room", { idUser, role });
        broadcastOnlineListToAdmins();
    });

    socket.on("send_private_message", (payload) => {
        console.log("📨 send_private_message payload:", payload);
        const { fromUserId, toUserId, text, fromRole } = payload || {};
        if (!fromUserId || !text) {
            return;
        }
        if (!toUserId || toUserId === "admin") {
            const adminId = "2";
            io.to(adminId).emit("receive_private_message", {
                fromUserId,
                toUserId: adminId,
                text,
                fromRole,
                createdAt: new Date().toISOString(),
            });
            return;
        }
        io.to(toUserId).emit("receive_private_message", {
            fromUserId,
            toUserId,
            text,
            fromRole,
            createdAt: new Date().toISOString(),
        });
    });

    socket.on("disconnect", () => {
        const meta = socketsMeta.get(socket.id);
        if (meta) {
            const { userId } = meta;
            socketsMeta.delete(socket.id);
            console.log(`${meta.role} ${userId} disconnected (socket: ${socket.id})`);
            broadcastOnlineListToAdmins();
        } else {
            console.log(`Disconnected (no meta): ${socket.id}`);
        }
    });
});

function broadcastOnlineListToAdmins() {
    const patientsOnline = [...socketsMeta.values()]
        .filter(m => m.role === "patient")
        .map(m => m.userId);

    const uniquePatients = [...new Set(patientsOnline)];

    [...socketsMeta.entries()]
        .filter(([, meta]) => meta.role === "admin")
        .forEach(([sid]) => {
            io.to(sid).emit("patients_online", uniquePatients);
        });
}

sequelize.sync({ alter: true }).then(() => {
    console.log('✅ Database connected & models synced');
    server.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
    });
}).catch(err => {
    console.error('❌ Database connection failed:', err);
});
