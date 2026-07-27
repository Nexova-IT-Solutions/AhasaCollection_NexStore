# GiftBoxLK

GiftBoxLK is a premium gifting platform for Sri Lanka, built to transform gifting from a simple purchase into a curated experience. The platform combines a modern storefront, personalized gift composition, and an operations-focused admin system so teams can launch campaigns, manage products, and deliver meaningful gifting journeys at scale.

## Project Overview

GiftBoxLK is designed around a single vision: gifting as an experience.

- Curated discovery for occasions, categories, and trends.
- Personalized gifting through Build Your Own Box (BYOB).
- Dynamic merchandising via admin-managed homepage sections and promotional banners.
- Operational control with role-aware admin workflows.

## Tech Stack

### Frontend

- Next.js 15+ App Router architecture with Turbopack development workflow (currently running on the latest major release).
- Tailwind CSS 4 for utility-first styling.
- shadcn/ui + Radix primitives for accessible, composable UI.
- TypeScript for end-to-end type safety.

### Backend and Database

- Prisma ORM for schema management and typed data access.
- PostgreSQL on Supabase as the primary datastore.
- Next.js Route Handlers for server APIs (catalog, admin, auth-adjacent flows).

### Authentication and Internationalization

- NextAuth.js with Prisma adapter and credential/social provider support.
- next-intl for locale routing and translations.
- Active locale support includes English and Sinhala (with Tamil locale routing also present).

## Key Features

### Dynamic Storefront

- Homepage is assembled from modular sections (hero, new arrivals, trending, categories, occasions, discounts, etc.).
- Promotional slots use admin-managed banner keys (for example: promo_1, promo_2).
- Content visibility is data-driven through product/category/occasion flags.

### Product Management

- Product visibility flags include:
	- New Arrivals
	- Trending Now
	- Special Discounts
- Discount logic is validated and automated:
	- Special Discount requires a valid discount percentage.
	- Sale price is automatically computed from base price and discount percentage.
	- Discount-related fields are normalized in API create/update flows.

### BYOB (Build Your Own Box)

- Multi-step custom gift box builder.
- Box capacity management with progress tracking.
- Category-based item selection and quantity controls.
- Personalized extras: gift message, wrapping style, and note style.

### Advanced Admin Panel with RBAC

- Role-aware admin access with role checks in server routes.
- Super Admin and Admin access separation for sensitive modules.
- Example: user setup/management surfaces are restricted for Super Admin-only views in key navigation flows.

## Database Architecture (Prisma Models)

The platform uses a relational schema optimized for e-commerce and curated gifting.

### User and Security

- User: handles authentication identity, account status, and role-based access. Admin-focused roles include SUPER_ADMIN and ADMIN (with additional operational roles also present).
- Account, Session, VerificationToken: NextAuth.js standard models for secure authentication and session management.

### Product and Taxonomy

- Product: core commerce model with visibility flags (isNewArrival, isTrending, isSpecialDiscount) and discount-aware pricing fields.
- Category: hierarchical taxonomy with parent-child self-relation for nested navigation.
- Occasion: many-to-many relation with Product for event-based merchandising (for example birthdays, anniversaries, weddings).
- Mood: many-to-many relation with Product via ProductMood.

### Storefront Management

- PromoBanner: key-based banner management for homepage placements (promo_1, promo_2).
- LandingPage: dynamic homepage key-value content is referenced in project scope, but a dedicated LandingPage model is not currently present in prisma/schema.prisma.

### User Data

- Address: linked to User for billing and delivery profiles.

### Key Relationships

- One-to-Many: Category to Product (a category can have many products).
- Many-to-Many: Product to Occasion (products can be tagged to multiple occasions).
- Many-to-Many: Product to Mood via ProductMood.
- Self-Relation: Category to Category (parent and child categories).

## Project Structure

```text
src/
	app/
		[locale]/            # Localized storefront and admin pages
		api/                 # Route Handlers
	components/
		giftbox/             # Storefront-specific reusable components
		admin/               # Admin UI components
		ui/                  # shadcn/ui primitives and wrappers
	i18n/                  # Locale config and navigation
	lib/                   # Auth, DB client, and shared server utilities
	store/                 # Zustand state stores (cart, box builder)
prisma/
	schema.prisma          # Prisma schema
	migrations/            # Migration history
	seed.ts                # Seed script
```

## Installation and Setup

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database (Supabase recommended)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a .env file in the project root and set values similar to:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"

NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# Optional social auth providers
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""
TIKTOK_CLIENT_KEY=""
TIKTOK_CLIENT_SECRET=""
```

### 3. Sync Database Schema

```bash
npx prisma db push
```

### 4. Seed Initial Data

```bash
npx prisma db seed
```

### 5. Start Development Server

```bash
npm run dev
```

Application URL:

```text
http://localhost:3000
```

## UX Standards Implemented

- Skeleton loaders are used across data-heavy sections (homepage sections, product detail sub-sections, and list placeholders) to keep perceived performance smooth.
- Notifications use a top-center toast viewport for high-visibility user feedback during actions like form submissions and admin/product workflows.

## Scripts

```bash
npm run dev        # Start local development server
npm run build      # Build production bundle
npm run start      # Start production server
npm run lint       # Run lint checks
```

## Notes

- The repository currently tracks the latest Next.js major release while preserving the App Router-based architecture expected for modern Next.js 15+ projects.
- Production deployments should use managed secrets and database credentials via the host platform (do not commit .env files).
