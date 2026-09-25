# Cyberind REST API

REST API terpisah untuk Cyberind.id, dirancang untuk deployment ke Vercel.

## Endpoint

- GET /api/
- GET /api/health
- GET /api/v1
- GET /api/v1/tools
- GET /api/v1/tools/url-check
- GET /api/v1/tools/ip-info
- GET /api/v1/tools/headers

## Response

Semua endpoint menggunakan JSON.

## Deploy

Import repository ini ke Vercel, lalu gunakan custom domain:

api.cyberind.my.id

Health check:
https://api.cyberind.my.id/api/health
