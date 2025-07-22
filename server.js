const express = require('express');
const dotenv = require('dotenv');
const sequelize = require('./config/db');

dotenv.config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: true }).then(() => {
    console.log('Database connected & models synced');
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Database connection failed:', err);
});
