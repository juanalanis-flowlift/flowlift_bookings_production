import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  decimal,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business categories enum values
export const businessCategories = [
  "hair_salon",
  "barber_shop",
  "nail_salon",
  "makeup_studio",
  "spa_wellness",
  "massage_therapist",
  "esthetician_facial",
  "lash_brow_studio",
  "tattoo_studio",
  "physical_therapy",
  "personal_trainer",
  "yoga_studio",
  "pilates_studio",
  "crossfit_gym",
  "sports_coaching",
  "martial_arts",
  "dance_studio",
  "nutrition_coach",
  "business_consultant",
  "marketing_consultant",
  "financial_advisor",
  "legal_consultant",
  "hr_consultant",
  "it_support",
  "life_coach",
  "photography_studio",
  "videography_services",
  "content_creator",
  "graphic_design",
  "music_teacher",
  "recording_studio",
  "tutoring_services",
  "language_school",
  "driving_school",
  "music_academy",
  "art_school",
  "interior_designer",
  "home_staging",
  "cleaning_services",
  "handyman_services",
  "landscaping",
  "hvac_maintenance",
  "home_inspection",
  "construction_rental",
  "music_rental",
  "event_rental",
  "photo_av_rental",
  "coworking_space",
  "event_planner",
  "tour_guide",
  "acupuncture_clinic",
  "general_medical",
  "dental_clinic",
  "chiropractic_clinic",
  "mental_health",
  "other",
] as const;

// Subscription tiers
export const subscriptionTiers = ["starter", "pro", "teams"] as const;

// Businesses table
export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  address: varchar("address", { length: 500 }),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  coverImageUrl: varchar("cover_image_url", { length: 500 }),
  // Social media usernames
  socialFacebook: varchar("social_facebook", { length: 255 }),
  socialInstagram: varchar("social_instagram", { length: 255 }),
  socialTwitter: varchar("social_twitter", { length: 255 }),
  socialLinkedin: varchar("social_linkedin", { length: 255 }),
  socialYoutube: varchar("social_youtube", { length: 255 }),
  socialTiktok: varchar("social_tiktok", { length: 255 }),
  socialPinterest: varchar("social_pinterest", { length: 255 }),
  socialSnapchat: varchar("social_snapchat", { length: 255 }),
  socialWhatsapp: varchar("social_whatsapp", { length: 255 }),
  socialThreads: varchar("social_threads", { length: 255 }),
  showTeamPicturesInBooking: boolean("show_team_pictures_in_booking").default(false),
  termsAndConditions: text("terms_and_conditions"),
  showTermsInBooking: boolean("show_terms_in_booking").default(false),
  showTermsInEmail: boolean("show_terms_in_email").default(false),
  subscriptionTier: varchar("subscription_tier", { length: 20 }).notNull().default("starter"),
  // Onboarding tracking (0-4 = current step, 5 = completed)
  onboardingStep: integer("onboarding_step").notNull().default(0),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  preferredLanguage: varchar("preferred_language", { length: 10 }).default("en"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Services table
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in minutes
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  tags: text("tags").array(),
  imageUrl: varchar("image_url", { length: 500 }), // service image for card display
  isActive: boolean("is_active").default(true),
  requiresConfirmation: boolean("requires_confirmation").default(false), // if true, bookings require manual confirmation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Availability table - stores working hours for each day
export const availability = pgTable("availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 6 = Saturday
  startTime: varchar("start_time", { length: 10 }).notNull(), // HH:MM format
  endTime: varchar("end_time", { length: 10 }).notNull(), // HH:MM format
  isOpen: boolean("is_open").default(true),
  slotDuration: integer("slot_duration").default(30), // in minutes
  maxBookingsPerSlot: integer("max_bookings_per_slot").default(1), // max concurrent bookings per slot
});

