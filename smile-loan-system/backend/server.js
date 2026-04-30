const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const loanRoutes = require("./routes/loanRoutes");
const identityRoutes = require("./routes/identityRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api", loanRoutes);
app.use("/api", identityRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "OK" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
