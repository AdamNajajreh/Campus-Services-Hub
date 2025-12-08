# Campus Services Hub - Frontend Service

Modern Next.js frontend for the Campus Services Hub microservices platform.

## Quick Start

### Prerequisites
- Node.js 20+ or Docker
- Access to the API Gateway (running on port 8000)

### Local Development

```bash
cd app
npm install
npm run dev
```

Visit http://localhost:3000

### Docker Build

```bash
cd app
docker build -t frontend-service:latest .
```

### Docker Run

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8000 \
  frontend-service:latest
```

## Project Structure

```
app/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   └── lib/
│       └── api.ts       # API client for backend services
├── Dockerfile           # Docker configuration
├── package.json
└── next.config.ts      # Next.js configuration
```

## Configuration

Create `app/.env.local` for local development:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NODE_ENV=development
```

## Integration with Backend

The frontend communicates with all microservices through the API Gateway:

- **API Gateway**: http://localhost:8000
- **User Service**: Via `/api/auth/*` and `/api/users/*`
- **Booking Service**: Via `/api/rooms/*` and `/api/bookings/*`
- **Request Service**: Via `/api/requests/*`
- **Notification Service**: Via `/api/notifications/*` and `/api/announcements/*`

## Features

- Authentication (Login/Register)
- User Dashboard
- Room Booking
- Service Requests
- Notifications & Announcements
- Responsive Design
- TypeScript
- Tailwind CSS

## Development

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Docker Compose

This service will be integrated into the main docker-compose.yml to run alongside all backend microservices.
