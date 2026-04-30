const { randomUUID } = require("crypto");
const { saveUser } = require("../utils/dataStore");

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidPhoneNumber(value) {
  return typeof value === "string" && /^[+]?\d{8,15}$/.test(value.trim());
}

function applyLoan(req, res) {
  const { first_name, last_name, id_number, phone_number } = req.body;

  if (!isNonEmptyString(first_name)) {
    return res.status(400).json({ error: "first_name is required" });
  }

  if (!isNonEmptyString(last_name)) {
    return res.status(400).json({ error: "last_name is required" });
  }

  if (!isNonEmptyString(id_number)) {
    return res.status(400).json({ error: "id_number is required" });
  }

  if (!isValidPhoneNumber(phone_number)) {
    return res
      .status(400)
      .json({ error: "phone_number is required and must be 8-15 digits" });
  }

  const user_id = randomUUID();

  saveUser({
    user_id,
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    id_number: id_number.trim(),
    phone_number: phone_number.trim(),
    created_at: new Date().toISOString(),
  });

  return res.json({ user_id, message: "Proceed to identity verification" });
}

module.exports = {
  applyLoan,
};
