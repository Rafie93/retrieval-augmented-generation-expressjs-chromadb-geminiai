const express = require("express");
const cors = require("cors");
require("dotenv").config();

const chromaRoutes = require("./routes/chroma");
const pdfRoutes = require("./routes/pdfProcessing");
const pdfTextRoutes = require("./routes/pdfTextProcessing");
const advancedSearchRoutes = require("./routes/advancedSearch");
const publicSearchRoutes = require("./routes/publicSearch");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/chroma", chromaRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/pdf-text", pdfTextRoutes);
app.use("/api/advanced", advancedSearchRoutes);
app.use("/api/public", publicSearchRoutes);
// Basic route
app.get("/", (req, res) => {
  res.json({ message: "ChromaDB dengan Express.js" });
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
