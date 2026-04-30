const axios = require("axios");

async function verifySelfie({ id_number, selfie_base64 }) {
  const smileApiUrl = process.env.SMILE_API_URL;
  const partnerId = process.env.SMILE_PARTNER_ID;
  const apiKey = process.env.SMILE_API_KEY;

  if (!smileApiUrl) {
    throw new Error("SMILE_API_URL is not configured");
  }

  if (!partnerId) {
    throw new Error("SMILE_PARTNER_ID is not configured");
  }

  try {
    const payload = {
      partner_id: partnerId,
      job_type: "smart_selfie_authentication",
      id_number,
      selfie_image: selfie_base64,
    };

    const headers = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await axios.post(smileApiUrl, payload, { headers });

    const raw = response.data;
    const confidence = Number(
      raw?.confidence_score ?? raw?.confidence ?? raw?.result?.confidence ?? 0
    );

    const success = Boolean(
      raw?.success ??
        raw?.verified ??
        raw?.result?.verified ??
        raw?.result?.success ??
        false
    );

    return {
      success,
      confidence,
      raw,
    };
  } catch (error) {
    const rawError =
      error && error.response && error.response.data
        ? error.response.data
        : error instanceof Error
          ? { message: error.message }
          : { message: "Unknown Smile Identity error" };

    return {
      success: false,
      confidence: 0,
      raw: rawError,
    };
  }
}

module.exports = {
  verifySelfie,
};
