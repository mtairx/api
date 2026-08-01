export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const endpoint = url.searchParams.get("endpoint");
    const token = url.searchParams.get("token");
    const course_id = url.searchParams.get("course_id");
    const video_id = url.searchParams.get("video_id");

    // ❌ Validate endpoint
    if (endpoint !== "video-details") {
      return json({ error: "Invalid endpoint" }, 400);
    }

    // ❌ Validate params
    if (!token || !course_id || !video_id) {
      return json({
        error: "Missing parameters",
        required: ["token", "course_id", "video_id"]
      }, 400);
    }

    // 🔐 Clean token
    const cleanToken = token.replace("~@SDV_BOTX", "").trim();

    if (cleanToken.length < 20) {
      return json({ error: "Invalid token" }, 401);
    }

    // ⚡ Cache key
    const cacheKey = new Request(request.url, request);
    const cache = caches.default;

    // 🔄 Try cache
    let cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const apiUrl = `https://rozgarapinew.teachx.in/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0&lc_app_api_url=`;

      const response = await fetch(apiUrl, {
        headers: {
          "Client-Service": "Appx",
          "Auth-Key": "appxapi",
          "source": "website",
          "Authorization": cleanToken
        }
      });

      const data = await response.json();

      // 📦 Clean response
      const d = data.data?.[0] || {};

      const finalData = {
        status: "success",
        title: d.title || "",
        video_id: d.id || video_id,
        course_id: d.course_id || course_id,
        qualities: d.qualities || {},
        thumbnail: d.thumbnail || "",
        notes: d.pdf_link || "",
        dpp: d.pdf_link2 || "",
        date: d.date_and_time || ""
      };

      const res = json(finalData, 200);

      // 💾 Save to cache
      ctx.waitUntil(cache.put(cacheKey, res.clone()));

      return res;

    } catch (err) {
      return json({
        error: "Fetch failed",
        message: err.message
      }, 500);
    }
  }
};

// 📦 Helper
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
