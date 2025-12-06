# Dia Balance

**Track. Analyze. Understand.** Your complete diabetes management toolkit in one app.

Dia Balance is a mobile-first, responsive web application designed to help individuals manage their diabetes by tracking health metrics, medications, food intake, exercise, sleep, and other relevant factors. The application provides comprehensive analytics and insights to help users understand patterns and make informed decisions about their health.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Database Setup](#database-setup)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

## Features

### 🔐 Authentication

- Email-based authentication with one-time code verification
- Secure session management using NextAuth.js
- Pre-approved email system for access control
- Protected routes with middleware

### 📊 Dashboard

- **Action Logger**: Quick-add floating action button to log various health metrics
- **Action Types Supported**:
  - **Blood Glucose**: Readings with context (fasting, pre-meal, post-meal, bedtime)
  - **Insulin**: Dosage tracking with type and units
  - **Medication**: Name, dosage, and timing
  - **Food**: Meal descriptions and timing
  - **Exercise**: Type, duration, and intensity tracking
  - **Sleep**: Hours and quality rating
  - **Symptoms**: Description and severity tracking
  - **Weight**: Value and unit tracking
  - **Hydration**: Amount tracking
- **Recent Actions Feed**: Chronological list of all logged actions with edit/delete capabilities
- **Offline Support**: Queue actions when offline, sync automatically when connection is restored

### 📈 Analytics & Insights

- **Interactive Visualizations**:
  - Blood glucose trends over time
  - Insulin vs. glucose correlations
  - Exercise impact analysis
  - Sleep quality trends
  - Weight progress tracking
  - Hydration daily/weekly totals
- **Date Range Filtering**: Custom date ranges and preset options (today, yesterday, last 7/14/30 days)
- **Predictive Insights**: Pattern recognition and recommendations based on historical data
- **Data Export**: Download filtered data as PDF reports

### 🎨 User Experience

- Mobile-responsive design optimized for touch interactions
- Dark mode support for low-light viewing
- Color-coded action types for quick recognition
- Real-time updates and synchronization
- Accessible design following WCAG guidelines
- Toast notifications for user feedback

## Tech Stack

### Core Framework

- **[Next.js 16.0.7](https://nextjs.org/)** - React framework with App Router
- **[React 19.2.0](https://react.dev/)** - UI library
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type-safe JavaScript

### Styling

- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Lucide React](https://lucide.dev/)** - Icon library
- **[Geist Font](https://vercel.com/font)** - Optimized font family

### Backend & Database

- **[Prisma 7.1.0](https://www.prisma.io/)** - Next-generation ORM
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database (via Docker)
- **[@prisma/adapter-pg](https://www.prisma.io/docs/concepts/components/prisma-client/connection-pooling)** - PostgreSQL adapter for connection pooling

### Authentication

- **[NextAuth.js 4.24.13](https://next-auth.js.org/)** - Authentication framework
- **[@next-auth/prisma-adapter](https://next-auth.js.org/v4/adapters/prisma)** - Prisma adapter for NextAuth

### Data Visualization

- **[Recharts 3.5.1](https://recharts.org/)** - Composable charting library

### Utilities

- **[Zod 4.1.13](https://zod.dev/)** - Schema validation
- **[date-fns 4.1.0](https://date-fns.org/)** - Date utility library
- **[jsPDF 3.0.4](https://github.com/parallax/jsPDF)** - PDF generation
- **[jspdf-autotable 5.0.2](https://github.com/simonbengtsson/jsPDF-AutoTable)** - Table plugin for jsPDF
- **[clsx 2.1.1](https://github.com/lukeed/clsx)** - Conditional class names

### Email Services

- **[Resend 6.5.2](https://resend.com/)** - Email API service
- **[Nodemailer 7.0.11](https://nodemailer.com/)** - Email transporter

### Development Tools

- **[ESLint 9](https://eslint.org/)** - Code linting (flat config)
- **[Prettier 3.7.4](https://prettier.io/)** - Code formatting
- **[TypeScript ESLint](https://typescript-eslint.io/)** - TypeScript-specific linting rules

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v24.11.1 (see [`.node-version`](.node-version))
- **Yarn**: Package manager (v1.22.22 or later)
- **Docker & Docker Compose**: For local PostgreSQL database
- **Git**: Version control

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd dia-balance
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration (see [Configuration](#configuration))

4. **Start the PostgreSQL database**

   ```bash
   docker-compose up -d
   ```

5. **Run database migrations**

   ```bash
   yarn prisma migrate deploy
   ```

6. **Generate Prisma Client**

   ```bash
   yarn prisma generate
   ```

7. **Seed the database (optional)**

   ```bash
   yarn prisma db seed
   ```

8. **Start the development server**

   ```bash
   yarn dev
   ```

9. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://dia-balance_user:dia-balance_password@localhost:5432/dia-balance_db?schema=public"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"    # Your application URL

# Email Service (Resend)
RESEND_API_KEY="your-resend-api-key"

# Optional: Email Service (Nodemailer - alternative)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-email@example.com"
SMTP_PASSWORD="your-password"
```

### Generating NEXTAUTH_SECRET

Generate a secure secret for NextAuth:

```bash
openssl rand -base64 32
```

### Docker Compose Configuration

The `docker-compose.yml` file includes a PostgreSQL service with the following default values (can be overridden with environment variables):

- **Database**: `dia-balance_db`
- **User**: `dia-balance_user`
- **Password**: `dia-balance_password`
- **Port**: `5432`

To customize, create a `.env` file or set environment variables:

```env
POSTGRES_DB=your_database_name
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
POSTGRES_PORT=5432
```

## Development

### Project Structure

```
dia-balance/
├── .github/
│   ├── workflows/          # GitHub Actions CI/CD workflows
│   └── dependabot.yml      # Dependabot configuration
├── prisma/
│   ├── migrations/         # Database migrations
│   ├── schema.prisma       # Prisma schema definition
│   └── seed.mjs            # Database seeding script
├── public/
│   └── theme-init.js       # Theme initialization script
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── analytics/      # Analytics page and client components
│   │   ├── api/            # API routes
│   │   │   ├── actions/    # Action CRUD endpoints
│   │   │   ├── analytics/  # Analytics data endpoint
│   │   │   └── auth/       # NextAuth endpoints
│   │   ├── auth/           # Authentication pages
│   │   ├── constants/      # Application constants
│   │   ├── dashboard/      # Dashboard page and client components
│   │   └── layout.tsx      # Root layout
│   ├── components/         # Reusable React components
│   │   ├── DarkModeToggle.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── Navigation.tsx
│   │   ├── SessionProviderWrapper.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Toast.tsx
│   │   └── ToastProvider.tsx
│   └── lib/                # Utility libraries
│       ├── action-schemas.ts    # Zod schemas for actions
│       ├── auth.ts              # NextAuth configuration
│       ├── date-utils.ts        # Date manipulation utilities
│       ├── export.ts             # PDF export functionality
│       ├── prisma.ts             # Prisma client instance
│       ├── use-auth.tsx          # Authentication hook
│       └── use-online-status.ts  # Online/offline status hook
├── types/                  # TypeScript type definitions
├── docker-compose.yml       # Docker Compose configuration
├── next.config.ts          # Next.js configuration
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

### How It Works

#### Authentication Flow

1. User enters email address
2. System checks if email is pre-approved in database
3. If approved, a one-time verification code is sent via email
4. User enters code to complete authentication
5. Session is created and managed by NextAuth.js

#### Action Tracking

- Actions are logged through a modal form with type-specific fields
- Data is validated using Zod schemas before submission
- Actions are stored in PostgreSQL with proper indexing for performance
- Real-time updates reflect changes immediately in the UI

#### Offline Support

- Actions are queued in `localStorage` when offline
- When connection is restored, queued actions sync automatically
- Failed syncs are retried on next connection
- User receives feedback via toast notifications

#### Analytics Processing

- Server-side data aggregation for performance
- Date range filtering with timezone-aware handling
- Pattern recognition algorithms identify correlations
- Visualizations rendered client-side using Recharts

## Database Setup

### Running Migrations

Apply database migrations:

```bash
yarn prisma migrate deploy
```

### Creating New Migrations

After modifying `prisma/schema.prisma`:

```bash
yarn prisma migrate dev --name your_migration_name
```

### Database Seeding

Seed the database with sample data:

```bash
yarn prisma db seed
```

The seed script creates a demo user and sample actions for testing.

### Prisma Studio

Open Prisma Studio to view and edit data:

```bash
yarn prisma studio
```

## Scripts

### Development

```bash
yarn dev          # Start development server
yarn build        # Build for production
yarn start        # Start production server
```

### Code Quality

```bash
yarn lint         # Run ESLint
yarn lint:fix     # Run ESLint with auto-fix and format with Prettier
yarn format       # Format code with Prettier
yarn format:check # Check formatting without making changes
yarn type-check   # Run TypeScript type checking
```

### Database

```bash
yarn prisma generate        # Generate Prisma Client
yarn prisma migrate dev     # Create and apply migration
yarn prisma migrate deploy  # Apply migrations (production)
yarn prisma studio          # Open Prisma Studio
yarn prisma db seed         # Seed database
```

## Deployment

### Prerequisites for Production

1. **Set up a PostgreSQL database** (e.g., Vercel Postgres, Supabase, Railway, or AWS RDS)
2. **Configure environment variables** in your hosting platform
3. **Set up email service** (Resend recommended)

### Environment Variables for Production

Ensure these are set in your hosting platform:

- `DATABASE_URL` - Production PostgreSQL connection string
- `NEXTAUTH_SECRET` - Secure random secret (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your production URL (e.g., `https://yourdomain.com`)
- `RESEND_API_KEY` - Resend API key for email sending

### Deployment Platforms

#### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

Vercel automatically detects Next.js and configures build settings.

#### Other Platforms

The application can be deployed to any platform supporting Node.js:

- **Railway**: Supports PostgreSQL and automatic deployments
- **Render**: Full-stack hosting with PostgreSQL
- **AWS**: Use Amplify or EC2 with RDS
- **DigitalOcean**: App Platform with managed PostgreSQL

### Post-Deployment

After deployment:

1. Run database migrations:

   ```bash
   yarn prisma migrate deploy
   ```

2. Verify environment variables are set correctly

3. Test authentication flow

4. Monitor application logs for errors

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** following the existing code style
4. **Run linting and type checking** (`yarn lint:fix && yarn type-check`)
5. **Commit your changes** (`git commit -m 'Add some amazing feature'`)
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Code Style

- Follow the existing ESLint and Prettier configuration
- Use TypeScript for type safety
- Write meaningful commit messages
- Add comments for complex logic

### Testing

Before submitting a PR, ensure:

- ✅ All linting passes (`yarn lint`)
- ✅ Type checking passes (`yarn type-check`)
- ✅ Application builds successfully (`yarn build`)
- ✅ No console errors in development mode

## License

This project is private and proprietary. All rights reserved.

---

**Built with ❤️ for better diabetes management**
