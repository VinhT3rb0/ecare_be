const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: 'ecare',
        allowed_formats: ['jpg', 'png', 'jpeg'],
        public_id: Date.now() + '-' + file.originalname.split('.')[0]
    }),
});

const upload = multer({ storage });
module.exports = upload;
