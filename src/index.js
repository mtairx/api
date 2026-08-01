export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);

      const token = url.searchParams.get("token");
      const course_id = url.searchParams.get("course_id");
      const video_id = url.searchParams.get("video_id");

      if (!token || !course_id || !video_id) {
        return new Response(JSON.stringify({
          success: false,
          error: "Missing parameters"
        }), { status: 400 });
      }

      const targetUrl = `https://rozgarapinew.teachx.in/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0`;

      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0",

          // 🔥 IMPORTANT HEADERS
          "origin": "https://teachx.in",
          "referer": "https://teachx.in/",
          "app-version": "1.0.0",
          "platform": "web"
        }
      });

      // 👇 read as text first
      const text = await response.text();

      // try to parse JSON safely
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return new Response(JSON.stringify({
          success: false,
          error: "API returned non-JSON (likely blocked)",
          preview: text.slice(0, 200) // show first part
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: data
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({
        success: false,
        error: err.message
      }), { status: 500 });
    }
  }
};
