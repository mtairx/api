// index.js - Cloudflare Worker

// Configuration
const API_BASE_URL = 'https://rozgarapinew.teachx.in';
const BEARER_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjcxMTU0MjciLCJ0aW1lc3RhbXAiOjE3ODU0MTAyNTIsIml2X3ZlciI6OSwic2Vzc2lvbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSklVekkxTmlKOS5leUpwWkNJNklqY3hNVFUwTWpjaUxDSmxiV0ZwYkNJNkltdGxjMmh5YVhKdmFHbDBNREkyUUdkdFlXbHNMbU52YlNJc0ltNWhiV1VpT2lKU2IyaHBkQ0lzSW5SbGJtRnVkRlI1Y0dVaU9pSjFjMlZ5SWl3aWRHVnVZVzUwVG1GdFpTSTZJbkp2ZW1kaGNsOWtZaUlzSW5SbGJtRnVkRWxrSWpvaUlpd2laR2x6Y0c5ellXSnNaU0k2Wm1Gc2MyVjkuRU9iR2Y4bm1Pd050eHd4UTc2SnY4WlhUbnZHVUpDeFFjeFBtLTNkT0JuUSJ9.yAYNEfdfdvE4jZXdr4582bkn3P9B4ss0UnjLO0DwiQ8';

// CORS headers for all responses
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
};

// Helper function to extract video URL from various response formats
function extractVideoUrl(data) {
    if (!data) return null;
    
    // Try all possible paths
    const paths = [
        'video_url',
        'url',
        'data.video_url',
        'data.url',
        'data.data.video_url',
        'data.data.url',
        'videoLink',
        'video.url',
        'VideoURL',
        'URL',
        'video',
        'content.video_url',
        'content.url',
        'file_url',
        'fileUrl',
        'stream_url',
        'streamUrl',
        'media_url',
        'mediaUrl',
        'source_url',
        'sourceUrl',
        'play_url',
        'playUrl',
        'result',
        'response',
        'link',
        'src',
        'source',
        'href'
    ];
    
    // If data is a string, try to parse it
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return extractVideoUrl(parsed);
        } catch (e) {
            // If it's a URL string
            if (data.startsWith('http')) {
                return data;
            }
            return null;
        }
    }
    
    // If data is an array, check each item
    if (Array.isArray(data)) {
        for (const item of data) {
            const result = extractVideoUrl(item);
            if (result) return result;
        }
        return null;
    }
    
    // If data is an object, search through it
    if (typeof data === 'object' && data !== null) {
        // Check direct paths first
        for (const path of paths) {
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
            
            if (found && value && typeof value === 'string' && value.startsWith('http')) {
                // Check if it's a video URL
                const videoExtensions = ['.mp4', '.m3u8', '.webm', '.avi', '.mov', '.mkv', 'video', 'stream', 'play'];
                if (videoExtensions.some(ext => value.toLowerCase().includes(ext))) {
                    return value;
                }
            }
        }
        
        // Recursively search all values
        for (const key of Object.keys(data)) {
            const value = data[key];
            if (typeof value === 'object' && value !== null) {
                const result = extractVideoUrl(value);
                if (result) return result;
            } else if (typeof value === 'string' && value.startsWith('http')) {
                const videoExtensions = ['.mp4', '.m3u8', '.webm', '.avi', '.mov', '.mkv', 'video', 'stream', 'play'];
                if (videoExtensions.some(ext => value.toLowerCase().includes(ext))) {
                    return value;
                }
            }
        }
    }
    
    return null;
}

// Helper to create response
function createResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
        }
    });
}

// Helper for error responses
function errorResponse(message, status = 400, details = null) {
    return createResponse({
        success: false,
        message: message,
        error: details,
        timestamp: new Date().toISOString()
    }, status);
}

// Helper for success responses
function successResponse(data, meta = {}) {
    return createResponse({
        success: true,
        data: data,
        ...meta,
        timestamp: new Date().toISOString()
    });
}

