# Campus Services Hub - Frontend

Modern Next.js frontend for the Campus Services Hub microservices platform.

## Features

- ✅ Next.js 15 with App Router
- ✅ TypeScript
- ✅ Tailwind CSS 4
- ✅ Responsive sidebar navigation
- ✅ Dashboard layout
- ✅ Integration with API Gateway
- ✅ Docker support
- ✅ ESLint configuration

## Getting Started

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
cp .env.example .env.local
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Development

1. Build the Docker image:
```bash
docker build -t frontend-service:latest .
```

2. Run the container:
```bash
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://localhost:8000 frontend-service:latest
```

### With Docker Compose

The frontend will be added to the main docker-compose.yml to run with all microservices.

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── dashboard/        # Dashboard pages
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   └── globals.css      # Global styles
│   └── components/
│       ├── Sidebar/          # Sidebar navigation
│       └── Dashboard/       # Dashboard components
├── public/                   # Static assets
└── package.json
```

## Customization

- Update routes in `src/components/Sidebar/RouteSelect.tsx`
- Modify dashboard components in `src/components/Dashboard/`
- Add new pages in `src/app/dashboard/`

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

MIT

