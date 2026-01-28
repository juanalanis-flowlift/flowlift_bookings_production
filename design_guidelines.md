# FlowLift Design Guidelines

## Design Approach

**Selected Approach**: Modern SaaS Design System with booking-specific patterns
**Primary References**: Linear (dashboard clarity), Cal.com (booking UX), Stripe Dashboard (data presentation)
**Rationale**: Dual-experience product requires clean utility for business users and welcoming simplicity for customers

## Design Philosophy

Create a professional, trustworthy SaaS platform that balances business efficiency with customer-friendly booking. The design should feel modern, credible, and approachable—suitable for diverse service businesses from barbers to event rentals.

## Typography

**Font Stack**:
- Primary: Inter (via Google Fonts) - Clean, professional, excellent readability
- Headings: Inter Semi-Bold (600) and Bold (700)
- Body: Inter Regular (400) and Medium (500)

**Type Scale**:
- Hero/Page Titles: text-4xl to text-5xl (font-bold)
- Section Headings: text-2xl to text-3xl (font-semibold)
- Card Titles: text-lg to text-xl (font-semibold)
- Body Text: text-base (font-normal)
- Small Text/Labels: text-sm (font-medium)
- Micro/Captions: text-xs

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, and 16 for consistent rhythm
- Tight spacing: p-2, gap-2, m-2
- Standard spacing: p-4, gap-4, m-4, py-6
- Generous spacing: p-8, gap-8, py-12, py-16
- Section padding: py-16 to py-24

**Grid System**:
- Dashboard: Sidebar (w-64) + Main content area (flex-1)
- Booking page: Single column mobile, max-w-6xl container desktop
- Service cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Form layouts: max-w-2xl for optimal readability

## Component Library

### Business Dashboard Components

**Navigation**:
- Fixed left sidebar (256px width) with logo, menu items, user profile section at bottom
- Menu items: Dashboard, Services, Bookings, Availability, Settings
- Active state: Subtle background treatment with border accent
- Mobile: Collapsible hamburger menu

**Dashboard Cards**:
- Metric cards: Grid layout showing key stats (upcoming bookings, 30-day total)
- Large numbers (text-3xl font-bold) with descriptive labels (text-sm)
- Card styling: Rounded borders, subtle shadows, clear hierarchy

**Booking Management**:
- Dual view toggle: List view (table) and Calendar view
- Table columns: Customer, Service, Date/Time, Status, Actions
- Status badges: Rounded pills with distinct treatments per state
- Calendar: Full-width monthly view with booking indicators on dates

**Forms**:
- Service editor: Two-column layout for efficient data entry
- Field groups with clear labels (text-sm font-medium) above inputs
- Input fields: Consistent height (h-10 to h-12), rounded corners, border focus states
- File upload for logo: Drag-drop zone with preview

### Public Booking Page Components

**Business Header**:
- Hero section featuring business logo (if uploaded) or initial circle
- Business name (text-4xl font-bold), category badge, contact info
- Description paragraph (max-w-3xl, text-lg)
- No large hero image - keep focused on business identity and services

**Service Display**:
- Service cards in responsive grid (1-3 columns)
- Each card: Service name (text-xl font-semibold), description (text-sm), duration badge, price (text-2xl font-bold)
- "Book Now" CTA button prominently placed
- Hover state: Subtle lift effect with shadow

**Booking Flow**:
- Step indicator showing: Select Service → Choose Time → Enter Details → Confirm
- Date picker: Calendar interface with available dates clearly marked, past dates disabled
- Time slot selector: Grid of available time buttons, booked slots disabled
- Booking form: Single column, clear field labels, required field indicators
- Confirmation screen: Summary card with booking details, success icon, next steps

### Shared UI Elements

**Buttons**:
- Primary CTA: Solid background, medium weight text, h-10 to h-12, px-6, rounded-md
- Secondary: Outlined variant with border
- Ghost: Minimal treatment for tertiary actions
- Icon buttons: Square (w-10 h-10) for compact actions
- Disabled state: Reduced opacity, cursor-not-allowed

**Input Fields**:
- Standard height: h-10 to h-12
- Padding: px-4
- Border radius: rounded-md
- Focus treatment: Border accent with subtle shadow
- Error state: Border treatment with helper text below

**Modals/Dialogs**:
- Centered overlay with backdrop blur
- Modal container: max-w-md to max-w-2xl depending on content
- Header with title and close button
- Action buttons aligned right

**Badges/Tags**:
- Rounded-full for status indicators
- px-3 py-1 with text-xs font-medium
- Service tags: Smaller treatment for categorization

## Images

**Business Logos**: 
- Placeholder: Circular containers (w-16 h-16 to w-24 h-24) with business initials
- Uploaded logos: Same circular container, object-fit cover
- Location: Dashboard header, booking page header, business profile

**No Hero Images**: Keep booking pages clean and service-focused without large hero imagery. Trust and professionalism come from clear information architecture and polished components.

## Responsive Behavior

**Breakpoints**:
- Mobile-first approach
- md: 768px (tablet)
- lg: 1024px (desktop)

**Mobile Adaptations**:
- Stack all multi-column layouts to single column
- Sidebar becomes slide-out drawer
- Reduce padding (py-12 → py-8)
- Service grid: 1 column
- Calendar: Compact mobile-optimized view

## Accessibility

- Minimum touch target: 44px × 44px
- Form labels always visible (no placeholder-only inputs)
- Focus indicators on all interactive elements
- Proper heading hierarchy (h1 → h2 → h3)
- ARIA labels for icon-only buttons
- Keyboard navigation support for calendar and time picker

## Key Differentiators

**Trust Signals**: Clear contact information, professional typography, organized data presentation
**Efficiency**: Quick-scan dashboard with at-a-glance metrics, streamlined booking flow
**Clarity**: Obvious CTAs, clear status indicators, unambiguous next steps
**Flexibility**: System supports diverse business types (barber to inflatable rentals) without feeling generic