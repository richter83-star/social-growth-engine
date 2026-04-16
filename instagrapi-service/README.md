# Instagrapi Microservice

A lightweight FastAPI service that wraps [instagrapi](https://github.com/subzeroid/instagrapi) to provide Instagram private API access for the Social Growth Engine backend.

## Running

```bash
cd instagrapi-service
pip install -r requirements.txt
INSTAGRAPI_API_KEY=instagrapi-internal-key python main.py
```

The service starts on **port 8001** by default.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `INSTAGRAPI_PORT` | `8001` | Port to listen on |
| `INSTAGRAPI_API_KEY` | `instagrapi-internal-key` | Shared secret for the `x-api-key` header |
| `INSTAGRAPI_SESSION_DIR` | `/tmp/instagrapi-sessions` | Directory for persisting login sessions |

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe — returns active sessions |
| `POST` | `/login` | Login with username/password (optional 2FA code) |
| `DELETE` | `/logout/{username}` | Logout and clear session |
| `GET` | `/user/{username}?logged_in_as=X` | Get profile info |
| `GET` | `/user/{username}/posts?logged_in_as=X&limit=12` | Get recent posts |
| `GET` | `/media/{media_id}/insights?logged_in_as=X` | Get media insights (own posts only) |

All endpoints except `/health` require the `x-api-key` header.

## Session Persistence

Sessions are saved as JSON files in `INSTAGRAPI_SESSION_DIR`. On startup, the service attempts to restore sessions from disk so users do not need to re-login after a restart.

## Integration

The Node.js backend calls this service via `server/instagrapiClient.ts`. The service URL and API key are configured via:

```
INSTAGRAPI_URL=http://localhost:8001
INSTAGRAPI_API_KEY=instagrapi-internal-key
```

These can be set in the project's `.env` file or via `webdev_request_secrets`.
