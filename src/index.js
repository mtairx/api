// index.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Constants
const API_BASE = "https://rozgarapinew.teachx.in/get";
const VIDEO_API = "https://rwa.video-edustream.indevs.in";
const HEADERS = {
  "Client-Service": "Appx",
  "Auth-Key": "appxapi",
  "source": "website"
};

// Store tokens in memory (use Redis/DB for production)
const userTokens = {};

// Generate device ID
function generateDeviceId() {
  return "dev_" + Math.random().toString(36).substr(2, 10);
}

// Routes

// 📲 Send OTP
app.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const response = await axios.get(`${API_BASE}/sendotp?phone=${phone}`, {
      headers: HEADERS
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Verify OTP
app.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const deviceId = generateDeviceId();
    
    const response = await axios.get(
      `${API_BASE}/otpverify?useremail=${phone}&otp=${otp}&device_id=${deviceId}`,
      { headers: HEADERS }
    );
    
    if (response.data.user && response.data.user.token) {
      const token = response.data.user.token;
      userTokens[phone] = token;
      
      // Return token in both places to match original system
      res.json({
        token: token,
        message: "Login successful"
      });
    } else {
      res.status(401).json({ error: "Invalid OTP" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🎥 Fetch Video URL
app.get('/fetch-video-url', async (req, res) => {
  try {
    const { phone, courseId, videoId } = req.query;
    
    if (!userTokens[phone]) {
      return res.status(401).json({ error: "Not logged in" });
    }
    
    const token = userTokens[phone];
    
    // Use existing video API but extract just the video URL
    const response = await axios.get(
      `${VIDEO_API}/?endpoint=video-details&token=${token}&userid=517077&course_id=${courseId}&video_id=${videoId}`,
      { headers: HEADERS }
    );
    
    // Extract video URL from response
    const videoUrl = response.data?.video_url || response.data?.url || response.data?.videoLink;
    
    if (videoUrl) {
      res.json({ video_url: videoUrl });
    } else {
      res.status(404).json({ error: "Video URL not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🎥 Fetch Full Video Details
app.get('/fetch-video-details', async (req, res) => {
  try {
    const { phone, courseId, videoId } = req.query;
    
    if (!userTokens[phone]) {
      return res.status(401).json({ error: "Not logged in" });
    }
    
    const token = userTokens[phone];
    
    // Fetch full video details
    const response = await axios.get(
      `${VIDEO_API}/?endpoint=video-details&token=${token}&userid=517077&course_id=${courseId}&video_id=${videoId}`,
      { headers: HEADERS }
    );
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔁 Token Refresh Endpoint
app.post('/refresh-token', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!userTokens[phone]) {
      return res.status(401).json({ error: "No active session" });
    }
    
    // Simulate token refresh (replace with actual refresh API)
    const newToken = userTokens[phone]; // In real implementation, get new token from server
    
    // Update stored token
    userTokens[phone] = newToken;
    
    res.json({ new_token: newToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
