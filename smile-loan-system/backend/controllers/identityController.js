const { verifySelfie } = require("../services/smileService");
const { getUserById, updateUserById } = require("../utils/dataStore");

async function verifyIdentity(req, res) {
  try {
    const { user_id, id_number } = req.body;
    const selfieFile = req.file;

    if (!user_id || typeof user_id !== "string") {
      return res.status(400).json({ error: "user_id is required" });
    }

    if (!id_number || typeof id_number !== "string") {
      return res.status(400).json({ error: "id_number is required" });
    }

    if (!selfieFile) {
      return res.status(400).json({ error: "selfie_image is required" });
    }

    const user = getUserById(user_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const selfie_base64 = selfieFile.buffer.toString("base64");
    const verification = await verifySelfie({ id_number, selfie_base64 });

    const status =
      verification.success === true && verification.confidence > 0.95
        ? "approved_for_processing"
        : "rejected";

    updateUserById(user_id, {
      id_number: id_number.trim(),
      verification: {
        status,
        confidence: verification.confidence,
        checked_at: new Date().toISOString(),
      },
    });

    return res.json({ status, confidence: verification.confidence });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Verification failed",
    });
  }
}

module.exports = {
  verifyIdentity,
};
