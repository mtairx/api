export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS, POST, PUT, DELETE",
          "Access-Control-Allow-Headers": "*, client-service, auth-key, User-ID, Authorization, source, Device-Type",
        },
      });
    }

    const url = new URL(request.url);

    // Only handle /get-video endpoint
    if (url.pathname !== "/get-video") {
      return new Response(
        JSON.stringify({ status: 404, message: "Not Found" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    const params = new URLSearchParams(url.search);

    // Validate required parameters
    if (!params.has('course_id') || !params.has('video_id')) {
      return new Response(
        JSON.stringify({ status: 400, message: "Bad Request - Missing course_id or video_id" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
    
    // Add required parameters
    params.set('ytflag', '0');
    params.set('folder_wise_course', '0');
    params.set('lc_app_api_url', '');

    // FIXED: Added backticks for template literal
    const targetUrl = `https://rozgarapinew.teachx.in/get/fetchVideoDetailsById?${params.toString()}`;

    // Build headers with environment variables support
    const headers = new Headers({
      "accept": "*/*",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
      "auth-key": "appxapi",
      "authorization": env.AUTH_TOKEN || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjcxMTU0MjciLCJ0aW1lc3RhbXAiOjE3ODUzMzI3NDAsIml2X3ZlciI6NSwic2Vzc2lvbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSklVekkxTmlKOS5leUpwWkNJNklqY3hNVFUwTWpjaUxDSmxiV0ZwYkNJNkltdGxjMmh5YVhKdmFHbDBNREkyUUdkdFlXbHNMbU52YlNJc0ltNWhiV1VpT2lKU2IyaHBkQ0lzSW5SbGJtRnVkRlI1Y0dVaU9pSjFjMlZ5SWl3aWRHVnVZVzUwVG1GdFpTSTZJbkp2ZW1kaGNsOWtZaUlzSW5SbGJtRnVkRWxrSWpvaUlpd2laR2x6Y0c5ellXSnNaU0k2Wm1Gc2MyVjkuRU9iR2Y4bm1Pd050eHd4UTc2SnY4WlhUbnZHVUpDeFFjeFBtLTNkT0JuUSJ9.sE0sbhbT2pxyDX6aCBDfv3a0bwW-j9cG2Ev0bqb3wog",
      "client-service": "Appx",
      "device-type": "origin",
      "referer": "https://rojgarwithankit.co.in/",
      "source": "website",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
      "user-id": env.USER_ID || "14845556"
    });

    try {
      // Make request to the target API
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: headers
      });

      const data = await response.json();

      // Return the response with CORS headers
      return new Response(JSON.stringify(data, null, 2), {
        status: response.status,
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*"
        }
      });
    } catch (error) {
      console.error("Error fetching video:", error);
      
      return new Response(
        JSON.stringify({ 
          status: 500, 
          message: "Internal Server Error",
          error: error.message 
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
  }
};
