# Cyberind Nmap REST API

REST API wrapper for Nmap intended for authorized infrastructure/security testing.

## Run with Docker

Set a strong API key and an explicit allowlist:

NMAP_API_KEY=change-this
NMAP_ALLOWED_TARGETS=192.168.1.1,192.168.1.10

Then:

docker build -t cyberind-nmap-api .
docker run --rm -p 3000:3000 -e NMAP_API_KEY="$NMAP_API_KEY" -e NMAP_ALLOWED_TARGETS="$NMAP_ALLOWED_TARGETS" cyberind-nmap-api

## Endpoints

GET /api/health
GET /api/v1/nmap
POST /api/v1/nmap/scan

POST body:
{"target":"192.168.1.10","profile":"quick"}

Profiles:
- quick: TCP top 100 ports
- service: top 100 TCP ports + service/version detection
- full: all TCP ports + service/version detection

Header:
X-API-Key: your-key

The API deliberately does not accept arbitrary Nmap command-line arguments. Only allowlisted targets and predefined scan profiles are accepted.