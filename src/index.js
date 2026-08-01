// index.js - Cloudflare Worker with enhanced debugging and strategies

// Configuration
const API_BASE_URL = 'https://rozgarapinew.teachx.in';
const BEARER_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjcxMTU0MjciLCJ0aW1lc3RhbXAiOjE3ODU0MTAyNTIsIml2X3ZlciI6OSwic2Vzc2lvbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSklVekkxTmlKOS5leUpwWkNJNklqY3hNVFUwTWpjaUxDSmxiV0ZwYkNJNkltdGxjMmh5YVhKdmFHbDBNREkyUUdkdFlXbHNMbU52YlNJc0ltNWhiV1VpT2lKU2IyaHBkQ0lzSW5SbGJtRnVkRlI1Y0dVaU9pSjFjMlZ5SWl3aWRHVnVZVzUwVG1GdFpTSTZJbkp2ZW1kaGNsOWtZaUlzSW5SbGJtRnVkRWxrSWpvaUlpd2laR2x6Y0c5ellXSnNaU0k2Wm1Gc2MyVjkuRU9iR2Y4bm1Pd050eHd4UTc2SnY4WlhUbnZHVUpDeFFjeFBtLTNkT0JuUSJ9.yAYNEfdfdvE4jZXdr4582bkn3P9B4ss0UnjLO0DwiQ8';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
};

// Enhanced video URL extraction with more patterns
function extractVideoUrl(data, debug = false) {
    if (!data) return null;
    
    // Log for debugging
    if (debug) console.log('🔍 Searching for video URL in:', JSON.stringify(data).substring(0, 500));
    
    // If data is a string, try to parse it
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return extractVideoUrl(parsed, debug);
        } catch (e) {
            // Check if it's a direct URL
            if (data.startsWith('http') && (data.includes('.mp4') || data.includes('m3u8') || data.includes('video'))) {
                return data;
            }
            return null;
        }
    }
    
    // If data is an array, check each item
    if (Array.isArray(data)) {
        for (const item of data) {
            const result = extractVideoUrl(item, debug);
            if (result) return result;
        }
        return null;
    }
    
    // If data is an object, search through it
    if (typeof data === 'object' && data !== null) {
        // Check common paths first
        const commonPaths = [
            'video_url', 'url', 'videoLink', 'VideoURL', 'URL',
            'video', 'source', 'src', 'href', 'link', 'file_url',
            'fileUrl', 'stream_url', 'streamUrl', 'media_url', 'mediaUrl',
            'play_url', 'playUrl', 'content', 'data', 'result', 'response'
        ];
        
        // Check for direct keys
        for (const key of commonPaths) {
            if (data[key] !== undefined && data[key] !== null) {
                const value = data[key];
                if (typeof value === 'string' && value.startsWith('http')) {
                    if (value.includes('.mp4') || value.includes('m3u8') || value.includes('video') || value.includes('stream')) {
                        if (debug) console.log(`✅ Found video URL in key: ${key}`);
                        return value;
                    }
                }
                // Recursively check nested objects
                if (typeof value === 'object') {
                    const result = extractVideoUrl(value, debug);
                    if (result) return result;
                }
            }
        }
        
        // Check nested paths with dot notation
        const nestedPaths = [
            'data.video_url', 'data.url', 'data.video', 'data.data.video_url',
            'result.video_url', 'result.url', 'response.video_url',
            'content.video_url', 'content.url', 'video.url', 'video.source'
        ];
        
        for (const path of nestedPaths) {
            const parts = path.split('.');
            let value = data;
            let found = true;
            
            for (const part of parts) {
                if (value && typeof value === 'object' && part in value) {
                    value = value[part];
                } else {
                    found = false;
                    break;
                }
            }
            
            if (found && typeof value === 'string' && value.startsWith('http')) {
                if (debug) console.log(`✅ Found video URL in nested path: ${path}`);
                return value;
            }
        }
        
        // Deep recursive search for any URL
        function deepSearch(obj, path = '') {
            if (!obj || typeof obj !== 'object') return null;
            
            for (const key of Object.keys(obj)) {
                const value = obj[key];
                const currentPath = path ? `${path}.${key}` : key;
                
                if (typeof value === 'string' && value.startsWith('http')) {
                    // Check if it looks like a video URL
                    const videoIndicators = ['.mp4', '.m3u8', '.webm', '.avi', '.mov', 'video', 'stream', 'play', 'media'];
                    if (videoIndicators.some(ind => value.toLowerCase().includes(ind))) {
                        if (debug) console.log(`✅ Found video URL at path: ${currentPath}`);
                        return value;
                    }
                    // Also return any URL if we can't find a better one
                    if (!videoUrl && value.startsWith('http')) {
                        videoUrl = value;
                    }
                } else if (typeof value === 'object' && value !== null) {
                    const result = deepSearch(value, currentPath);
                    if (result) return result;
                }
            }
            return null;
        }
        
        let videoUrl = null;
        const result = deepSearch(data);
        if (result) return result;
    }
    
    return null;
}

