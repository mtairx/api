export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const token = url.searchParams.get("token");
    const course_id = url.searchParams.get("course_id");
    const video_id = url.searchParams.get("video_id");

    // ✅ Validate
    if (!token || !course_id || !video_id) {
      return json({
        error: "Missing params",
        required: ["token", "course_id", "video_id"]
      }, 400);
    }

    // 🔐 Clean token
    const cleanToken = token.replace("~@SDV_BOTX", "").trim();

    const apiUrl = `https://rozgarapinew.teachx.in/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0`;

    try {
      const res = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Client-Service": "Appx",
          "Auth-Key": "appxapi",
          "source": "website",
          "Authorization": cleanToken,
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json",
          "Referer": "https://rojgarwithankit.co.in/"
        }
      });

      // 🔍 Get raw response
      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return json({
          error: "Invalid JSON from API",
          raw: text
        }, 500);
      }

      // ❌ If API failed
      if (!data || data.status === 0) {
        return json({
          error: "API returned invalid/empty data",
          raw: data
        }, 500);
      }

      // 🎥 Extract video data safely
      let video = data?.data?.[0] || data?.data || data;

      const result = {
        status: "success",
        title: video.title || "",
        video_id: video.id || video_id,
        course_id: video.course_id || course_id,
        qualities: video.qualities || {},
        thumbnail: video.thumbnail || "",
        notes: video.pdf_link || "",
        dpp: video.pdf_link2 || "",
        date: video.date_and_time || "",
        raw: data // keep raw for debugging
      };

      return json(result);

    } catch (err) {
      return json({
        error: "Fetch failed",
        message: err.message
      }, 500);
    }
  }
};

// ✅ Helper
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*"
    }
  });
}
