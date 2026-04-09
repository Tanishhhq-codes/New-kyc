# Experimental KYC Project

This is an experimental project for building and testing a KYC verification flow with Next.js and Supabase. It is actively evolving, so expect implementation details, UI choices, and data flows to change as the project matures.

## Project Overview

This app provides two main experiences:

- A user-facing KYC submission flow for uploading identity details and documents.
- An admin review dashboard for approving or rejecting submitted KYC requests.

The project uses:

- Next.js App Router
- React 19
- Supabase Auth, Database, Storage, and Realtime
- Tailwind CSS
- shadcn-style UI primitives

## Key Features

- User authentication with email/password and Google sign-in
- KYC form for collecting name, Aadhaar, PAN, and supporting documents
- Secure document upload to Supabase Storage
- Admin dashboard for reviewing submissions
- Live status updates through Supabase Realtime
- Status badges, document preview, and toast notifications

## Project Structure

- `src/app/page.tsx` redirects to the KYC experience
- `src/app/login/page.tsx` contains the login screen
- `src/app/meteors/page.tsx` contains the user KYC submission flow
- `src/app/admin/page.tsx` contains the admin review dashboard
- `src/app/api/admin/kyc-status/route.ts` updates submission status on the server
- `src/components/ui/` contains shared UI surfaces such as sign-in, KYC form, and sign-out controls
- `src/components/kyc/` contains KYC-specific widgets such as document viewer, status badge, and toast stack
- `src/lib/` contains Supabase client helpers
- `src/utils/` contains admin and document helper functions
- `supabase/schema.sql` defines the database schema used by the app

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file named `.env.local` and add the required Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

3. Start the development server:

```bash
npm run dev
```

4. Open the app in your browser:

```text
http://localhost:3000
```

## Available Scripts

- `npm run dev` starts the development server
- `npm run build` creates a production build
- `npm run start` runs the production server
- `npm run lint` runs ESLint

## Notes

- Admin access is controlled through Supabase user metadata and server-side checks.
- KYC documents are stored in Supabase Storage and signed when viewed in the admin dashboard.
- The project is experimental, so data models and flows may still be refined.