// Enhanced fetch function with more details
async function fetchWithDetails(url, options = {}) {
    const startTime = Date.now();
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                ...options.headers
            }
        });
        
        const duration = Date.now() - startTime;
        const contentType = response.headers.get('content-type') || '';
        let data = null;
        
        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = { raw: text };
            }
        }
        
        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers),
            data,
            duration,
            url
        };
    } catch (error) {
        return {
            ok: false,
            error: error.message,
            duration: Date.now() - startTime,
            url
        };
    }
}

// Main fetch function with enhanced strategies
async function fetchWithStrategies(course_id, video_id, debug = false) {
    const results = [];
    let videoUrl = null;
    let fullData = null;
    let usedStrategy = null;
    
    // Strategy 1: Bearer token with standard params
    if (debug) console.log('🔄 Strategy 1: Bearer token with standard params');
    try {
        const url = `${API_BASE_URL}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0&lc_app_api_url=`;
        const result = await fetchWithDetails(url, {
            headers: {
                'Authorization': `Bearer ${BEARER_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        results.push({ strategy: 'bearer_token', ...result });
        
        if (result.ok && result.data) {
            const urlFound = extractVideoUrl(result.data, debug);
            if (urlFound) {
                videoUrl = urlFound;
                fullData = result.data;
                usedStrategy = 'bearer_token';
                if (debug) console.log(`✅ Found video URL with bearer token: ${videoUrl}`);
            }
        }
    } catch (error) {
        if (debug) console.log(`❌ Strategy 1 failed: ${error.message}`);
    }
    
    // Strategy 2: No token
    if (!videoUrl) {
        if (debug) console.log('🔄 Strategy 2: No token');
        try {
            const url = `${API_BASE_URL}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0&lc_app_api_url=`;
            const result = await fetchWithDetails(url, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            results.push({ strategy: 'no_token', ...result });
            
            if (result.ok && result.data) {
                const urlFound = extractVideoUrl(result.data, debug);
                if (urlFound) {
                    videoUrl = urlFound;
                    fullData = result.data;
                    usedStrategy = 'no_token';
                    if (debug) console.log(`✅ Found video URL without token: ${videoUrl}`);
                }
            }
        } catch (error) {
            if (debug) console.log(`❌ Strategy 2 failed: ${error.message}`);
        }
    }
    
    // Strategy 3: Different parameter combinations
    if (!videoUrl) {
        if (debug) console.log('🔄 Strategy 3: Different parameter combinations');
        const variations = [
            { ytflag: 1, folder_wise_course: 0 },
            { ytflag: 0, folder_wise_course: 1 },
            { ytflag: 1, folder_wise_course: 1 },
            { ytflag: 0, folder_wise_course: 0, lc_app_api_url: '1' }
        ];
        
        for (const params of variations) {
            try {
                const paramString = new URLSearchParams({
                    course_id,
                    video_id,
                    ...params
                }).toString();
                const url = `${API_BASE_URL}/get/fetchVideoDetailsById?${paramString}`;
                const result = await fetchWithDetails(url, {
                    headers: {
                        'Authorization': `Bearer ${BEARER_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                });
                results.push({ strategy: `params_${JSON.stringify(params)}`, ...result });
                
                if (result.ok && result.data) {
                    const urlFound = extractVideoUrl(result.data, debug);
                    if (urlFound) {
                        videoUrl = urlFound;
                        fullData = result.data;
                        usedStrategy = `parameter_variation_${JSON.stringify(params)}`;
                        if (debug) console.log(`✅ Found video URL with params: ${videoUrl}`);
                        break;
                    }
                }
            } catch (error) {
                continue;
            }
        }
    }
    
    // Strategy 4: Alternative API endpoints
    if (!videoUrl) {
        if (debug) console.log('🔄 Strategy 4: Alternative API endpoints');
        const endpoints = [
            '/api/get/fetchVideoDetailsById',
            '/fetchVideoDetailsById',
            '/get/videoDetails',
            '/api/video/details',
            '/video/details'
        ];
        
        for (const endpoint of endpoints) {
            try {
                const url = `${API_BASE_URL}${endpoint}?course_id=${course_id}&video_id=${video_id}`;
                const result = await fetchWithDetails(url, {
                    headers: {
                        'Authorization': `Bearer ${BEARER_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                });
                results.push({ strategy: `endpoint_${endpoint}`, ...result });
                
                if (result.ok && result.data) {
                    const urlFound = extractVideoUrl(result.data, debug);
                    if (urlFound) {
                        videoUrl = urlFound;
                        fullData = result.data;
                        usedStrategy = `alternative_endpoint_${endpoint}`;
                        if (debug) console.log(`✅ Found video URL with alternative endpoint: ${videoUrl}`);
                        break;
                    }
                }
            } catch (error) {
                continue;
            }
        }
    }
    
    // Strategy 5: POST method with different body formats
    if (!videoUrl) {
        if (debug) console.log('🔄 Strategy 5: POST method');
        const bodyFormats = [
            { course_id: parseInt(course_id), video_id: parseInt(video_id), ytflag: 0, folder_wise_course: 0 },
            { course_id: course_id, video_id: video_id, ytflag: '0', folder_wise_course: '0' },
            { course_id: parseInt(course_id), video_id: parseInt(video_id) },
            { id: parseInt(course_id), video: parseInt(video_id) }
        ];
        
        for (const body of bodyFormats) {
            try {
                const url = `${API_BASE_URL}/get/fetchVideoDetailsById`;
                const result = await fetchWithDetails(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${BEARER_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });
                results.push({ strategy: `post_${JSON.stringify(body)}`, ...result });
                
                if (result.ok && result.data) {
                    const urlFound = extractVideoUrl(result.data, debug);
                    if (urlFound) {
                        videoUrl = urlFound;
                        fullData = result.data;
                        usedStrategy = `post_method_${JSON.stringify(body)}`;
                        if (debug) console.log(`✅ Found video URL with POST: ${videoUrl}`);
                        break;
                    }
                }
            } catch (error) {
                continue;
            }
        }
    }
    
    // Strategy 6: Try without course_id and video_id as query, use path instead
    if (!videoUrl) {
        if (debug) console.log('🔄 Strategy 6: Path-based URL');
        const pathFormats = [
            `/video/${video_id}`,
            `/course/${course_id}/video/${video_id}`,
            `/api/video/${video_id}`,
            `/get/video/${video_id}`
        ];
        
        for (const path of pathFormats) {
            try {
                const url = `${API_BASE_URL}${path}`;
                const result = await fetchWithDetails(url, {
                    headers: {
                        'Authorization': `Bearer ${BEARER_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                });
                results.push({ strategy: `path_${path}`, ...result });
                
                if (result.ok && result.data) {
                    const urlFound = extractVideoUrl(result.data, debug);
                    if (urlFound) {
                        videoUrl = urlFound;
                        fullData = result.data;
                        usedStrategy = `path_based_${path}`;
                        if (debug) console.log(`✅ Found video URL with path: ${videoUrl}`);
                        break;
                    }
                }
            } catch (error) {
                continue;
            }
        }
    }
    
    // Strategy 7: Try with additional headers (like session, referer, etc.)
    if (!videoUrl) {
        if (debug) console.log('🔄 Strategy 7: Additional headers');
        const headerSets = [
            { 'Referer': 'https://rozgarapinew.teachx.in/', 'Origin': 'https://rozgarapinew.teachx.in' },
            { 'X-Requested-With': 'XMLHttpRequest' },
            { 'Accept': 'application/json, text/plain, */*' }
        ];
        
        for (const headers of headerSets) {
            try {
                const url = `${API_BASE_URL}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0&lc_app_api_url=`;
                const result = await fetchWithDetails(url, {
                    headers: {
                        'Authorization': `Bearer ${BEARER_TOKEN}`,
                        'Content-Type': 'application/json',
                        ...headers
                    }
                });
                results.push({ strategy: `headers_${Object.keys(headers).join('_')}`, ...result });
                
                if (result.ok && result.data) {
                    const urlFound = extractVideoUrl(result.data, debug);
                    if (urlFound) {
                        videoUrl = urlFound;
                        fullData = result.data;
                        usedStrategy = `additional_headers`;
                        if (debug) console.log(`✅ Found video URL with additional headers: ${videoUrl}`);
                        break;
                    }
                }
            } catch (error) {
                continue;
            }
        }
    }
    
    // If we found a video URL, return success
    if (videoUrl) {
        return {
            success: true,
            videoUrl,
            fullData,
            usedStrategy,
            results: debug ? results : undefined
        };
    }
    
    // Return all results for debugging
    return {
        success: false,
        results,
        message: 'All strategies failed'
    };
}

// Cloudflare Worker handler
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;
        const debug = url.searchParams.has('debug') || url.searchParams.has('verbose');
        
        // Handle CORS preflight
        if (method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders
            });
        }
        
        // Health check
        if (path === '/api/health' && method === 'GET') {
            return new Response(JSON.stringify({
                success: true,
                data: {
                    status: 'OK',
                    api_base_url: API_BASE_URL,
                    version: '1.0.0',
                    timestamp: new Date().toISOString()
                }
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }
        
        // Fetch video endpoint
        if (path === '/api/fetch-video') {
            try {
                let course_id, video_id;
                
                if (method === 'GET') {
                    course_id = url.searchParams.get('course_id');
                    video_id = url.searchParams.get('video_id');
                } else if (method === 'POST') {
                    const body = await request.json().catch(() => ({}));
                    course_id = body.course_id;
                    video_id = body.video_id;
                } else {
                    return new Response(JSON.stringify({
                        success: false,
                        message: 'Method not allowed',
                        timestamp: new Date().toISOString()
                    }), {
                        status: 405,
                        headers: {
                            'Content-Type': 'application/json',
                            ...corsHeaders
                        }
                    });
                }
                
                // Validate parameters
                if (!course_id || !video_id) {
                    return new Response(JSON.stringify({
                        success: false,
                        message: 'course_id and video_id are required',
                        timestamp: new Date().toISOString()
                    }), {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            ...corsHeaders
                        }
                    });
                }
                
                console.log(`📡 Fetching video: course=${course_id}, video=${video_id}`);
                
                // Use cached data if available
                const cacheKey = `video_${course_id}_${video_id}`;
                let cached = null;
                if (env.VIDEO_CACHE) {
                    cached = await env.VIDEO_CACHE.get(cacheKey, 'json');
                }
                
                if (cached && !url.searchParams.has('force_refresh')) {
                    console.log('✅ Returning cached data');
                    return new Response(JSON.stringify({
                        success: true,
                        data: cached,
                        from_cache: true,
                        timestamp: new Date().toISOString()
                    }), {
                        headers: {
                            'Content-Type': 'application/json',
                            ...corsHeaders
                        }
                    });
                }
                
                // Fetch with multiple strategies
                const result = await fetchWithStrategies(course_id, video_id, debug);
                
                if (result.success && result.videoUrl) {
                    const responseData = {
                        video_url: result.videoUrl,
                        full_response: result.fullData,
                        course_id: course_id,
                        video_id: video_id,
                        used_strategy: result.usedStrategy,
                        from_cache: false,
                        debug_info: debug ? result.results : undefined
                    };
                    
                    // Cache the result
                    if (env.VIDEO_CACHE) {
                        await env.VIDEO_CACHE.put(cacheKey, JSON.stringify(responseData), {
                            expirationTtl: 300 // 5 minutes
                        });
                    }
                    
                    return new Response(JSON.stringify({
                        success: true,
                        data: responseData,
                        timestamp: new Date().toISOString()
                    }), {
                        headers: {
                            'Content-Type': 'application/json',
                            ...corsHeaders
                        }
                    });
                } else {
                    // Return detailed error with all attempt results
                    const errorData = {
                        success: false,
                        message: 'Could not fetch video data with any strategy',
                        error: {
                            course_id,
                            video_id,
                            attempted_strategies: result.results ? result.results.map(r => r.strategy) : [],
                            strategy_results: debug ? result.results : undefined
                        },
                        timestamp: new Date().toISOString()
                    };
                    
                    // Log error for debugging
                    console.error('❌ All strategies failed:', JSON.stringify(errorData, null, 2));
                    
                    return new Response(JSON.stringify(errorData), {
                        status: 404,
                        headers: {
                            'Content-Type': 'application/json',
                            ...corsHeaders
                        }
                    });
                }
                
            } catch (error) {
                console.error('❌ Error:', error);
                return new Response(JSON.stringify({
                    success: false,
                    message: 'Internal server error',
                    error: error.message,
                    timestamp: new Date().toISOString()
                }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                });
            }
        }
        
        // Test endpoint to see what the API returns
        if (path === '/api/test' && method === 'GET') {
            try {
                const course_id = url.searchParams.get('course_id') || '571';
                const video_id = url.searchParams.get('video_id') || '297927';
                
                // Direct fetch to see raw response
                const testUrl = `${API_BASE_URL}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0&lc_app_api_url=`;
                const response = await fetch(testUrl, {
                    headers: {
                        'Authorization': `Bearer ${BEARER_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const text = await response.text();
                let json = null;
                try {
                    json = JSON.parse(text);
                } catch (e) {
                    // Not JSON
                }
                
                return new Response(JSON.stringify({
                    success: true,
                    data: {
                        url: testUrl,
                        status: response.status,
                        statusText: response.statusText,
                        headers: Object.fromEntries(response.headers),
                        body_text: text.substring(0, 1000),
                        body_json: json,
                        video_url_extracted: json ? extractVideoUrl(json, true) : null
                    }
                }, null, 2), {
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                });
            } catch (error) {
                return new Response(JSON.stringify({
                    success: false,
                    error: error.message
                }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                });
            }
        }
        
        // 404 for other paths
        return new Response(JSON.stringify({
            success: false,
            message: 'Endpoint not found',
            timestamp: new Date().toISOString()
        }), {
            status: 404,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
};
