# Quick Start Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 3. Customize for Your Project

### Update Routes
Edit `src/components/Sidebar/RouteSelect.tsx` to add/remove navigation items.

### Add Pages
Create new pages in `src/app/dashboard/` directory.

### Update Dashboard
Modify `src/components/Dashboard/Dashboard.tsx` to display your content.

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── dashboard/        # Dashboard pages
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   └── components/
│       ├── Dashboard/        # Dashboard components
│       └── Sidebar/          # Sidebar navigation
├── public/                   # Static assets
└── package.json
```

## Features Included

✅ Next.js 15 with App Router
✅ TypeScript support
✅ Tailwind CSS 4
✅ Sidebar navigation
✅ Dashboard layout
✅ Responsive design

## Next Steps

1. Customize the dashboard components
2. Add your own pages
3. Update styling to match your brand
4. Add features as needed
