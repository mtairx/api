# Video Proxy Cloudflare Worker

A Cloudflare Worker that proxies requests to the TeachX video API with CORS support.

## Features

- Proxies video details requests to `rozgarapinew.teachx.in`
- Adds CORS headers for cross-origin requests
- Handles OPTIONS preflight requests
- Configurable authentication via environment variables
- Error handling and logging

## Endpoints

### GET /get-video

Fetches video details by course ID and video ID.

**Parameters:**
- `course_id` (required) - The course ID
- `video_id` (required) - The video ID

**Example:**
