const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Configure multer for memory storage (we'll store as blob in Cosmos DB)
const storage = multer.memoryStorage();

// File filter to accept PDFs, Images, Word docs, Outlook messages, and EML files
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-outlook',
    'message/rfc822'
  ];
  
  // Also check file extension as fallback for some types
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.msg', '.eml'];
  const hasAllowedExtension = allowedExtensions.some(ext => 
    file.originalname.toLowerCase().endsWith(ext)
  );

  if (allowedTypes.includes(file.mimetype) || hasAllowedExtension) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPEG, PNG, DOC, DOCX, MSG, and EML files are allowed'), false);
  }
};

// Configure upload with size limit (10MB)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per upload
  }
});

module.exports = upload;
