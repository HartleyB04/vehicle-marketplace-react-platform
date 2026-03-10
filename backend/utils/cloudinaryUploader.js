const multer = require("multer");
const fs = require("fs");
const { v2: cloudinary } = require("cloudinary");

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup for temporary storage
const upload = multer({ dest: "uploads/", limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

// Helper to upload single file to Cloudinary
function uploadFile(filePath, folder = "uploads") {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(filePath, { folder }, (err, result) => {
            if (err) return reject(err);
            resolve(result.secure_url);
        });
    });
}

// Helper to upload multiple files in parallel
async function uploadFiles(files, folder = "uploads") {
    const urls = await Promise.all(files.map(f => uploadFile(f.path, folder)));
    // Clean up temp files\
    files.forEach(f => {
        if (fs.existsSync(f.path)) { // check file exists first
            fs.unlink(f.path, err => {
                if (err) console.warn("Failed to delete temp file:", f.path, err);
            });
        } else {
            console.warn("Temp file does not exist, skipping deletion:", f.path);
        }
    });

    return urls;
}

module.exports = { upload, uploadFile, uploadFiles };
