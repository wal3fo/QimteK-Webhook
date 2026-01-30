# QimteK Webhook

A powerful, secure, and user-friendly webhook inspection and management tool. QimteK Webhook allows developers to generate unique webhook URLs, capture incoming requests in real-time, and inspect payloads with a modern, responsive interface.

## 🚀 Features

### Core Functionality
- **Webhook Management**: Generate unique webhook URLs with customizable names.
- **Real-time Inspection**: View incoming requests instantly.
- **Detailed Request Analysis**: Inspect Headers, Body (JSON/Text), Query Parameters, IP addresses, and timestamps.
- **Smart Parsing**: Automatically handles various content types and detects JSON payloads.
- **Visual Analytics**: Interactive charts for traffic monitoring (Requests per minute/hour).
- **Optimized Performance**: "Summary" data fetching for fast chart rendering even with large datasets.

### 🔐 Security & Authentication
- **Secure Authentication**: JWT-based session management.
- **Multi-Factor Authentication (MFA)**: Optional 2FA support using TOTP (Google Authenticator, Authy).
- **Password Management**: Secure password change functionality.
- **Role-Based Access Control (RBAC)**:
  - **User**: Free tier with basic limits (3 Webhooks, 24h retention).
  - **Professional**: Enhanced limits (10 Webhooks, Unlimited retention, Advanced features) with **Subscription Expiration** tracking.
  - **Administrator**: Full system access and user management.
- **Endpoint Protection**: Validates token existence and status before accepting data.

### 🛡️ Admin Panel
- **User Management**: View, create, edit, and delete user accounts.
- **Role Management**: Upgrade/Downgrade user roles directly.
- **Plan Configuration**: Dynamically configure plan limits (Max Webhooks, Expiration, etc.) via the Admin Dashboard.
- **System Stats**: Overview of total users and active webhooks.

### 📱 Modern UI/UX
- **Responsive Design**: Fully optimized for mobile and desktop (including Pricing Cards and Dashboards).
- **Dark Mode**: Built-in dark theme for comfortable viewing.
- **Interactive Components**: Real-time charts, copy-to-clipboard, and intuitive navigation.

## 🛠️ Tech Stack

### Frontend
- **React 18** (TypeScript)
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization
- **Framer Motion** - Smooth animations
- **React Router** - SPA Navigation
- **Lucide React** - Modern iconography

### Backend & Infrastructure
- **Node.js & Express** - Robust API server (for self-hosting/dev)
- **Cloudflare Pages Functions** - Serverless backend (Production)
- **Supabase (PostgreSQL)** - Scalable database and real-time capabilities
- **Bcrypt & JWT** - Secure authentication

## 📦 Getting Started

### Prerequisites
- Node.js (v20 or higher recommended)
- npm or yarn
- A **Supabase** project (for database)

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

3. **Environment Configuration**
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Backend Port (Optional, defaults to 3001)
   PORT=5000

   # Supabase Configuration (Required)
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # JWT Secret (Required for Auth)
   JWT_SECRET=your_secure_random_string

   # PayPal Configuration (For Payments)
   PAYPAL_CLIENT_ID=your_paypal_client_id
   PAYPAL_CLIENT_SECRET=your_paypal_secret
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   This command runs both the frontend (Vite) and backend (Node/Express) concurrently.
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:5000 (or your configured PORT)

## ☁️ Deployment (Cloudflare Pages)

This project is optimized for deployment on **Cloudflare Pages** using the full-stack framework (Frontend + Functions).

1. **Prerequisites**:
   - Cloudflare Account
   - Wrangler CLI installed (`npm install -g wrangler`)

2. **Configuration**:
   Ensure `wrangler.toml` is present with `compatibility_flags = ["nodejs_compat"]`.

3. **Deploy**:
   ```bash
   npm run deploy
   ```
   This script builds the frontend and deploys it along with the `/functions` directory to Cloudflare Pages.

## 📖 Usage Guide

### Creating a Webhook
1. Log in to your dashboard.
2. Click **"New Webhook"**.
3. Give it a name (e.g., "Stripe Payment").
4. Use the generated URL in your third-party service.

### Inspecting Requests
1. Click on a webhook card to view its details.
2. The **Traffic** tab shows real-time request volume.
3. The **Requests** list shows recent hits. Click one to see the full payload (Headers, Body, etc.).

### Upgrading to Professional
1. Go to the **Pricing** section.
2. Click **"Upgrade Now"** on the Professional plan.
3. Follow the payment instructions (PayPal) to unlock permanent retention and higher limits.

### Admin Features
1. Log in with an Administrator account.
2. Navigate to **Admin Panel**.
3. Manage users, update roles, or adjust Plan Configurations directly from the UI.

## 🔌 API Endpoints

### Public
- `POST /api/webhook/:token` - Ingest data (Protected by token validation)
- `GET /api/plans` - Retrieve available plans

### Protected (Auth Required)
- `GET /api/webhooks` - List user's webhooks
- `GET /api/webhook/:token` - Get webhook details
- `POST /api/webhooks` - Create a new webhook
- `DELETE /api/webhooks/:token` - Delete a webhook
- `POST /api/auth/change-password` - Change user password
- `POST /api/auth/mfa/setup` - Setup 2FA
- `POST /api/auth/mfa/enable` - Enable 2FA

### Admin Only
- `GET /api/users` - List all users
- `POST /api/users` - Create a new user manually
- `PATCH /api/users/:id` - Update user details (Role, etc.)
- `DELETE /api/users/:id` - Delete a user and their data
- `POST /api/plans/update` - Update plan configurations
