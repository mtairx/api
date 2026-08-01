// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = 3000;

// Configuration
const API_BASE_URL = 'https://rozgarapinew.teachx.in';
const BEARER_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjcxMTU0MjciLCJ0aW1lc3RhbXAiOjE3ODU0MTAyNTIsIml2X3ZlciI6OSwic2Vzc2lvbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSklVekkxTmlKOS5leUpwWkNJNklqY3hNVFUwTWpjaUxDSmxiV0ZwYkNJNkltdGxjMmh5YVhKdmFHbDBNREkyUUdkdFlXbHNMbU52YlNJc0ltNWhiV1VpT2lKU2IyaHBkQ0lzSW5SbGJtRnVkRlI1Y0dVaU9pSjFjMlZ5SWl3aWRHVnVZVzUwVG1GdFpTSTZJbkp2ZW1kaGNsOWtZaUlzSW5SbGJtRnVkRWxrSWpvaUlpd2laR2x6Y0c5ellXSnNaU0k2Wm1Gc2MyVjkuRU9iR2Y4bm1Pd050eHd4UTc2SnY4WlhUbnZHVUpDeFFjeFBtLTNkT0JuUSJ9.yAYNEfdfdvE4jZXdr4582bkn3P9B4ss0UnjLO0DwiQ8';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Endpoint to fetch video details
app.get('/api/fetch-video', async (req, res) => {
    try {
        const { course_id, video_id } = req.query;

        // Validate parameters
        if (!course_id || !video_id) {
            return res.status(400).json({
                success: false,
                message: 'course_id and video_id are required'
            });
        }

        // Construct the target API URL with your base URL
        const targetApiUrl = `${API_BASE_URL}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0&lc_app_api_url=`;

        console.log(`📡 Fetching video details from: ${targetApiUrl}`);
        console.log(`📚 Course ID: ${course_id}, Video ID: ${video_id}`);

        // Make request to the target API with bearer token
        const response = await axios.get(targetApiUrl, {
            headers: {
                'Authorization': `Bearer ${BEARER_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 30000 // 30 seconds timeout
        });

        console.log('✅ API Response received');

        // Extract video URL from response
        let videoUrl = null;
        let videoData = response.data;

        // Try different possible paths for video URL
        if (response.data) {
            videoUrl = response.data.video_url || 
                      response.data.url || 
                      response.data.data?.video_url ||
                      response.data.data?.url ||
                      response.data.videoLink ||
                      response.data.video?.url ||
                      response.data.VideoURL ||
                      response.data.URL;
        }

        // Send success response
        res.status(200).json({
            success: true,
            data: {
                video_url: videoUrl,
                full_response: response.data,
                course_id: course_id,
                video_id: video_id,
                api_url: targetApiUrl
            }
        });

    } catch (error) {
        console.error('❌ Error fetching video details:', error.message);
        
        // Detailed error handling
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
            
            res.status(error.response.status).json({
                success: false,
                message: 'External API error',
                status: error.response.status,
                error: error.response.data
            });
        } else if (error.request) {
            console.error('No response received');
            res.status(503).json({
                success: false,
                message: 'No response from external API. Please check if the API is accessible.',
                error: error.message
            });
        } else {
            console.error('Request setup error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
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

        const targetApiUrl = `${API_BASE_URL}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0&lc_app_api_url=`;

        const response = await axios.get(targetApiUrl, {
            headers: {
                'Authorization': `Bearer ${BEARER_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        let videoUrl = response.data?.video_url || 
                      response.data?.url || 
                      response.data?.data?.video_url;

        res.status(200).json({
            success: true,
            video_url: videoUrl,
            data: response.data
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch video details',
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        api_base_url: API_BASE_URL,
        timestamp: new Date().toISOString()
    });
});

app.listen(port, () => {
    console.log(`\n🚀 Server running on http://localhost:${port}`);
    console.log(`📹 Video fetch endpoint: http://localhost:${port}/api/fetch-video?course_id=YOUR_COURSE_ID&video_id=YOUR_VIDEO_ID`);
    console.log(`✅ Health check: http://localhost:${port}/api/health`);
    console.log(`🌐 API Base URL: ${API_BASE_URL}\n`);
});
