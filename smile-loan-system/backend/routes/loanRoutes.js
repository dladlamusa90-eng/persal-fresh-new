const express = require("express");
const { applyLoan } = require("../controllers/loanController");

const router = express.Router();

router.post("/apply-loan", applyLoan);

module.exports = router;
