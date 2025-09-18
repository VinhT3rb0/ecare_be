const cron = require('node-cron');
const axios = require('axios');

// Chạy mỗi 15 phút để kiểm tra lịch hẹn quá giờ
cron.schedule('*/15 * * * *', async () => {
    try {
        console.log('🕐 Running auto cancel overdue appointments job...');

        const response = await axios.post(`${process.env.API_URL || 'http://localhost:3000'}/api/app-appointment/v1/auto-cancel-overdue`);

        if (response.data.success) {
            console.log(`✅ Auto cancel job completed: ${response.data.message}`);
            if (response.data.data.cancelledCount > 0) {
                console.log(`📧 Cancelled ${response.data.data.cancelledCount} appointments and sent emails`);
            }
        } else {
            console.error('❌ Auto cancel job failed:', response.data.message);
        }
    } catch (error) {
        console.error('❌ Error running auto cancel job:', error.message);
    }
}, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
});

console.log('🕐 Auto cancel appointments cron job started - runs every 15 minutes');

module.exports = cron;
