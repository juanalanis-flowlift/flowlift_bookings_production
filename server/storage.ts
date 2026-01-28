import {
  users,
  businesses,
  services,
  availability,
  blockedTimes,
  bookings,
  customers,
  customerTokens,
  teamMembers,
  teamMemberServices,
  teamMemberAvailability,
  type User,
  type UpsertUser,
  type Business,
  type InsertBusiness,
  type Service,
  type InsertService,
  type Availability,
  type InsertAvailability,
  type BlockedTime,
  type InsertBlockedTime,
  type Booking,
  type InsertBooking,
  type Customer,
  type InsertCustomer,
  type CustomerToken,
  type InsertCustomerToken,
  type TeamMember,
  type InsertTeamMember,
  type TeamMemberService,
  type InsertTeamMemberService,
  type TeamMemberAvailability,
  type InsertTeamMemberAvailability,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Business operations
  getBusinessByOwnerId(ownerId: string): Promise<Business | undefined>;
  getBusinessBySlug(slug: string): Promise<Business | undefined>;
  getBusinessById(id: string): Promise<Business | undefined>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: string, business: Partial<InsertBusiness>): Promise<Business | undefined>;
  deleteBusiness(id: string): Promise<void>;

  // Service operations
  getServicesByBusinessId(businessId: string): Promise<Service[]>;
  getServiceById(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string): Promise<void>;

  // Availability operations
  getAvailabilityByBusinessId(businessId: string): Promise<Availability[]>;
  upsertAvailability(avail: InsertAvailability): Promise<Availability>;

  // Blocked time operations
  getBlockedTimesByBusinessId(businessId: string): Promise<BlockedTime[]>;
  createBlockedTime(blockedTime: InsertBlockedTime): Promise<BlockedTime>;
  deleteBlockedTime(id: string): Promise<void>;

  // Booking operations
  getBookingsByBusinessId(businessId: string): Promise<Booking[]>;
  getBookingById(id: string): Promise<Booking | undefined>;
  getBookingByModificationToken(token: string): Promise<Booking | undefined>;
  getBookingByCustomerActionToken(token: string): Promise<Booking | undefined>;
  getBookingsByDateRange(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking | undefined>;

  // Customer operations
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  getCustomerById(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  getCustomerBookings(customerId: string): Promise<Booking[]>;
  getCustomerBookingsByEmail(email: string): Promise<Booking[]>;

  // Customer token operations
  createCustomerToken(token: InsertCustomerToken): Promise<CustomerToken>;
  getValidToken(token: string): Promise<CustomerToken | undefined>;
  markTokenAsUsed(tokenId: string): Promise<void>;
  deleteExpiredTokens(): Promise<void>;

  // Team member operations
  getTeamMembersByBusinessId(businessId: string): Promise<TeamMember[]>;
  getTeamMemberById(id: string): Promise<TeamMember | undefined>;
  createTeamMember(teamMember: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: string, teamMember: Partial<InsertTeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: string): Promise<void>;

  // Team member services operations
  getTeamMemberServices(teamMemberId: string): Promise<TeamMemberService[]>;
  getTeamMembersByServiceId(serviceId: string): Promise<TeamMember[]>;
  setTeamMemberServices(teamMemberId: string, serviceIds: string[]): Promise<void>;

  // Team member availability operations
  getTeamMemberAvailability(teamMemberId: string): Promise<TeamMemberAvailability[]>;
  upsertTeamMemberAvailability(avail: InsertTeamMemberAvailability): Promise<TeamMemberAvailability>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if a user with this email already exists
    if (userData.email) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email));
      
      if (existingUser) {
        // Update the existing user profile info but keep their original ID
        // to preserve foreign key references (businesses, etc.)
        const [updated] = await db
          .update(users)
          .set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        
        return updated;
      }
    }
    
    // Try to insert or update by ID
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Business operations
  async getBusinessByOwnerId(ownerId: string): Promise<Business | undefined> {
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, ownerId));
    return business;
  }

  async getBusinessBySlug(slug: string): Promise<Business | undefined> {
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.slug, slug));
    return business;
  }

  async getBusinessById(id: string): Promise<Business | undefined> {
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, id));
    return business;
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    const [created] = await db.insert(businesses).values(business).returning();
    return created;
  }

  async updateBusiness(
    id: string,
    business: Partial<InsertBusiness>
  ): Promise<Business | undefined> {
    const [updated] = await db
      .update(businesses)
      .set({ ...business, updatedAt: new Date() })
      .where(eq(businesses.id, id))
      .returning();
    return updated;
  }

  async deleteBusiness(id: string): Promise<void> {
    await db.delete(businesses).where(eq(businesses.id, id));
  }

  // Service operations
  async getServicesByBusinessId(businessId: string): Promise<Service[]> {
    return await db
      .select()
      .from(services)
      .where(eq(services.businessId, businessId))
      .orderBy(desc(services.createdAt));
  }

  async getServiceById(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async createService(service: InsertService): Promise<Service> {
    const [created] = await db.insert(services).values(service).returning();
    return created;
  }

  async updateService(
    id: string,
    service: Partial<InsertService>
  ): Promise<Service | undefined> {
    const [updated] = await db
      .update(services)
      .set({ ...service, updatedAt: new Date() })
      .where(eq(services.id, id))
      .returning();
    return updated;
  }

  async deleteService(id: string): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  // Availability operations
  async getAvailabilityByBusinessId(businessId: string): Promise<Availability[]> {
    return await db
      .select()
      .from(availability)
      .where(eq(availability.businessId, businessId));
  }

  async upsertAvailability(avail: InsertAvailability): Promise<Availability> {
    // Check if availability exists for this business and day
    const [existing] = await db
      .select()
      .from(availability)
      .where(
        and(
          eq(availability.businessId, avail.businessId),
          eq(availability.dayOfWeek, avail.dayOfWeek)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(availability)
        .set(avail)
        .where(eq(availability.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(availability).values(avail).returning();
      return created;
    }
  }

  // Blocked time operations
  async getBlockedTimesByBusinessId(businessId: string): Promise<BlockedTime[]> {
    return await db
      .select()
      .from(blockedTimes)
      .where(eq(blockedTimes.businessId, businessId))
      .orderBy(desc(blockedTimes.startDateTime));
  }

  async createBlockedTime(blockedTime: InsertBlockedTime): Promise<BlockedTime> {
    const [created] = await db
      .insert(blockedTimes)
      .values(blockedTime)
      .returning();
    return created;
  }

  async deleteBlockedTime(id: string): Promise<void> {
    await db.delete(blockedTimes).where(eq(blockedTimes.id, id));
  }

  // Booking operations
  async getBookingsByBusinessId(businessId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.businessId, businessId))
      .orderBy(desc(bookings.bookingDate));
  }

  async getBookingById(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async getBookingByModificationToken(token: string): Promise<Booking | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.modificationToken, token));
    return booking;
  }

  async getBookingByCustomerActionToken(token: string): Promise<Booking | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.customerActionToken, token));
    return booking;
  }

  async getBookingsByDateRange(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.businessId, businessId),
          gte(bookings.bookingDate, startDate),
          lte(bookings.bookingDate, endDate)
        )
      );
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const customerActionToken = randomBytes(32).toString("hex");
    const [created] = await db.insert(bookings).values({
      ...booking,
      customerActionToken,
    }).returning();
    return created;
  }

  async updateBooking(
    id: string,
    booking: Partial<InsertBooking>
  ): Promise<Booking | undefined> {
    const [updated] = await db
      .update(bookings)
      .set({ ...booking, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  // Customer operations
  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email.toLowerCase()));
    return customer;
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db
      .insert(customers)
      .values({ ...customer, email: customer.email.toLowerCase() })
      .returning();
    return created;
  }

  async updateCustomer(
    id: string,
    customer: Partial<InsertCustomer>
  ): Promise<Customer | undefined> {
    const updateData = { ...customer, updatedAt: new Date() };
    if (customer.email) {
      updateData.email = customer.email.toLowerCase();
    }
    const [updated] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();
    return updated;
  }

  async getCustomerBookings(customerId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.customerId, customerId))
      .orderBy(desc(bookings.bookingDate));
  }

  async getCustomerBookingsByEmail(email: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.customerEmail, email.toLowerCase()))
      .orderBy(desc(bookings.bookingDate));
  }

  // Customer token operations
  async createCustomerToken(token: InsertCustomerToken): Promise<CustomerToken> {
    const [created] = await db
      .insert(customerTokens)
      .values(token)
      .returning();
    return created;
  }

  async getValidToken(token: string): Promise<CustomerToken | undefined> {
    const [tokenRecord] = await db
      .select()
      .from(customerTokens)
      .where(
        and(
          eq(customerTokens.token, token),
          gte(customerTokens.expiresAt, new Date()),
          isNull(customerTokens.usedAt)
        )
      );
    return tokenRecord;
  }

  async markTokenAsUsed(tokenId: string): Promise<void> {
    await db
      .update(customerTokens)
      .set({ usedAt: new Date() })
      .where(eq(customerTokens.id, tokenId));
  }

  async deleteExpiredTokens(): Promise<void> {
    await db
      .delete(customerTokens)
      .where(lte(customerTokens.expiresAt, new Date()));
  }

  // Team member operations
  async getTeamMembersByBusinessId(businessId: string): Promise<TeamMember[]> {
    return await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.businessId, businessId))
      .orderBy(desc(teamMembers.createdAt));
  }

  async getTeamMemberById(id: string): Promise<TeamMember | undefined> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, id));
    return member;
  }

  async createTeamMember(teamMember: InsertTeamMember): Promise<TeamMember> {
    const [created] = await db.insert(teamMembers).values(teamMember).returning();
    return created;
  }

  async updateTeamMember(
    id: string,
    teamMember: Partial<InsertTeamMember>
  ): Promise<TeamMember | undefined> {
    const [updated] = await db
      .update(teamMembers)
      .set({ ...teamMember, updatedAt: new Date() })
      .where(eq(teamMembers.id, id))
      .returning();
    return updated;
  }

  async deleteTeamMember(id: string): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  // Team member services operations
  async getTeamMemberServices(teamMemberId: string): Promise<TeamMemberService[]> {
    return await db
      .select()
      .from(teamMemberServices)
      .where(eq(teamMemberServices.teamMemberId, teamMemberId));
  }

  async getTeamMembersByServiceId(serviceId: string): Promise<TeamMember[]> {
    const assignments = await db
      .select({
        teamMember: teamMembers,
      })
      .from(teamMemberServices)
      .innerJoin(teamMembers, eq(teamMemberServices.teamMemberId, teamMembers.id))
      .where(
        and(
          eq(teamMemberServices.serviceId, serviceId),
          eq(teamMembers.isActive, true)
        )
      );
    return assignments.map(a => a.teamMember);
  }

  async setTeamMemberServices(teamMemberId: string, serviceIds: string[]): Promise<void> {
    // Delete existing assignments
    await db
      .delete(teamMemberServices)
      .where(eq(teamMemberServices.teamMemberId, teamMemberId));

    // Insert new assignments
    if (serviceIds.length > 0) {
      await db.insert(teamMemberServices).values(
        serviceIds.map((serviceId) => ({
          teamMemberId,
          serviceId,
        }))
      );
    }
  }

  // Team member availability operations
  async getTeamMemberAvailability(teamMemberId: string): Promise<TeamMemberAvailability[]> {
    return await db
      .select()
      .from(teamMemberAvailability)
      .where(eq(teamMemberAvailability.teamMemberId, teamMemberId));
  }

  async upsertTeamMemberAvailability(avail: InsertTeamMemberAvailability): Promise<TeamMemberAvailability> {
    // Check if availability exists for this team member and day
    const [existing] = await db
      .select()
      .from(teamMemberAvailability)
      .where(
        and(
          eq(teamMemberAvailability.teamMemberId, avail.teamMemberId),
          eq(teamMemberAvailability.dayOfWeek, avail.dayOfWeek)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(teamMemberAvailability)
        .set(avail)
        .where(eq(teamMemberAvailability.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(teamMemberAvailability).values(avail).returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
