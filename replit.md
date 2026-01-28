# FlowLift - Multi-tenant Booking SaaS Platform

## Overview
FlowLift is a multi-tenant booking SaaS platform for small service businesses. It allows business owners to manage their services, availability, and bookings through a dashboard, while providing customers with public booking pages.

## Tech Stack
- **Frontend**: React 18, Vite, TailwindCSS, shadcn/ui, Wouter (routing), TanStack Query
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)
- **Font**: Inter

## Project Structure
```
├── client/src/
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # shadcn components
│   │   ├── AppSidebar.tsx
│   │   ├── DashboardThemeProvider.tsx  # Dashboard-scoped theme
│   │   └── ObjectUploader.tsx
│   ├── hooks/           # Custom React hooks
│   │   └── useAuth.ts
│   ├── lib/             # Utilities
│   │   ├── queryClient.ts
│   │   └── authUtils.ts
│   └── pages/           # Page components
│       ├── landing.tsx  # Public landing page
│       ├── dashboard.tsx
│       ├── services.tsx
│       ├── bookings.tsx
│       ├── availability.tsx
│       ├── settings.tsx
│       └── booking.tsx  # Public booking page
├── server/
│   ├── index.ts         # Express server entry
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Database storage layer
│   ├── replitAuth.ts    # Replit Auth integration
│   ├── db.ts            # Database connection
│   └── seed.ts          # Demo data seeding
└── shared/
    └── schema.ts        # Drizzle schema & types
```

## Database Schema
- **users**: User accounts (Replit Auth)
- **businesses**: Business profiles with slug for public URLs
- **services**: Services offered by businesses
- **availability**: Working hours per day of week
- **blocked_times**: Time off periods
- **bookings**: Customer appointments

## Key Features
1. **Multi-tenant Architecture**: Each user can own one business with unique slug
2. **Business Dashboard**: Manage services, view bookings, set availability
3. **Public Booking Page**: `/book/:slug` - customers can book appointments
4. **Double-booking Prevention**: Server-side validation for time conflicts
5. **Dark Mode Support**: Dashboard-scoped toggle between light/dark themes (only affects business owner pages, not public booking pages or landing page)
6. **Requires Confirmation Feature**: Services can be configured to require manual confirmation before booking is finalized. When enabled:
   - Bookings are created with "pending" status
   - Customer sees "Booking Request Submitted" with yellow clock icon
   - No confirmation email is sent immediately
   - Business owner confirms from the Bookings section
   - Confirmation email is sent only after approval
7. **Guided Onboarding Wizard**: Multi-step setup flow for new businesses:
   - Step 0: Welcome screen with getting started prompt
   - Step 1: Business identity (name, category, logo upload)
   - Step 2: Business description
   - Step 3: Location & contact info (address, city, country, phone, email)
   - Step 4: Preferences (language, theme)
   - Progress is saved at each step and can be resumed
   - Dashboard and Services pages redirect to onboarding if not complete

## API Routes
### Protected (requires auth)
- `GET/POST/PATCH /api/business` - Business CRUD
- `GET/POST/PATCH/DELETE /api/services/:id` - Services CRUD
- `GET/POST /api/availability` - Availability management
- `GET/POST/DELETE /api/blocked-times/:id` - Blocked time management
- `GET/PATCH /api/bookings/:id` - Booking management

### Public
- `GET /api/public/business/:slug` - Get business by slug
- `GET /api/public/services/:slug` - Get active services
- `GET /api/public/availability/:slug` - Get availability
- `GET /api/public/bookings/:slug` - Get bookings for date
- `POST /api/public/bookings/:slug` - Create booking

## Demo Data
Three demo businesses are seeded:
1. **Classic Cuts Barbershop** (`/book/classic-cuts`) - Barber services
2. **Luxe Hair Studio** (`/book/luxe-hair`) - Hair salon services
3. **Bounce Party Rentals** (`/book/bounce-party`) - Inflatable rentals

## Development Commands
- `npm run dev` - Start development server
- `npm run db:push` - Push schema to database
- `npx tsx server/seed.ts` - Seed demo data

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `ISSUER_URL` - Replit Auth issuer (default: https://replit.com/oidc)

## Email Service
The application supports two email providers with automatic fallback:

1. **Resend (Primary)** - Via Replit Connectors API
   - Connected through Replit's integration system
   - Credentials automatically fetched from `REPLIT_CONNECTORS_HOSTNAME`
   - Uses API key authentication

2. **SMTP (Fallback)** - Traditional SMTP
   - `SMTP_HOST` - SMTP server host
   - `SMTP_PORT` - SMTP server port
   - `SMTP_USER` - SMTP username
   - `SMTP_PASS` - SMTP password
   - `SMTP_FROM` - From email address

The system tries Resend first, then falls back to SMTP if unavailable.

## Design Decisions
- Using blue primary color (217 91% 60%) for professional SaaS look
- Inter font family for clean, modern typography
- Sidebar navigation for dashboard pages
- Card-based UI for services and bookings
- Calendar + time slot picker for booking flow
