export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);

      // Get params from your API
      const token = url.searchParams.get("token");
      const course_id = url.searchParams.get("course_id");
      const video_id = url.searchParams.get("video_id");

      // Validate params
      if (!token || !course_id || !video_id) {
        return new Response(JSON.stringify({
          success: false,
          error: "Missing parameters"
        }), { status: 400 });
      }

      // Target API
      const targetUrl = `https://rozgarapinew.teachx.in/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0`;

      // Fetch original API
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        }
      });

      const data = await response.json();

      // Return clean response
      return new Response(JSON.stringify({
        success: true,
        source: "mtaiirus-proxy",
        data: data
      }), {
        status: 200,
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
