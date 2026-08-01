// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = 3000;

// Configuration
const API_BASE_URL = 'https://rozgarapinew.teachx.in';
const BEARER_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjcxMTU0MjciLCJ0aW1lc3RhbXAiOjE3ODU0MTAyNTIsIml2X3ZlciI6OSwic2Vzc2lvbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSklVekkxTmlKOS5leUpwWkNJNklqY3hNVFUwTWpjaUxDSmxiV0ZwYkNJNkltdGxjMmh5YVhKdmFHbDBNREkyUUdkdFlXbHNMbU52YlNJc0ltNWhiV1VpT2lKU2IyaHBkQ0lzSW5SbGJtRnVkRlI1Y0dVaU9pSjFjMlZ5SWl3aWRHVnVZVzUwVG1GdFpTSTZJbkp2ZW1kaGNsOWtZaUlzSW5SbGJtRnVkRWxrSWpvaUlpd2laR2x6Y0c5ellXSnNaU0k2Wm1Gc2MyVjkuRU9iR2Y4bm1Pd050eHd4UTc2SnY4WlhUbnZHVUpDeFFjeFBtLTNkT0JuUSJ9.yAYNEfdfdvE4jZXdr4582bkn3P9B4ss0UnjLO0DwiQ8';

// Alternative tokens (if you have multiple)
const TOKENS = [
    BEARER_TOKEN,
    // Add more tokens here if available
];

// Cache for responses to reduce API calls
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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
        'playUrl'
    ];
    
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
            return value;
        }
    }
    
    // If data is a string and looks like URL
    if (typeof data === 'string' && data.startsWith('http')) {
        return data;
    }
    
    // If data has a result or response wrapper
    if (data.result && typeof data.result === 'string' && data.result.startsWith('http')) {
        return data.result;
    }
    
    if (data.response && typeof data.response === 'string' && data.response.startsWith('http')) {
        return data.response;
    }
    
    // Search recursively for any string that looks like a video URL
    function searchForUrl(obj) {
        if (!obj || typeof obj !== 'object') return null;
        
        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (typeof value === 'string' && value.startsWith('http')) {
                // Check if it's a video URL
                const videoExtensions = ['.mp4', '.m3u8', '.webm', '.avi', '.mov', 'video', 'stream'];
                if (videoExtensions.some(ext => value.toLowerCase().includes(ext))) {
                    return value;
                }
            } else if (typeof value === 'object') {
                const result = searchForUrl(value);
                if (result) return result;
            }
        }
        return null;
    }
    
    return searchForUrl(data);
}