// Main fetch function with multiple strategies
async function fetchWithStrategies(course_id, video_id) {
    const strategies = [
        // Strategy 1: Bearer token with all params
        async () => {
            const url = `${API_BASE_URL}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0&lc_app_api_url=`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${BEARER_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (response.ok) {
                const data = await response.json();
                const videoUrl = extractVideoUrl(data);
                return { data, videoUrl, strategy: 'bearer_token' };
            }
            throw new Error(`Status: ${response.status}`);
        },
        
        // Strategy 2: No token
        async () => {
            const url = `${API_BASE_URL}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0&lc_app_api_url=`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (response.ok) {
                const data = await response.json();
                const videoUrl = extractVideoUrl(data);
                return { data, videoUrl, strategy: 'no_token' };
            }
            throw new Error(`Status: ${response.status}`);
        },
        
        // Strategy 3: Alternative URL structure
        async () => {
            const altUrls = [
                `https://rozgarapinew.teachx.in/api/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}`,
                `https://rozgarapinew.teachx.in/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}`,
                `https://api.teachx.in/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}`
            ];
            
            for (const url of altUrls) {
                try {
                    const response = await fetch(url, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        const videoUrl = extractVideoUrl(data);
                        if (videoUrl) {
                            return { data, videoUrl, strategy: `alternative_url` };
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
            throw new Error('All alternative URLs failed');
        },
        
        // Strategy 4: Different parameter combinations
        async () => {
            const paramVariations = [
                `course_id=${course_id}&video_id=${video_id}&ytflag=1`,
                `course_id=${course_id}&video_id=${video_id}&folder_wise_course=1`,
                `course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=1`,
                `course_id=${course_id}&video_id=${video_id}&ytflag=1&folder_wise_course=0`,
                `course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0&lc_app_api_url=1`
            ];
            
            for (const params of paramVariations) {
                try {
                    const url = `${API_BASE_URL}/get/fetchVideoDetailsById?${params}`;
                    const response = await fetch(url, {
                        headers: {
                            'Authorization': `Bearer ${BEARER_TOKEN}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        const videoUrl = extractVideoUrl(data);
                        if (videoUrl) {
                            return { data, videoUrl, strategy: `parameter_variation` };
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
            throw new Error('All parameter variations failed');
        },
        
        // Strategy 5: POST method
        async () => {
            const url = `${API_BASE_URL}/get/fetchVideoDetailsById`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${BEARER_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    course_id: parseInt(course_id),
                    video_id: parseInt(video_id),
                    ytflag: 0,
                    folder_wise_course: 0,
                    lc_app_api_url: ''
                })
            });
            if (response.ok) {
                const data = await response.json();
                const videoUrl = extractVideoUrl(data);
                return { data, videoUrl, strategy: 'post_method' };
            }
            throw new Error(`Status: ${response.status}`);
        },
        
        // Strategy 6: Try with different base URLs
        async () => {
            const baseUrls = [
                'https://rozgarapinew.teachx.in',
                'https://rozgarapi.teachx.in',
                'https://api.teachx.in'
            ];
            
            for (const baseUrl of baseUrls) {
                try {
                    const url = `${baseUrl}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0&lc_app_api_url=`;
                    const response = await fetch(url, {
                        headers: {
                            'Authorization': `Bearer ${BEARER_TOKEN}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        const videoUrl = extractVideoUrl(data);
                        if (videoUrl) {
                            return { data, videoUrl, strategy: `different_base_url` };
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
            throw new Error('All base URLs failed');
        },
        
        // Strategy 7: Try without any parameters (just raw)
        async () => {
            const url = `${API_BASE_URL}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                const videoUrl = extractVideoUrl(data);
                return { data, videoUrl, strategy: 'minimal_params' };
            }
            throw new Error(`Status: ${response.status}`);
        }
    ];
    
    // Try each strategy
    for (const strategy of strategies) {
        try {
            const result = await strategy();
            if (result.videoUrl) {
                return {
                    ...result,
                    success: true
                };
            }
        } catch (error) {
            console.log(`Strategy failed: ${error.message}`);
            continue;
        }
    }
    
    return {
        success: false,
        message: 'All strategies failed'
    };
}

// Cloudflare Worker handler
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;
        
        // Handle CORS preflight
        if (method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders
            });
        }
        
        // Health check
        if (path === '/api/health' && method === 'GET') {
            return successResponse({
                status: 'OK',
                api_base_url: API_BASE_URL,
                version: '1.0.0',
                timestamp: new Date().toISOString()
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
                    return errorResponse('Method not allowed', 405);
                }
                
                // Validate parameters
                if (!course_id || !video_id) {
                    return errorResponse('course_id and video_id are required', 400);
                }
                
                console.log(`📡 Fetching video: course=${course_id}, video=${video_id}`);
                
                // Use cached data if available
                const cacheKey = `video_${course_id}_${video_id}`;
                const cached = await env.VIDEO_CACHE?.get(cacheKey, 'json');
                
                if (cached && !url.searchParams.has('force_refresh')) {
                    console.log('✅ Returning cached data');
                    return successResponse(cached, { from_cache: true });
                }
                
                // Fetch with multiple strategies
                const result = await fetchWithStrategies(course_id, video_id);
                
                if (result.success && result.videoUrl) {
                    const responseData = {
                        video_url: result.videoUrl,
                        full_response: result.data,
                        course_id: course_id,
                        video_id: video_id,
                        used_strategy: result.strategy,
                        from_cache: false
                    };
                    
                    // Cache the result (if KV binding exists)
                    if (env.VIDEO_CACHE) {
                        await env.VIDEO_CACHE.put(cacheKey, JSON.stringify(responseData), {
                            expirationTtl: 300 // 5 minutes
                        });
                    }
                    
                    return successResponse(responseData);
                } else if (result.data) {
                    // Got data but no video URL
                    return successResponse({
                        message: 'No direct video URL found, but data received',
                        full_response: result.data,
                        course_id: course_id,
                        video_id: video_id,
                        used_strategy: result.strategy || 'unknown'
                    });
                } else {
                    // All strategies failed
                    return errorResponse('Could not fetch video data with any strategy', 404, {
                        course_id,
                        video_id,
                        attempted_strategies: ['bearer_token', 'no_token', 'alternative_urls', 'parameter_variations', 'post_method', 'different_base_urls', 'minimal_params']
                    });
                }
                
            } catch (error) {
                console.error('❌ Error:', error);
                return errorResponse('Internal server error', 500, error.message);
            }
        }
        
        // Clear cache
        if (path === '/api/clear-cache' && method === 'POST') {
            if (env.VIDEO_CACHE) {
                // Can't clear all keys in Workers KV without a list
                return successResponse({
                    message: 'Cache cleared for specific keys. Use ?key=video_xxx to clear specific.'
                });
            }
            return successResponse({
                message: 'No cache configured'
            });
        }
        
        // 404 for other paths
        return errorResponse('Endpoint not found', 404);
    }
};
