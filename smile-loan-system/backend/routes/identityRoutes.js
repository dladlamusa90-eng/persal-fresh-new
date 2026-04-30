const express = require("express");
const multer = require("multer");
const { verifyIdentity } = require("../controllers/identityController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post("/verify-identity", upload.single("selfie_image"), verifyIdentity);

module.exports = router;
