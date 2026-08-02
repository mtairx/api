app.get("/api/video", async (req, res) => {
  const token =
    req.headers.authorization?.split(" ")[1] || req.query.token;

  const { course_id, video_id } = req.query;

  if (!token || !course_id || !video_id) {
    return res.status(400).json({
      error: "Missing token / course_id / video_id"
    });
  }

  try {
    const url = "https://rozgarapinew.teachx.in/get/fetchVideoDetailsById";

    console.log("➡️ Sending request with:");
    console.log("Token:", token.substring(0, 20) + "...");
    console.log("course_id:", course_id);
    console.log("video_id:", video_id);

    const response = await axios.get(url, {
      params: {
        course_id,
        video_id,
        ytflag: 0,
        folder_wise_course: 0,
        lc_app_api_url: ""
      },
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Origin": "https://rozgarapinew.teachx.in",
        "Referer": "https://rozgarapinew.teachx.in/"
      },
      validateStatus: () => true // 🔥 IMPORTANT (see real response)
    });

    console.log("Status:", response.status);

    // 🔥 If API returns HTML (blocked)
    if (typeof response.data === "string") {
      console.log("❌ HTML RESPONSE (blocked)");
      return res.status(403).json({
        error: "Blocked or invalid token",
        preview: response.data.slice(0, 200)
      });
    }

    // ✅ Success
    return res.json({
      success: true,
      data: response.data
    });

  } catch (err) {
    console.log("ERROR:", err.message);

    return res.status(500).json({
      error: err.message
    });
  }
});
