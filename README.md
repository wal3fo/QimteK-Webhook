# QimteK Hooks

A real-time webhook inspection tool similar to webhook.site. Generate temporary webhook URLs to capture and inspect HTTP requests for debugging and testing purposes.

## Features

- 🚀 **Generate Webhook URLs**: Create unique, temporary webhook endpoints with one click
- 📊 **Real-time Dashboard**: View incoming requests in real-time with Socket.io
- 🔍 **Request Inspector**: Detailed view of headers, body, query parameters, and metadata
- 🎨 **Modern UI**: Beautiful, responsive interface with dark mode support
- 📤 **Export Data**: Export requests as JSON for further analysis
- 🔎 **Search & Filter**: Filter requests by HTTP method and search in body/headers
- ⏰ **Auto-expiration**: Webhooks automatically expire after a set time
- 🧹 **Auto-cleanup**: Expired webhooks are automatically cleaned up

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js + Socket.io
- **Database**: SQLite3 (better-sqlite3)
- **Real-time**: Socket.io for bidirectional communication

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd QimteK-Webhook
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
PORT=3001
BASE_URL=http://localhost:3001
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

### Development

Run both frontend and backend in development mode:
```bash
npm run dev
```

Or run them separately:
```bash
# Terminal 1: Backend
npm run server:dev

# Terminal 2: Frontend
npm run client:dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Production Build

Build for production:
```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. **Generate Webhook URL**: Click "Generate Webhook URL" on the homepage
2. **Copy URL**: Copy the generated webhook URL
3. **Send Requests**: Send HTTP requests to your webhook URL from any client
4. **View Requests**: See incoming requests appear in real-time on the dashboard
5. **Inspect Details**: Click on any request to view full details including headers, body, and query parameters
6. **Export Data**: Export requests as JSON for further analysis

## API Endpoints

### Generate Webhook
```
POST /api/webhooks/generate
Body: { expiresIn: number } // Optional, default: 60 minutes
Response: { success: true, token: string, url: string, expiresAt: string }
```

### Get Requests
```
GET /api/webhooks/:token/requests?limit=100&offset=0
Response: { success: true, requests: Array, total: number }
```

### Get Single Request
```
GET /api/webhooks/requests/:id
Response: { success: true, request: Object }
```

### Delete Webhook
```
DELETE /api/webhooks/:token
Response: { success: true, message: string }
```

### Webhook Receiver
```
ALL /api/webhook/:token
Response: { success: true, message: string, requestId: string }
```

## Environment Variables

See [ENV_CONFIG.md](./ENV_CONFIG.md) for complete environment variable documentation.

### Quick Reference

**Local Development:**
```env
NODE_ENV=development
PORT=3001
BASE_URL=http://localhost:3001
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

**Vercel Production:**
```env
NODE_ENV=production
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
BASE_URL=https://your-app.vercel.app
CLIENT_URL=https://your-app.vercel.app
VITE_API_URL=/api
VITE_SOCKET_URL=https://your-app.vercel.app
```

### All Variables

| Variable | Description | Default | Required (Prod) |
|----------|-------------|---------|-----------------|
| `NODE_ENV` | Environment mode | `development` | Yes |
| `SUPABASE_URL` | Supabase project URL | - | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | - | Yes |
| `PORT` | Server port | `3001` | No |
| `BASE_URL` | Base URL for webhook generation | Auto-detected | No |
| `CLIENT_URL` | Client URL for CORS/Socket.io | `*` | No |
| `DB_PATH` | Database file path (local only) | `./webhook.db` | No |
| `VITE_API_URL` | Frontend API URL | `http://localhost:3001/api` | No |
| `VITE_SOCKET_URL` | Frontend Socket.io URL | `http://localhost:3001` | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (optional) | - | No |

## Database Schema

### Webhooks Table
- `token` (TEXT, PRIMARY KEY): Unique webhook token
- `created_at` (DATETIME): Creation timestamp
- `expires_at` (DATETIME): Expiration timestamp
- `is_active` (BOOLEAN): Active status

### Requests Table
- `id` (TEXT, PRIMARY KEY): Unique request ID
- `webhook_token` (TEXT, FOREIGN KEY): Associated webhook token
- `method` (TEXT): HTTP method
- `url` (TEXT): Request URL
- `headers` (JSON): Request headers
- `body` (JSON): Request body
- `query` (JSON): Query parameters
- `timestamp` (DATETIME): Request timestamp
- `ip_address` (TEXT): Client IP address

## Deployment

### Vercel

This project is configured for Vercel deployment. The `vercel.json` file includes the necessary rewrites.

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel`
3. Set environment variables in Vercel dashboard

**Note**: For Vercel deployment, you may need to use a different database solution (e.g., PostgreSQL) as SQLite files are not persistent on serverless functions.

### Other Platforms

For other platforms, ensure:
- Node.js 18+ is available
- Environment variables are set
- Database file has write permissions (for SQLite)
- Socket.io is properly configured for your platform

## Security Considerations

- Webhook URLs contain tokens - keep them private
- Webhooks expire automatically
- Consider rate limiting for production use
- Use HTTPS in production
- Validate and sanitize incoming requests
- Consider adding authentication for production deployments

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

See LICENSE file for details.
