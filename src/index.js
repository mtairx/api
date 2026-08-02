require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const BASE_URL = "https://rozgarapinew.teachx.in/get/fetchVideoDetailsById";

// 🔹 Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Video API running"
  });
});

// 🔹 Main API route
app.get("/api/video", async (req, res) => {
  try {
    // Token from header OR query
    const token =
      req.headers.authorization?.split(" ")[1] || req.query.token;

    const { course_id, video_id } = req.query;

    // Validation
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token missing"
      });
    }

    if (!course_id || !video_id) {
      return res.status(400).json({
        success: false,
        error: "course_id and video_id required"
      });
    }

    // 🔹 Request to original API
    const response = await axios.get(BASE_URL, {
      params: {
        course_id: course_id,
        video_id: video_id,
        ytflag: 0,
        folder_wise_course: 0,
        lc_app_api_url: ""
      },
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0",
        "Origin": "https://teachx.in",
        "Referer": "https://teachx.in/"
      },
      timeout: 15000
    });

    // Send response
    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// 🔹 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