// Blocked times table - for holidays, vacations, etc.
export const blockedTimes = pgTable("blocked_times", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers table - for customer accounts
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  preferredLanguage: varchar("preferred_language", { length: 10 }).default("en"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer magic link tokens for passwordless auth
export const customerTokens = pgTable("customer_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Team members table
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  role: varchar("role", { length: 100 }), // e.g., "stylist", "barber", "therapist"
  photoUrl: varchar("photo_url", { length: 500 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team member services junction table - which services each team member can perform
export const teamMemberServices = pgTable("team_member_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamMemberId: varchar("team_member_id").notNull().references(() => teamMembers.id, { onDelete: "cascade" }),
  serviceId: varchar("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
});

// Team member availability - individual schedules for team members
export const teamMemberAvailability = pgTable("team_member_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamMemberId: varchar("team_member_id").notNull().references(() => teamMembers.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 6 = Saturday
  startTime: varchar("start_time", { length: 10 }).notNull(), // HH:MM format
  endTime: varchar("end_time", { length: 10 }).notNull(), // HH:MM format
  isAvailable: boolean("is_available").default(true),
});

// Booking status enum
export const bookingStatuses = ["pending", "confirmed", "cancelled", "modification_pending"] as const;

// Bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  serviceId: varchar("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  teamMemberId: varchar("team_member_id").references(() => teamMembers.id, { onDelete: "set null" }),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 50 }),
  customerNotes: text("customer_notes"),
  bookingDate: timestamp("booking_date").notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(), // HH:MM format
  endTime: varchar("end_time", { length: 10 }).notNull(), // HH:MM format
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  internalNotes: text("internal_notes"),
  // Customer action token for modify/cancel links in emails (permanent, doesn't expire)
  customerActionToken: varchar("customer_action_token", { length: 255 }),
  // Cancellation reason when customer cancels
  cancellationReason: text("cancellation_reason"),
  // Modification request fields
  proposedBookingDate: timestamp("proposed_booking_date"),
  proposedStartTime: varchar("proposed_start_time", { length: 10 }),
  proposedEndTime: varchar("proposed_end_time", { length: 10 }),
  modificationToken: varchar("modification_token", { length: 255 }),
  modificationTokenExpiresAt: timestamp("modification_token_expires_at"),
  modificationReason: text("modification_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  businesses: many(businesses),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, {
    fields: [businesses.ownerId],
    references: [users.id],
  }),
  services: many(services),
  availability: many(availability),
  blockedTimes: many(blockedTimes),
  bookings: many(bookings),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  business: one(businesses, {
    fields: [services.businessId],
    references: [businesses.id],
  }),
  bookings: many(bookings),
}));

export const availabilityRelations = relations(availability, ({ one }) => ({
  business: one(businesses, {
    fields: [availability.businessId],
    references: [businesses.id],
  }),
}));

export const blockedTimesRelations = relations(blockedTimes, ({ one }) => ({
  business: one(businesses, {
    fields: [blockedTimes.businessId],
    references: [businesses.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  business: one(businesses, {
    fields: [bookings.businessId],
    references: [businesses.id],
  }),
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id],
  }),
  teamMember: one(teamMembers, {
    fields: [bookings.teamMemberId],
    references: [teamMembers.id],
  }),
  customer: one(customers, {
    fields: [bookings.customerId],
    references: [customers.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  bookings: many(bookings),
  tokens: many(customerTokens),
}));

export const customerTokensRelations = relations(customerTokens, ({ one }) => ({
  customer: one(customers, {
    fields: [customerTokens.customerId],
    references: [customers.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one, many }) => ({
  business: one(businesses, {
    fields: [teamMembers.businessId],
    references: [businesses.id],
  }),
  services: many(teamMemberServices),
  availability: many(teamMemberAvailability),
}));

export const teamMemberServicesRelations = relations(teamMemberServices, ({ one }) => ({
  teamMember: one(teamMembers, {
    fields: [teamMemberServices.teamMemberId],
    references: [teamMembers.id],
  }),
  service: one(services, {
    fields: [teamMemberServices.serviceId],
    references: [services.id],
  }),
}));

export const teamMemberAvailabilityRelations = relations(teamMemberAvailability, ({ one }) => ({
  teamMember: one(teamMembers, {
    fields: [teamMemberAvailability.teamMemberId],
    references: [teamMembers.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAvailabilitySchema = createInsertSchema(availability).omit({
  id: true,
});

export const insertBlockedTimeSchema = createInsertSchema(blockedTimes).omit({
  id: true,
  createdAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerTokenSchema = createInsertSchema(customerTokens).omit({
  id: true,
  createdAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberServiceSchema = createInsertSchema(teamMemberServices).omit({
  id: true,
});

export const insertTeamMemberAvailabilitySchema = createInsertSchema(teamMemberAvailability).omit({
  id: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type Availability = typeof availability.$inferSelect;

export type InsertBlockedTime = z.infer<typeof insertBlockedTimeSchema>;
export type BlockedTime = typeof blockedTimes.$inferSelect;

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertCustomerToken = z.infer<typeof insertCustomerTokenSchema>;
export type CustomerToken = typeof customerTokens.$inferSelect;

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

export type InsertTeamMemberService = z.infer<typeof insertTeamMemberServiceSchema>;
export type TeamMemberService = typeof teamMemberServices.$inferSelect;

export type InsertTeamMemberAvailability = z.infer<typeof insertTeamMemberAvailabilitySchema>;
export type TeamMemberAvailability = typeof teamMemberAvailability.$inferSelect;

export type BookingStatus = typeof bookingStatuses[number];
export type BusinessCategory = typeof businessCategories[number];
export type SubscriptionTier = typeof subscriptionTiers[number];
