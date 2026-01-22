# Qimtek Webhooks

## Overview
A webhook testing and debugging tool that allows you to generate temporary webhook URLs to capture and inspect HTTP requests. Built with React, TypeScript, Vite, and Express with SQLite database.

## Project Structure
- `/src` - React frontend (TypeScript, Tailwind CSS)
- `/api` - Express backend server
- `/public` - Static assets

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand
- **Backend**: Express, better-sqlite3, TypeScript
- **Build**: Vite, tsx for TypeScript execution

## Development
- Frontend runs on port 5000 (Vite dev server)
- Backend API runs on port 3001 (Express)
- Vite proxies `/api` requests to the backend

## Commands
- `npm run dev` - Start both client and server in development
- `npm run client:dev` - Start Vite dev server only
- `npm run server:dev` - Start Express server with nodemon
- `npm run build` - Build for production

## Environment Variables
- `PORT` - Backend server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `DB_PATH` - SQLite database file path

## Recent Changes
- Configured for Replit environment
- Set frontend to port 5000 with allowedHosts enabled
- Backend runs on port 3001
