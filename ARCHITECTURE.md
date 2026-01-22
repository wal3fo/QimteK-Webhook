# Architecture Overview

## Minimal Webhook Inspection Service

This is a lightweight webhook inspection service that allows users to generate temporary webhook URLs, send HTTP requests to them, and inspect the received requests through a simple UI.

## Core Components

### 1. Webhook Generation
- **Endpoint**: `POST /api/webhooks/generate`
- **Purpose**: Creates a unique, hard-to-guess webhook URL
- **Token**: UUID without dashes (32 characters)
- **Expiration**: Default 60 minutes (configurable)
- **Storage**: Stored in database with expiration timestamp

### 2. Request Capture
- **Endpoint**: `ALL /api/webhook/:token`
- **Purpose**: Captures incoming HTTP requests to webhook URLs
- **Supports**: All HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, etc.)
- **Captures**:
  - HTTP method
  - Headers (all headers)
  - Query parameters
  - Body (raw + parsed JSON when applicable)
  - Source IP address
  - Timestamp

### 3. Request Storage
- **Limit**: Maximum 100 requests per webhook (rolling buffer)
- **Behavior**: When limit is exceeded, oldest requests are automatically deleted
- **Storage Backend**: 
  - SQLite (preferred, for local development)
  - JSON file (fallback, works everywhere)

### 4. Request Retrieval
- **List Requests**: `GET /api/webhooks/:token/requests`
  - Returns all captured requests for a webhook
  - Sorted newest first
  - Supports pagination (limit/offset)
- **Get Single Request**: `GET /api/webhooks/requests/:id`
  - Returns full request details including headers, body, query params

### 5. Webhook Management
- **Delete Webhook**: `DELETE /api/webhooks/:token`
  - Permanently removes webhook and all associated requests

## Data Flow

```
1. User generates webhook URL
   POST /api/webhooks/generate
   → Returns: { token, url, expiresAt }

2. External service sends request to webhook URL
   ANY /api/webhook/{token}
   → Captures all request data
   → Stores in database
   → Returns success response

3. User views captured requests
   GET /api/webhooks/{token}/requests
   → Returns list of requests (newest first)

4. User views request details
   GET /api/webhooks/requests/{id}
   → Returns full request details
```

## Storage Schema

### Webhooks Table
- `token` (TEXT, PRIMARY KEY): Unique webhook identifier
- `created_at` (DATETIME): Creation timestamp
- `expires_at` (DATETIME): Expiration timestamp
- `is_active` (BOOLEAN): Active status

### Requests Table
- `id` (TEXT, PRIMARY KEY): Unique request identifier (UUID)
- `webhook_token` (TEXT, FOREIGN KEY): Associated webhook token
- `method` (TEXT): HTTP method (GET, POST, etc.)
- `url` (TEXT): Full request URL
- `headers` (JSON): Request headers
- `body` (JSON): Request body (parsed when possible)
- `query` (JSON): Query parameters
- `timestamp` (DATETIME): Request timestamp
- `ip_address` (TEXT): Source IP address

## Request Limit Enforcement

Each webhook maintains a rolling buffer of the last 100 requests. When a new request is captured:
1. Request is inserted into database
2. System checks if webhook has more than 100 requests
3. If yes, deletes oldest requests beyond the limit
4. Keeps only the most recent 100 requests

This ensures:
- Memory usage stays bounded
- Most recent requests are always available
- No manual cleanup required

## Design Decisions

### Why In-Memory/JSON Storage?
- **Simplicity**: No external database dependencies
- **Portability**: Works in any environment (local, serverless, etc.)
- **Performance**: Fast for small to medium workloads
- **Minimal Setup**: No database configuration needed

### Why Rolling Buffer?
- **Bounded Memory**: Prevents unbounded growth
- **Recent Data Focus**: Most webhook testing needs recent requests
- **Automatic Cleanup**: No manual intervention required

### Why No Authentication?
- **Simplicity**: Focus on core functionality
- **Temporary URLs**: Hard-to-guess tokens provide basic security
- **Short Lifespan**: Webhooks expire automatically

## Limitations (By Design)

- No user accounts or authentication
- No webhook forwarding
- No retries or delivery guarantees
- No WebSocket live updates (polling only)
- No long-term persistence
- Maximum 100 requests per webhook

These limitations keep the service minimal and focused on its core purpose: inspecting webhook requests.