// Multiple fetch strategies
async function fetchWithRetry(url, options, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await axios.get(url, options);
            return response;
        } catch (error) {
            lastError = error;
            console.log(`Attempt ${attempt + 1} failed: ${error.message}`);
            
            // Wait before retry with exponential backoff
            if (attempt < maxRetries - 1) {
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError;
}

// Endpoint to fetch video details with multiple strategies
app.get('/api/fetch-video', async (req, res) => {
    try {
        const { course_id, video_id, force_refresh } = req.query;

        // Validate parameters
        if (!course_id || !video_id) {
            return res.status(400).json({
                success: false,
                message: 'course_id and video_id are required'
            });
        }

        const cacheKey = `${course_id}_${video_id}`;
        
        // Check cache
        if (!force_refresh && cache.has(cacheKey)) {
            const cachedData = cache.get(cacheKey);
            if (Date.now() - cachedData.timestamp < CACHE_DURATION) {
                console.log('✅ Returning cached data');
                return res.status(200).json({
                    success: true,
                    from_cache: true,
                    data: cachedData.data
                });
            }
        }

        console.log(`📡 Fetching video details for course: ${course_id}, video: ${video_id}`);

        // Strategy 1: Try with bearer token
        const targetApiUrl = `${API_BASE_URL}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0&lc_app_api_url=`;

        let response;
        let videoUrl = null;
        let fullData = null;
        let usedStrategy = 'default';

        try {
            // Try with default token
            const options = {
                headers: {
                    'Authorization': `Bearer ${BEARER_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            };

            response = await fetchWithRetry(targetApiUrl, options);
            
            if (response && response.data) {
                videoUrl = extractVideoUrl(response.data);
                fullData = response.data;
                usedStrategy = 'bearer_token';
            }
        } catch (error) {
            console.log('Strategy 1 (Bearer Token) failed:', error.message);
            
            // Strategy 2: Try without token
            try {
                const options = {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 30000
                };
                
                response = await fetchWithRetry(targetApiUrl, options);
                
                if (response && response.data) {
                    videoUrl = extractVideoUrl(response.data);
                    fullData = response.data;
                    usedStrategy = 'no_token';
                }
            } catch (error2) {
                console.log('Strategy 2 (No Token) failed:', error2.message);
                
                // Strategy 3: Try alternative base URL
                try {
                    const altUrls = [
                        `https://rozgarapinew.teachx.in/api/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}`,
                        `https://rozgarapinew.teachx.in/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}`,
                        `https://api.teachx.in/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}`
                    ];
                    
                    for (const altUrl of altUrls) {
                        try {
                            const options = {
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json',
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                                },
                                timeout: 30000
                            };
                            
                            const altResponse = await axios.get(altUrl, options);
                            if (altResponse && altResponse.data) {
                                const altVideoUrl = extractVideoUrl(altResponse.data);
                                if (altVideoUrl) {
                                    videoUrl = altVideoUrl;
                                    fullData = altResponse.data;
                                    usedStrategy = `alternative_url: ${altUrl}`;
                                    break;
                                }
                            }
                        } catch (e) {
                            console.log(`Alternative URL failed: ${altUrl}`);
                        }
                    }
                } catch (error3) {
                    console.log('Strategy 3 (Alternative URLs) failed:', error3.message);
                    
                    // Strategy 4: Try with different parameters
                    try {
                        const paramVariations = [
                            `course_id=${course_id}&video_id=${video_id}&ytflag=1`,
                            `course_id=${course_id}&video_id=${video_id}&folder_wise_course=1`,
                            `course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=1`,
                            `course_id=${course_id}&video_id=${video_id}&ytflag=1&folder_wise_course=0`
                        ];
                        
                        for (const params of paramVariations) {
                            try {
                                const variationUrl = `${API_BASE_URL}/get/fetchVideoDetailsById?${params}&lc_app_api_url=`;
                                const options = {
                                    headers: {
                                        'Authorization': `Bearer ${BEARER_TOKEN}`,
                                        'Content-Type': 'application/json',
                                        'Accept': 'application/json'
                                    },
                                    timeout: 30000
                                };
                                
                                const varResponse = await axios.get(variationUrl, options);
                                if (varResponse && varResponse.data) {
                                    const varVideoUrl = extractVideoUrl(varResponse.data);
                                    if (varVideoUrl) {
                                        videoUrl = varVideoUrl;
                                        fullData = varResponse.data;
                                        usedStrategy = `parameter_variation: ${params}`;
                                        break;
                                    }
                                }
                            } catch (e) {
                                console.log(`Parameter variation failed: ${params}`);
                            }
                        }
                    } catch (error4) {
                        console.log('Strategy 4 (Parameter Variations) failed:', error4.message);
                        
                        // Strategy 5: Try POST method
                        try {
                            const postOptions = {
                                headers: {
                                    'Authorization': `Bearer ${BEARER_TOKEN}`,
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                },
                                timeout: 30000,
                                data: {
                                    course_id: parseInt(course_id),
                                    video_id: parseInt(video_id),
                                    ytflag: 0,
                                    folder_wise_course: 0
                                }
                            };
                            
                            const postResponse = await axios.post(`${API_BASE_URL}/get/fetchVideoDetailsById`, postOptions.data, {
                                headers: postOptions.headers,
                                timeout: postOptions.timeout
                            });
                            
                            if (postResponse && postResponse.data) {
                                videoUrl = extractVideoUrl(postResponse.data);
                                fullData = postResponse.data;
                                usedStrategy = 'post_method';
                            }
                        } catch (error5) {
                            console.log('Strategy 5 (POST Method) failed:', error5.message);
                        }
                    }
                }
            }
        }

        // If we found a video URL, cache and return
        if (videoUrl) {
            const result = {
                video_url: videoUrl,
                full_response: fullData,
                course_id: course_id,
                video_id: video_id,
                used_strategy: usedStrategy,
                timestamp: new Date().toISOString()
            };

            // Cache the result
            cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            console.log(`✅ Successfully fetched video URL using strategy: ${usedStrategy}`);
            
            return res.status(200).json({
                success: true,
                data: result,
                from_cache: false
            });
        }

        // If no video URL found but we have data, try to extract any useful info
        if (fullData) {
            return res.status(200).json({
                success: true,
                data: {
                    message: 'No direct video URL found, but data received',
                    full_response: fullData,
                    course_id: course_id,
                    video_id: video_id,
                    used_strategy: usedStrategy || 'unknown'
                }
            });
        }

        // All strategies failed
        return res.status(404).json({
            success: false,
            message: 'Could not fetch video data with any strategy',
            course_id: course_id,
            video_id: video_id,
            attempted_strategies: ['bearer_token', 'no_token', 'alternative_urls', 'parameter_variations', 'post_method']
        });

    } catch (error) {
        console.error('❌ Error in main fetch:', error.message);
        
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Endpoint to fetch video with POST method
app.post('/api/fetch-video', async (req, res) => {
    try {
        const { course_id, video_id } = req.body;

        if (!course_id || !video_id) {
            return res.status(400).json({
                success: false,
                message: 'course_id and video_id are required in request body'
            });
        }

        // Reuse the GET logic
        const queryRes = await new Promise((resolve, reject) => {
            req.query = { course_id, video_id };
            app.handle(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // If it reaches here, the GET handler already sent response
        // We need to handle this differently - let's just call the fetch logic directly
        const response = await axios.get(`${API_BASE_URL}/get/fetchVideoDetailsById`, {
            params: {
                course_id,
                video_id,
                ytflag: 0,
                folder_wise_course: 0,
                lc_app_api_url: ''
            },
            headers: {
                'Authorization': `Bearer ${BEARER_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        const videoUrl = extractVideoUrl(response.data);

        res.status(200).json({
            success: true,
            video_url: videoUrl,
            data: response.data
        });

    } catch (error) {
        console.error('❌ Error in POST fetch:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch video details',
            error: error.message
        });
    }
});

// Endpoint to clear cache
app.post('/api/clear-cache', (req, res) => {
    cache.clear();
    res.status(200).json({
        success: true,
        message: 'Cache cleared successfully'
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        api_base_url: API_BASE_URL,
        cache_size: cache.size,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message
    });
});

app.listen(port, () => {
    console.log(`\n🚀 Server running on http://localhost:${port}`);
    console.log(`📹 Video fetch endpoint: http://localhost:${port}/api/fetch-video?course_id=YOUR_COURSE_ID&video_id=YOUR_VIDEO_ID`);
    console.log(`✅ Health check: http://localhost:${port}/api/health`);
    console.log(`🗑️ Clear cache: http://localhost:${port}/api/clear-cache`);
    console.log(`🌐 API Base URL: ${API_BASE_URL}`);
    console.log(`📦 Cache duration: ${CACHE_DURATION/1000} seconds\n`);
});
