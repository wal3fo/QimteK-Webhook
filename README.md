# QimteK Webhook

A powerful, secure, and user-friendly webhook inspection and management tool. QimteK Webhook allows developers to generate unique webhook URLs, capture incoming requests in real-time, and inspect payloads with a modern interface.

## 🚀 Features

### Core Functionality
- **Webhook Management**: Generate unique webhook URLs with customizable names and expiration times.
- **Real-time Inspection**: View incoming requests instantly via WebSocket integration without refreshing.
- **Detailed Request Analysis**: Inspect Headers, Body (JSON/Text), Query Parameters, IP addresses, and timestamps.
- **Request History**: Automatically retains the last 100 requests per webhook to maintain performance.
- **Search & Filter**: Quickly find specific webhooks by name or token.

### 🔐 Security & Authentication
- **Secure Authentication**: JWT-based session management with secure cookie/header handling.
- **Multi-Factor Authentication (MFA)**: Optional 2FA support using TOTP (Google Authenticator, Authy) for enhanced account security.
- **Session Validation**: Strict server-side validation ensures active sessions are terminated immediately if a user is deleted or roles change.
- **Role-Based Access Control (RBAC)**:
  - **User**: Standard access (1 active webhook).
  - **Professional**: Enhanced limits.
  - **Administrator**: Full system access and user management.

### 🛡️ Admin Panel
- **User Management**: View, create, and delete user accounts.
- **MFA Status**: Monitor which users have enabled 2FA.
- **Duplicate Prevention**: Smart systems to prevent duplicate accounts (case-insensitive email enforcement).
- **System Stats**: Overview of total users and active webhooks.

### 🏗️ Advanced Architecture
- **Universal Database Adapter**: Automatically switches between **SQLite** (high performance) and **JSON File** (maximum compatibility) based on the environment.
  - *Ideal for environments where compiling native SQLite bindings is difficult.*
- **Endpoint Protection**: Webhook ingestion endpoints validate token existence, expiration, and active status before accepting data.

## 🛠️ Tech Stack

### Frontend
- **React 18** (TypeScript)
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling with Dark Mode
- **React Router** - SPA Navigation
- **Lucide React** - Beautiful iconography
- **QRCode.react** - MFA setup integration

### Backend
- **Node.js & Express** - Robust API server
- **WebSocket** - Real-time updates
- **better-sqlite3** - High-performance native SQLite driver (Primary)
- **LowDB / Custom JSON** - Fallback storage engine
- **otplib** - TOTP generation and verification for MFA
- **Bcrypt** - Secure password hashing

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd QimteK-Webhook
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   *Note: If you encounter errors with `better-sqlite3` on Windows, the system will automatically fall back to the JSON database adapter.*

3. **Start the development server**
   ```bash
   npm run dev
   ```
   This command runs both the frontend (Vite) and backend (Node/Express) concurrently.

   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:3003

## 📖 Usage Guide

### Setting up MFA (2FA)
1. Go to **Settings** or click the **2FA Setup** button in the dashboard.
2. Scan the QR code with your authenticator app (Google Authenticator, etc.).
3. Enter the 6-digit code to verify and enable MFA.
4. On next login, you will be prompted to enter your code.

### Managing Users (Admin Only)
1. Navigate to the **Admin Panel** > **User Management**.
2. Click **New User** to manually create an account.
3. Use the trash icon to delete users (Action is irreversible).
   - *Note: Deleting a user immediately invalidates their session and active webhooks.*

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Authenticate and receive token
- `POST /api/auth/mfa/setup` - Initiate MFA setup
- `POST /api/auth/mfa/enable` - Verify and enable MFA

### Webhooks
- `GET /api/webhooks` - List active webhooks
- `POST /api/webhooks/generate` - Create new webhook
- `PUT /api/webhooks/:token` - Toggle status (Active/Inactive)
- `DELETE /api/webhooks/:token` - Delete webhook

### Users (Admin)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `DELETE /api/users/:id` - Delete user

## 📄 License

Private Project. All rights reserved.
