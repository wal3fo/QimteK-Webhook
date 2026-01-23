# QimteK Webhook

A powerful and user-friendly webhook inspection tool that allows developers to generate unique webhook URLs, capture incoming requests, and inspect them in real-time.

## Features

- **Webhook Management**: Generate unique webhook URLs with expiration times.
- **Real-time Inspection**: View incoming requests (Headers, Body, Query Parameters) as they arrive.
- **Request Details**: Deep dive into specific request payloads with JSON formatting.
- **Role-Based Limits**:
  - **Ordinary Users**: Max 1 active webhook.
  - **Administrators**: Max 5 active webhooks.
- **Authentication**: Secure user accounts with JWT authentication.
- **Responsive UI**: Modern interface built with React and Tailwind CSS.

## Tech Stack

### Frontend
- **React 18** (TypeScript)
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Lucide React** - Icons
- **Zustand** - State Management (implied by package.json, though Context/Hooks used)

### Backend
- **Node.js** & **Express**
- **better-sqlite3** - High-performance SQLite database
- **JWT** - JSON Web Token for authentication
- **Bcrypt** - Password hashing

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

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

3. Start the development server (runs both client and server):
   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3003

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT

### Webhooks
- `GET /api/webhooks` - List all active webhooks
- `POST /api/webhooks/generate` - Create a new webhook
- `DELETE /api/webhooks/:token` - Delete a webhook

### Requests
- `GET /api/webhooks/:token/requests` - List requests for a specific webhook
- `GET /api/webhooks/requests/:id` - Get details of a specific request

## Configuration

- **Database**: SQLite database file (`webhook.db`) is automatically created in the root directory.
- **Limits**: Webhook limits are defined in `api/config.ts`.

## License

Private Project.
