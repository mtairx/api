const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuration
const API_ENDPOINT = 'https://rwa.video-edustream.indevs.in/';
const DEFAULT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjE0ODczMTMyIiwidGltZXN0YW1wIjoxNzgyMDk3NTA0LCJpdl92ZXIiOjEsInNlc3Npb24iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKcFpDSTZJakUwT0Rjek1UTXlJaXdpWlcxaGFXd2lPaUptZDNaM09YcDFabWhoWW5WQVkyOXlhR0Z6YUM1dVpYUWlMQ0p1WVcxbElqb2lJaXdpZEdWdVlXNTBWSGx3WlNJNkluVnpaWElpTENKMFpXNWhiblJPWVcxbElqb2ljbTk2WjJGeVgyUmlJaXdpZEdWdVlXNTBTV1FpT2lJaUxDSmthWE53YjNOaFlteGxJanBtWVd4elpYMC4zbWxHZWpTNWcwUXhuRjgtOTcyQkpDelI0OTJra2lDbXlFT1J4c3lYSHlZIn0.dItjJ1IZb8a_vWSOOOZLmr-9ootVvhdnIziZo8EoHjk';

// Cache for video data
let videoCache = new Map();

// Endpoint to fetch video details
app.get('/api/video', async (req, res) => {
    try {
        const { course_id, video_id, userid, token } = req.query;

        if (!course_id || !video_id) {
            return res.status(400).json({
                success: false,
                message: 'course_id and video_id are required'
            });
        }

        const authToken = token || DEFAULT_TOKEN;
        const userId = userid || '517077';

        // Check cache first (optional)
        const cacheKey = `${course_id}_${video_id}`;
        if (videoCache.has(cacheKey)) {
            const cached = videoCache.get(cacheKey);
            // Check if cache is still valid (within 5 minutes)
            if (Date.now() - cached.timestamp < 300000) {
                console.log('📦 Returning cached video data');
                return res.json(cached.data);
            }
        }

        // Construct the API URL
        const apiUrl = `${API_ENDPOINT}?endpoint=video-details&token=${authToken}&userid=${userId}&course_id=${course_id}&video_id=${video_id}&id=dev_i32x4oxdw9`;

        console.log(`📡 Fetching video from: ${apiUrl}`);

        const response = await axios.get(apiUrl, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 30000
        });

        // Check if response contains video data
        if (response.data && response.data.status === 200 && response.data.data && response.data.data.length > 0) {
            const videoData = response.data.data[0];
            
            // Extract video URLs with different qualities
            const qualities = videoData.qualities || {};
            const videoUrls = {
                primary: videoData.primary_download_url || qualities['480p'] || qualities['720p'] || qualities['360p'],
                qualities: qualities,
                thumbnail: videoData.thumbnail,
                title: videoData.title,
                pdf_link: videoData.pdf_link,
                pdf_link2: videoData.pdf_link2,
                course_id: videoData.course_id,
                video_id: videoData.video_id
            };

            // Cache the result
            videoCache.set(cacheKey, {
                data: videoUrls,
                timestamp: Date.now()
            });

            console.log('✅ Video fetched successfully');
            return res.json({
                success: true,
                data: videoUrls
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'No video data found',
                raw: response.data
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                message: 'External API error',
                status: error.response.status,
                error: error.response.data
            });
        } else if (error.request) {
            return res.status(503).json({
                success: false,
                message: 'No response from video API'
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
});

// Refresh token endpoint (get fresh video URL)
app.post('/api/refresh', async (req, res) => {
    try {
        const { course_id, video_id, userid, token } = req.body;

        if (!course_id || !video_id) {
            return res.status(400).json({
                success: false,
                message: 'course_id and video_id are required'
            });
        }

        // Clear cache to force refresh
        const cacheKey = `${course_id}_${video_id}`;
        videoCache.delete(cacheKey);

        // Fetch fresh data
        const authToken = token || DEFAULT_TOKEN;
        const userId = userid || '517077';
        
        const apiUrl = `${API_ENDPOINT}?endpoint=video-details&token=${authToken}&userid=${userId}&course_id=${course_id}&video_id=${video_id}&id=dev_i32x4oxdw9`;

        const response = await axios.get(apiUrl, {
            timeout: 30000
        });

        if (response.data && response.data.status === 200 && response.data.data && response.data.data.length > 0) {
            const videoData = response.data.data[0];
            const videoUrls = {
                primary: videoData.primary_download_url || videoData.qualities?.['480p'],
                qualities: videoData.qualities || {},
                thumbnail: videoData.thumbnail,
                title: videoData.title
            };

            // Cache new data
            videoCache.set(cacheKey, {
                data: videoUrls,
                timestamp: Date.now()
            });

            return res.json({
                success: true,
                data: videoUrls
            });
        }

        return res.status(404).json({
            success: false,
            message: 'Failed to refresh video data'
        });

    } catch (error) {
        console.error('❌ Refresh error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh video',
            error: error.message
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        cacheSize: videoCache.size
    });
});

app.listen(port, () => {
    console.log(`\n🚀 Server running on http://localhost:${port}`);
    console.log(`🎬 Video endpoint: http://localhost:${port}/api/video?course_id=582&video_id=308137`);
    console.log(`🔄 Refresh endpoint: http://localhost:${port}/api/refresh`);
    console.log(`✅ Health check: http://localhost:${port}/api/health\n`);
});
