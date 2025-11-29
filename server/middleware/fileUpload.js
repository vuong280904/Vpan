const multer = require('multer');
const path = require('path');

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = 'uploads/flashset_images/';
    if (file.fieldname === "shadow") {
      dest = 'uploads/';
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    if (file.fieldname === "shadow") {
      filename = uniqueSuffix + '-' + file.fieldname + '.wav';
    }
    cb(null, filename);
  },
});

const upload = multer({ storage: storage });

const conditionalUpload = (fieldName) => (req, res, next) => {
  const contentType = req.headers['content-type'];
  if (contentType && contentType.includes('multipart/form-data')) {
    upload.single(fieldName)(req, res, next);
  } else {
    next();
  }
};

module.exports = conditionalUpload;