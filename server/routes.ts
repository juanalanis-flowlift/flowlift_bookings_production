import type { Express } from "express";
import type { Server } from "http";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertBusinessSchema, insertServiceSchema, insertBookingSchema } from "@shared/schema";
import { z } from "zod";
import { startOfDay, endOfDay, addHours } from "date-fns";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { sendBookingEmails, sendMagicLinkEmail, verifyEmailConnection, sendModificationRequestEmail } from "./emailService";

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  // Auth middleware (Google + Microsoft OAuth)
  await setupAuth(app);

  // Email diagnostic endpoint (protected)
  app.get("/api/admin/email-test", isAuthenticated, async (req: any, res) => {
    try {
      const result = await verifyEmailConnection();
      res.json(result);
    } catch (error: any) {
      console.error("Email test error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // Business Routes (Protected)
  // ============================================
  app.get("/api/business", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      res.json(business);
    } catch (error) {
      console.error("Error fetching business:", error);
      res.status(500).json({ message: "Failed to fetch business" });
    }
  });

  app.post("/api/business", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Check if user already has a business
      const existing = await storage.getBusinessByOwnerId(userId);
      if (existing) {
        return res.status(400).json({ message: "Business already exists" });
      }

      // Check if slug is unique
      const slugExists = await storage.getBusinessBySlug(req.body.slug);
      if (slugExists) {
        return res.status(400).json({ message: "URL slug already taken" });
      }

      const data = insertBusinessSchema.parse({
        ...req.body,
        ownerId: userId,
      });

      const business = await storage.createBusiness(data);
      res.json(business);
    } catch (error) {
      console.error("Error creating business:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create business" });
    }
  });

  app.patch("/api/business", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      // Check if new slug is unique (if changed)
      if (req.body.slug && req.body.slug !== business.slug) {
        const slugExists = await storage.getBusinessBySlug(req.body.slug);
        if (slugExists) {
          return res.status(400).json({ message: "URL slug already taken" });
        }
      }

      const updated = await storage.updateBusiness(business.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating business:", error);
      res.status(500).json({ message: "Failed to update business" });
    }
  });

  app.delete("/api/business", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      await storage.deleteBusiness(business.id);
      res.json({ message: "Business deleted successfully" });
    } catch (error) {
      console.error("Error deleting business:", error);
      res.status(500).json({ message: "Failed to delete business" });
    }
  });

  // ============================================
  // Service Routes (Protected)
  // ============================================
  app.get("/api/services", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const services = await storage.getServicesByBusinessId(business.id);
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.post("/api/services", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      // Ensure price is a string for decimal compatibility
      const serviceData = {
        ...req.body,
        businessId: business.id,
        price: String(req.body.price),
      };

      const data = insertServiceSchema.parse(serviceData);

      const service = await storage.createService(data);
      res.json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  app.patch("/api/services/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const service = await storage.getServiceById(req.params.id);
      if (!service || service.businessId !== business.id) {
        return res.status(404).json({ message: "Service not found" });
      }

      const updated = await storage.updateService(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  app.delete("/api/services/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const service = await storage.getServiceById(req.params.id);
      if (!service || service.businessId !== business.id) {
        return res.status(404).json({ message: "Service not found" });
      }

      await storage.deleteService(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  // Update service image after upload
  app.put("/api/services/:id/image", isAuthenticated, async (req: any, res) => {
    if (!req.body.imageUrl) {
      return res.status(400).json({ error: "imageUrl is required" });
    }

    const userId = req.user?.claims?.sub;
    const business = await storage.getBusinessByOwnerId(userId);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const service = await storage.getServiceById(req.params.id);
    if (!service || service.businessId !== business.id) {
      return res.status(404).json({ error: "Service not found" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageUrl,
        {
          owner: userId,
          visibility: "public",
        },
      );

      const updated = await storage.updateService(req.params.id, { imageUrl: objectPath });
      res.json(updated);
    } catch (error) {
      console.error("Error updating service image:", error);
      res.status(500).json({ error: "Failed to update service image" });
    }
  });

  // ============================================
  // Team Member Routes (Protected)
  // ============================================
  app.get("/api/team", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const teamMembersList = await storage.getTeamMembersByBusinessId(business.id);
      res.json(teamMembersList);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Team members with availability (for bookings team load view)
  app.get("/api/team-members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const teamMembersList = await storage.getTeamMembersByBusinessId(business.id);

      // Return team members with their availability
      const membersWithAvailability = await Promise.all(
        teamMembersList.map(async (member) => {
          const memberAvailability = await storage.getTeamMemberAvailability(member.id);
          return {
            ...member,
            availability: memberAvailability,
          };
        })
      );

      res.json(membersWithAvailability);
    } catch (error) {
      console.error("Error fetching team members with availability:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post("/api/team", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const member = await storage.createTeamMember({
        ...req.body,
        businessId: business.id,
      });
      res.json(member);
    } catch (error) {
      console.error("Error creating team member:", error);
      res.status(500).json({ message: "Failed to create team member" });
    }
  });

  app.get("/api/team/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const member = await storage.getTeamMemberById(req.params.id);
      if (!member || member.businessId !== business.id) {
        return res.status(404).json({ message: "Team member not found" });
      }

      res.json(member);
    } catch (error) {
      console.error("Error fetching team member:", error);
      res.status(500).json({ message: "Failed to fetch team member" });
    }
  });

  app.patch("/api/team/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const member = await storage.getTeamMemberById(req.params.id);
      if (!member || member.businessId !== business.id) {
        return res.status(404).json({ message: "Team member not found" });
      }

      const updated = await storage.updateTeamMember(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  app.delete("/api/team/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const member = await storage.getTeamMemberById(req.params.id);
      if (!member || member.businessId !== business.id) {
        return res.status(404).json({ message: "Team member not found" });
      }

      await storage.deleteTeamMember(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting team member:", error);
      res.status(500).json({ message: "Failed to delete team member" });
    }
  });

  // Team member photo upload
  app.put("/api/team/:id/photo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const member = await storage.getTeamMemberById(req.params.id);
      if (!member || member.businessId !== business.id) {
        return res.status(404).json({ message: "Team member not found" });
      }

      if (!req.body.photoURL) {
        return res.status(400).json({ error: "photoURL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.photoURL,
        {
          owner: userId,
          visibility: "public",
        },
      );

      const updated = await storage.updateTeamMember(req.params.id, {
        photoUrl: objectPath,
      });

      res.status(200).json({
        objectPath: objectPath,
        teamMember: updated,
      });
    } catch (error) {
      console.error("Error setting team member photo:", error);
      res.status(500).json({ message: "Failed to set team member photo" });
    }
  });

  // Team member services
  app.get("/api/team/:id/services", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const member = await storage.getTeamMemberById(req.params.id);
      if (!member || member.businessId !== business.id) {
        return res.status(404).json({ message: "Team member not found" });
      }

      const memberServices = await storage.getTeamMemberServices(req.params.id);
      res.json(memberServices.map(ms => ms.serviceId));
    } catch (error) {
      console.error("Error fetching team member services:", error);
      res.status(500).json({ message: "Failed to fetch team member services" });
    }
  });

  app.put("/api/team/:id/services", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const member = await storage.getTeamMemberById(req.params.id);
      if (!member || member.businessId !== business.id) {
        return res.status(404).json({ message: "Team member not found" });
      }

      const { serviceIds } = req.body;

      // Validate serviceIds is an array of strings
      if (!Array.isArray(serviceIds)) {
        return res.status(400).json({ message: "serviceIds must be an array" });
      }

      // Filter to only valid service IDs that belong to this business
      const businessServices = await storage.getServicesByBusinessId(business.id);
      const validServiceIds = serviceIds.filter((id: string) =>
        typeof id === 'string' && businessServices.some(s => s.id === id)
      );

      await storage.setTeamMemberServices(req.params.id, validServiceIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating team member services:", error);
      res.status(500).json({ message: "Failed to update team member services" });
    }
  });

  // Team member availability
  app.get("/api/team/:id/availability", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const member = await storage.getTeamMemberById(req.params.id);
      if (!member || member.businessId !== business.id) {
        return res.status(404).json({ message: "Team member not found" });
      }

      const avail = await storage.getTeamMemberAvailability(req.params.id);
      res.json(avail);
    } catch (error) {
      console.error("Error fetching team member availability:", error);
      res.status(500).json({ message: "Failed to fetch team member availability" });
    }
  });

  app.post("/api/team/:id/availability", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const member = await storage.getTeamMemberById(req.params.id);
      if (!member || member.businessId !== business.id) {
        return res.status(404).json({ message: "Team member not found" });
      }

      const { dayOfWeek, startTime, endTime, isAvailable } = req.body;

      // Validate required fields
      if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
        return res.status(400).json({ message: "dayOfWeek must be a number between 0 and 6" });
      }
      if (typeof startTime !== 'string' || !/^\d{2}:\d{2}$/.test(startTime)) {
        return res.status(400).json({ message: "startTime must be in HH:MM format" });
      }
      if (typeof endTime !== 'string' || !/^\d{2}:\d{2}$/.test(endTime)) {
        return res.status(400).json({ message: "endTime must be in HH:MM format" });
      }

      const avail = await storage.upsertTeamMemberAvailability({
        teamMemberId: req.params.id,
        dayOfWeek,
        startTime,
        endTime,
        isAvailable: isAvailable ?? true,
      });
      res.json(avail);
    } catch (error) {
      console.error("Error updating team member availability:", error);
      res.status(500).json({ message: "Failed to update team member availability" });
    }
  });

  // ============================================
  // Availability Routes (Protected)
  // ============================================
  app.get("/api/availability", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const avail = await storage.getAvailabilityByBusinessId(business.id);
      res.json(avail);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.post("/api/availability", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const avail = await storage.upsertAvailability({
        ...req.body,
        businessId: business.id,
      });
      res.json(avail);
    } catch (error) {
      console.error("Error saving availability:", error);
      res.status(500).json({ message: "Failed to save availability" });
    }
  });

  // ============================================
  // Blocked Time Routes (Protected)
  // ============================================
  app.get("/api/blocked-times", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const blocked = await storage.getBlockedTimesByBusinessId(business.id);
      res.json(blocked);
    } catch (error) {
      console.error("Error fetching blocked times:", error);
      res.status(500).json({ message: "Failed to fetch blocked times" });
    }
  });

  app.post("/api/blocked-times", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const blocked = await storage.createBlockedTime({
        ...req.body,
        businessId: business.id,
        startDateTime: new Date(req.body.startDateTime),
        endDateTime: new Date(req.body.endDateTime),
      });
      res.json(blocked);
    } catch (error) {
      console.error("Error creating blocked time:", error);
      res.status(500).json({ message: "Failed to create blocked time" });
    }
  });

  app.delete("/api/blocked-times/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      await storage.deleteBlockedTime(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting blocked time:", error);
      res.status(500).json({ message: "Failed to delete blocked time" });
    }
  });

  // ============================================
  // Booking Routes (Protected)
  // ============================================

  // Create a booking manually (business owner)
  app.post("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      // Validate required fields
      const { serviceId, bookingDate, startTime, customerName, customerEmail } = req.body;
      if (!serviceId || !bookingDate || !startTime || !customerName || !customerEmail) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate time format (HH:MM) with valid ranges
      const timeRegex = /^\d{2}:\d{2}$/;
      if (!timeRegex.test(startTime)) {
        return res.status(400).json({ message: "startTime must be in HH:MM format" });
      }

      // Validate time values are within valid ranges
      const [startHour, startMin] = startTime.split(":").map(Number);
      if (startHour < 0 || startHour > 23 || startMin < 0 || startMin > 59) {
        return res.status(400).json({ message: "Invalid start time values" });
      }

      // Validate service exists and belongs to business
      const service = await storage.getServiceById(serviceId);
      if (!service || service.businessId !== business.id) {
        return res.status(400).json({ message: "Invalid service" });
      }

      // Calculate end time from service duration if not provided
      let endTime = req.body.endTime;
      if (!endTime) {
        const [hours, minutes] = startTime.split(":").map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + service.duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        endTime = `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
      } else if (!timeRegex.test(endTime)) {
        return res.status(400).json({ message: "endTime must be in HH:MM format" });
      }

      // Validate end time values are within valid ranges
      const [endHour, endMin] = endTime.split(":").map(Number);
      if (endHour < 0 || endHour > 23 || endMin < 0 || endMin > 59) {
        return res.status(400).json({ message: "Invalid end time values" });
      }

      // Validate end time is after start time
      if (endTime <= startTime) {
        return res.status(400).json({ message: "End time must be after start time" });
      }

      // Validate customer name and email are strings
      if (typeof customerName !== 'string' || customerName.trim().length === 0) {
        return res.status(400).json({ message: "Customer name is required" });
      }
      if (typeof customerEmail !== 'string' || !customerEmail.includes('@')) {
        return res.status(400).json({ message: "Valid customer email is required" });
      }

      // Parse and validate booking date
      const parsedBookingDate = new Date(bookingDate);
      if (isNaN(parsedBookingDate.getTime())) {
        return res.status(400).json({ message: "Invalid booking date" });
      }

      // Check for double booking
      const existingBookings = await storage.getBookingsByDateRange(
        business.id,
        startOfDay(parsedBookingDate),
        endOfDay(parsedBookingDate)
      );

      const hasConflict = existingBookings.some((existing) => {
        if (existing.status === "cancelled") return false;
        return (
          (startTime >= existing.startTime && startTime < existing.endTime) ||
          (endTime > existing.startTime && endTime <= existing.endTime) ||
          (startTime <= existing.startTime && endTime >= existing.endTime)
        );
      });

      if (hasConflict) {
        return res.status(400).json({
          message: "Time slot not available",
          error: "slot_conflict",
          details: "This time slot has already been booked. Please select a different time."
        });
      }

      // Manual bookings created by business owner are confirmed by default
      const booking = await storage.createBooking({
        businessId: business.id,
        serviceId: serviceId,
        teamMemberId: req.body.teamMemberId || null,
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: req.body.customerPhone || null,
        customerNotes: req.body.customerNotes || null,
        bookingDate: parsedBookingDate,
        startTime: startTime,
        endTime: endTime,
        status: "confirmed",
      });

      // Send confirmation email to customer
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      sendBookingEmails({
        booking,
        service,
        business,
        language: req.body.preferredLanguage === "es" ? "es" : "en",
        baseUrl,
      }).catch((err) => {
        console.error("Failed to send booking emails:", err);
      });

      res.json(booking);
    } catch (error) {
      console.error("Error creating manual booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const bookingsList = await storage.getBookingsByBusinessId(business.id);
      res.json(bookingsList);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.patch("/api/bookings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const booking = await storage.getBookingById(req.params.id);
      if (!booking || booking.businessId !== business.id) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const updated = await storage.updateBooking(req.params.id, req.body);

      // Send confirmation email when booking is confirmed (for services requiring confirmation)
      if (req.body.status === "confirmed" && booking.status === "pending") {
        const service = await storage.getServiceById(booking.serviceId);
        if (service && service.requiresConfirmation && updated) {
          const baseUrl = `${req.protocol}://${req.get("host")}`;
          sendBookingEmails({
            booking: updated,
            service,
            business,
            language: "en", // Default to English for business-confirmed bookings
            baseUrl,
          }).catch((err) => {
            console.error("Failed to send confirmation emails:", err);
          });
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Request modification - business owner proposes a new date/time
  app.post("/api/bookings/:id/request-modification", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const booking = await storage.getBookingById(req.params.id);
      if (!booking || booking.businessId !== business.id) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Validate input
      const { proposedBookingDate, proposedStartTime, proposedEndTime, modificationReason } = req.body;
      if (!proposedBookingDate || !proposedStartTime || !proposedEndTime) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Generate modification token
      const modificationToken = randomBytes(32).toString("hex");
      const modificationTokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

      // Update booking with proposed changes
      const updated = await storage.updateBooking(req.params.id, {
        proposedBookingDate: new Date(proposedBookingDate),
        proposedStartTime,
        proposedEndTime,
        modificationToken,
        modificationTokenExpiresAt,
        modificationReason: modificationReason || null,
        status: "modification_pending",
      });

      // Get service for email
      const service = await storage.getServiceById(booking.serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      // Send modification request email to customer
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      sendModificationRequestEmail({
        booking,
        service,
        business,
        proposedDate: new Date(proposedBookingDate),
        proposedStartTime,
        proposedEndTime,
        modificationReason,
        modificationToken,
        baseUrl,
        language: "en", // Default to English, could be enhanced to use customer preference
      }).catch((err) => {
        console.error("Failed to send modification request email:", err);
      });

      res.json(updated);
    } catch (error) {
      console.error("Error requesting modification:", error);
      res.status(500).json({ message: "Failed to request modification" });
    }
  });

  // ============================================
  // Public Routes (for customer booking page)
  // ============================================

  // ICS Calendar Download for Apple Calendar (secured via customer action token)
  app.get("/api/calendar/ics/:bookingId", async (req, res) => {
    try {
      const { token } = req.query;

      // Require a customer action token for security
      // Use uniform 404 response for all failures to prevent information disclosure
      if (!token || typeof token !== "string") {
        return res.status(404).json({ message: "Calendar event not found" });
      }

      const booking = await storage.getBookingById(req.params.bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Calendar event not found" });
      }

      // Validate the token matches the booking's customer action token
      // Use same 404 response to prevent token enumeration
      if (booking.customerActionToken !== token) {
        return res.status(404).json({ message: "Calendar event not found" });
      }

      const service = await storage.getServiceById(booking.serviceId);
      const business = await storage.getBusinessById(booking.businessId);

      if (!service || !business) {
        return res.status(404).json({ message: "Service or business not found" });
      }

      const bookingDate = new Date(booking.bookingDate);
      const [startHour, startMin] = booking.startTime.split(":").map(Number);
      const [endHour, endMin] = booking.endTime.split(":").map(Number);

      const startDateTime = new Date(bookingDate);
      startDateTime.setHours(startHour, startMin, 0, 0);

      const endDateTime = new Date(bookingDate);
      endDateTime.setHours(endHour, endMin, 0, 0);

      const formatICS = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

      // Escape special characters for ICS format
      const escapeICS = (text: string) => text.replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n");

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FlowLift//Booking//EN
BEGIN:VEVENT
UID:${booking.id}@flowlift.co
DTSTART:${formatICS(startDateTime)}
DTEND:${formatICS(endDateTime)}
SUMMARY:${escapeICS(service.name)} at ${escapeICS(business.name)}
DESCRIPTION:Booking for ${escapeICS(service.name)}. Duration: ${service.duration} minutes
LOCATION:${escapeICS(business.address || "")}
END:VEVENT
END:VCALENDAR`;

      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="booking-${booking.id}.ics"`);
      res.send(icsContent);
    } catch (error) {
      console.error("Error generating ICS file:", error);
      res.status(500).json({ message: "Failed to generate calendar file" });
    }
  });

  app.get("/api/public/business/:slug", async (req, res) => {
    try {
      const business = await storage.getBusinessBySlug(req.params.slug);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      res.json(business);
    } catch (error) {
      console.error("Error fetching business:", error);
      res.status(500).json({ message: "Failed to fetch business" });
    }
  });

  app.get("/api/public/services/:slug", async (req, res) => {
    try {
      const business = await storage.getBusinessBySlug(req.params.slug);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const services = await storage.getServicesByBusinessId(business.id);
      // Only return active services
      res.json(services.filter(s => s.isActive));
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/public/availability/:slug", async (req, res) => {
    try {
      const business = await storage.getBusinessBySlug(req.params.slug);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const avail = await storage.getAvailabilityByBusinessId(business.id);
      res.json(avail);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // Get team members for a specific service (for customer booking flow)
  app.get("/api/public/team-members/:serviceId", async (req, res) => {
    try {
      const serviceId = req.params.serviceId;
      const service = await storage.getServiceById(serviceId);

      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      const teamMembersList = await storage.getTeamMembersByServiceId(serviceId);

      // Return team members with their availability
      const membersWithAvailability = await Promise.all(
        teamMembersList.map(async (member) => {
          const memberAvailability = await storage.getTeamMemberAvailability(member.id);
          return {
            ...member,
            availability: memberAvailability,
          };
        })
      );

      res.json(membersWithAvailability);
    } catch (error) {
      console.error("Error fetching team members for service:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Get modification details by token - MUST be before :slug/:date route
  app.get("/api/public/bookings/modification/:token", async (req, res) => {
    try {
      const booking = await storage.getBookingByModificationToken(req.params.token);
      if (!booking) {
        return res.status(404).json({ message: "Modification request not found" });
      }

      // Check if token has expired
      if (booking.modificationTokenExpiresAt && new Date() > new Date(booking.modificationTokenExpiresAt)) {
        return res.status(400).json({ message: "Modification request has expired" });
      }

      // Get service and business info
      const service = await storage.getServiceById(booking.serviceId);
      const business = await storage.getBusinessById(booking.businessId);

      if (!service || !business) {
        return res.status(404).json({ message: "Service or business not found" });
      }

      res.json({
        booking: {
          id: booking.id,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          bookingDate: booking.bookingDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          proposedBookingDate: booking.proposedBookingDate,
          proposedStartTime: booking.proposedStartTime,
          proposedEndTime: booking.proposedEndTime,
          modificationReason: booking.modificationReason,
        },
        service: {
          id: service.id,
          name: service.name,
          duration: service.duration,
          price: service.price,
        },
        business: {
          id: business.id,
          name: business.name,
        },
      });
    } catch (error) {
      console.error("Error fetching modification details:", error);
      res.status(500).json({ message: "Failed to fetch modification details" });
    }
  });

  // Confirm modification - customer approves the proposed changes - MUST be before :slug route
  app.post("/api/public/bookings/confirm-modification", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const booking = await storage.getBookingByModificationToken(token);
      if (!booking) {
        return res.status(404).json({ message: "Modification request not found" });
      }

      // Check if token has expired
      if (booking.modificationTokenExpiresAt && new Date() > new Date(booking.modificationTokenExpiresAt)) {
        return res.status(400).json({ message: "Modification request has expired" });
      }

      // Check that proposed values exist
      if (!booking.proposedBookingDate || !booking.proposedStartTime || !booking.proposedEndTime) {
        return res.status(400).json({ message: "Invalid modification request" });
      }

      // Apply the proposed changes
      const updated = await storage.updateBooking(booking.id, {
        bookingDate: booking.proposedBookingDate,
        startTime: booking.proposedStartTime,
        endTime: booking.proposedEndTime,
        status: "confirmed",
        // Clear modification fields
        proposedBookingDate: null,
        proposedStartTime: null,
        proposedEndTime: null,
        modificationToken: null,
        modificationTokenExpiresAt: null,
        modificationReason: null,
      });

      // Get service and business for confirmation email
      const service = await storage.getServiceById(booking.serviceId);
      const business = await storage.getBusinessById(booking.businessId);

      if (service && business && updated) {
        // Send confirmation email with new booking details
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        sendBookingEmails({
          booking: updated,
          service,
          business,
          language: "en",
          baseUrl,
        }).catch((err) => {
          console.error("Failed to send confirmation emails:", err);
        });
      }

      res.json({ success: true, booking: updated });
    } catch (error) {
      console.error("Error confirming modification:", error);
      res.status(500).json({ message: "Failed to confirm modification" });
    }
  });

  // Get booking details by customer action token - for modify/cancel pages
  app.get("/api/public/bookings/customer-action/:token", async (req, res) => {
    try {
      const booking = await storage.getBookingByCustomerActionToken(req.params.token);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Don't allow actions on cancelled bookings
      if (booking.status === "cancelled") {
        return res.status(400).json({ message: "This booking has already been cancelled" });
      }

      // Get service and business info
      const service = await storage.getServiceById(booking.serviceId);
      const business = await storage.getBusinessById(booking.businessId);

      if (!service || !business) {
        return res.status(404).json({ message: "Service or business not found" });
      }

      res.json({
        booking: {
          id: booking.id,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          bookingDate: booking.bookingDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status,
        },
        service: {
          id: service.id,
          name: service.name,
          duration: service.duration,
          price: service.price,
        },
        business: {
          id: business.id,
          name: business.name,
          email: business.email,
          phone: business.phone,
        },
      });
    } catch (error) {
      console.error("Error fetching booking for customer action:", error);
      res.status(500).json({ message: "Failed to fetch booking details" });
    }
  });

  // Customer cancels their booking
  app.post("/api/public/bookings/customer-cancel", async (req, res) => {
    try {
      const { token, reason } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const booking = await storage.getBookingByCustomerActionToken(token);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Don't allow cancelling already cancelled bookings
      if (booking.status === "cancelled") {
        return res.status(400).json({ message: "This booking has already been cancelled" });
      }

      // Update the booking to cancelled status
      const updated = await storage.updateBooking(booking.id, {
        status: "cancelled",
        cancellationReason: reason || null,
      });

      // Get service and business for notification
      const service = await storage.getServiceById(booking.serviceId);
      const business = await storage.getBusinessById(booking.businessId);

      // TODO: Send cancellation notification email to business

      res.json({ success: true, booking: updated });
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  // Customer modifies their booking
  app.post("/api/public/bookings/customer-modify", async (req, res) => {
    try {
      const { token, newDate, newStartTime, newEndTime } = req.body;
      if (!token || !newDate || !newStartTime || !newEndTime) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const booking = await storage.getBookingByCustomerActionToken(token);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Don't allow modifying cancelled bookings
      if (booking.status === "cancelled") {
        return res.status(400).json({ message: "Cannot modify a cancelled booking" });
      }

      // Get service and business for validation
      const service = await storage.getServiceById(booking.serviceId);
      const business = await storage.getBusinessById(booking.businessId);

      if (!service || !business) {
        return res.status(404).json({ message: "Service or business not found" });
      }

      // Check for double-booking
      const bookingDate = new Date(newDate);
      const existingBookings = await storage.getBookingsByDateRange(
        business.id,
        startOfDay(bookingDate),
        endOfDay(bookingDate)
      );

      const hasConflict = existingBookings.some((b) => {
        if (b.id === booking.id || b.status === "cancelled") return false;
        return !(newEndTime <= b.startTime || newStartTime >= b.endTime);
      });

      if (hasConflict) {
        return res.status(400).json({ message: "This time slot is no longer available" });
      }

      // Update the booking with new time
      const updated = await storage.updateBooking(booking.id, {
        bookingDate,
        startTime: newStartTime,
        endTime: newEndTime,
        status: "confirmed", // Reset to confirmed if it was pending
      });

      // Send confirmation email with new details
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      await sendBookingEmails({
        booking: updated!,
        service,
        business,
        language: (booking as any).preferredLanguage || "en",
        baseUrl,
      });

      res.json({ success: true, booking: updated });
    } catch (error) {
      console.error("Error modifying booking:", error);
      res.status(500).json({ message: "Failed to modify booking" });
    }
  });

  app.get("/api/public/bookings/:slug/:date", async (req, res) => {
    try {
      const business = await storage.getBusinessBySlug(req.params.slug);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      // Get date from path param
      const dateStr = req.params.date as string;
      if (!dateStr) {
        return res.json([]);
      }

      const date = new Date(decodeURIComponent(dateStr));
      const bookingsList = await storage.getBookingsByDateRange(
        business.id,
        startOfDay(date),
        endOfDay(date)
      );

      // Only return necessary info (not customer details)
      res.json(
        bookingsList.map((b) => ({
          id: b.id,
          serviceId: b.serviceId,
          bookingDate: b.bookingDate,
          startTime: b.startTime,
          endTime: b.endTime,
          status: b.status,
        }))
      );
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.post("/api/public/bookings/:slug", async (req, res) => {
    try {
      const business = await storage.getBusinessBySlug(req.params.slug);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      // Validate service exists and belongs to business
      const service = await storage.getServiceById(req.body.serviceId);
      if (!service || service.businessId !== business.id) {
        return res.status(400).json({ message: "Invalid service" });
      }

      // Check for double booking
      const bookingDate = new Date(req.body.bookingDate);
      const existingBookings = await storage.getBookingsByDateRange(
        business.id,
        startOfDay(bookingDate),
        endOfDay(bookingDate)
      );

      const hasConflict = existingBookings.some((existing) => {
        if (existing.status === "cancelled") return false;
        return (
          (req.body.startTime >= existing.startTime && req.body.startTime < existing.endTime) ||
          (req.body.endTime > existing.startTime && req.body.endTime <= existing.endTime) ||
          (req.body.startTime <= existing.startTime && req.body.endTime >= existing.endTime)
        );
      });

      if (hasConflict) {
        return res.status(400).json({
          message: "Time slot not available",
          error: "slot_conflict",
          details: "This time slot has already been booked. Please select a different time."
        });
      }

      // Set booking status based on whether service requires confirmation
      const bookingStatus = service.requiresConfirmation ? "pending" : "confirmed";

      const booking = await storage.createBooking({
        businessId: business.id,
        serviceId: req.body.serviceId,
        teamMemberId: req.body.teamMemberId || null,
        customerName: req.body.customerName,
        customerEmail: req.body.customerEmail,
        customerPhone: req.body.customerPhone || null,
        customerNotes: req.body.customerNotes || null,
        bookingDate: bookingDate,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        status: bookingStatus,
      });

      // Only send confirmation emails if service doesn't require manual confirmation
      // For services requiring confirmation, emails will be sent when business owner confirms
      if (!service.requiresConfirmation) {
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        sendBookingEmails({
          booking,
          service,
          business,
          language: req.body.preferredLanguage === "es" ? "es" : "en",
          baseUrl,
        }).catch((err) => {
          console.error("Failed to send booking emails:", err);
        });
      }

      // Return booking with requiresConfirmation flag for UI to handle display
      res.json({ ...booking, requiresConfirmation: service.requiresConfirmation });
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // ============================================
  // Object Storage Routes
  // ============================================

  // Serve public objects
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve objects - public visibility objects don't require auth
  app.get("/objects/:objectPath(*)", async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);

      // Check if object has public visibility
      const canAccessPublic = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: undefined,
        requestedPermission: ObjectPermission.READ,
      });

      if (canAccessPublic) {
        return objectStorageService.downloadObject(objectFile, res);
      }

      // If not public, require auth
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.sendStatus(401);
      }

      const userId = req.user?.claims?.sub;
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });

      if (!canAccess) {
        return res.sendStatus(401);
      }

      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL for logo
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Update business logo after upload
  app.put("/api/business/logo", isAuthenticated, async (req: any, res) => {
    if (!req.body.logoURL) {
      return res.status(400).json({ error: "logoURL is required" });
    }

    const userId = req.user?.claims?.sub;
    const business = await storage.getBusinessByOwnerId(userId);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.logoURL,
        {
          owner: userId,
          visibility: "public",
        },
      );

      // Update business with logo path
      const updated = await storage.updateBusiness(business.id, {
        logoUrl: objectPath,
      });

      res.status(200).json({
        objectPath: objectPath,
        business: updated,
      });
    } catch (error) {
      console.error("Error setting business logo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // Customer Authentication Routes (Magic Link)
  // ============================================

  // Request magic link to view bookings
  app.post("/api/customer/request-access", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if customer exists, create if not
      let customer = await storage.getCustomerByEmail(normalizedEmail);
      if (!customer) {
        // Check if there are any bookings for this email
        const bookings = await storage.getCustomerBookingsByEmail(normalizedEmail);
        if (bookings.length === 0) {
          return res.status(404).json({ message: "No bookings found for this email" });
        }
        // Create customer account
        customer = await storage.createCustomer({ email: normalizedEmail });
      }

      // Generate secure token
      const token = randomBytes(32).toString("hex");
      const expiresAt = addHours(new Date(), 1);

      // Create token record
      await storage.createCustomerToken({
        customerId: customer.id,
        token,
        expiresAt,
      });

      // Get base URL from request
      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      // Send magic link email
      await sendMagicLinkEmail({
        email: normalizedEmail,
        token,
        baseUrl,
      });

      res.json({ message: "Access link sent to your email" });
    } catch (error) {
      console.error("Error requesting customer access:", error);
      res.status(500).json({ message: "Failed to send access link" });
    }
  });

  // Verify magic link token
  app.post("/api/customer/verify-token", async (req, res) => {
    try {
      const { token } = req.body;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Token is required" });
      }

      const tokenRecord = await storage.getValidToken(token);
      if (!tokenRecord) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      // Mark token as used
      await storage.markTokenAsUsed(tokenRecord.id);

      // Get customer
      const customer = await storage.getCustomerById(tokenRecord.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Generate a session token (simple approach for demo)
      const sessionToken = randomBytes(32).toString("hex");
      const sessionExpiresAt = addHours(new Date(), 24);

      // Create new session token
      await storage.createCustomerToken({
        customerId: customer.id,
        token: sessionToken,
        expiresAt: sessionExpiresAt,
      });

      res.json({
        customer,
        sessionToken,
        expiresAt: sessionExpiresAt,
      });
    } catch (error) {
      console.error("Error verifying token:", error);
      res.status(500).json({ message: "Failed to verify token" });
    }
  });

  // Get customer session from token
  app.get("/api/customer/session", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = authHeader.substring(7);
      if (!token || token.length < 32) {
        return res.status(401).json({ message: "Invalid token format" });
      }

      const tokenRecord = await storage.getValidToken(token);
      if (!tokenRecord) {
        return res.status(401).json({ message: "Invalid or expired session" });
      }

      // Double-check expiration
      if (new Date(tokenRecord.expiresAt) < new Date()) {
        return res.status(401).json({ message: "Session expired" });
      }

      const customer = await storage.getCustomerById(tokenRecord.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json({ customer });
    } catch (error) {
      console.error("Error getting customer session:", error);
      res.status(500).json({ message: "Failed to get session" });
    }
  });

  // Helper function to validate customer token
  async function validateCustomerToken(authHeader: string | undefined) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { error: "Unauthorized", status: 401 };
    }

    const token = authHeader.substring(7);
    if (!token || token.length < 32) {
      return { error: "Invalid token format", status: 401 };
    }

    const tokenRecord = await storage.getValidToken(token);
    if (!tokenRecord) {
      return { error: "Invalid or expired session", status: 401 };
    }

    // Double-check expiration
    if (new Date(tokenRecord.expiresAt) < new Date()) {
      return { error: "Session expired", status: 401 };
    }

    const customer = await storage.getCustomerById(tokenRecord.customerId);
    if (!customer) {
      return { error: "Customer not found", status: 404 };
    }

    return { customer };
  }

  // Get customer bookings
  app.get("/api/customer/bookings", async (req, res) => {
    try {
      const authResult = await validateCustomerToken(req.headers.authorization);
      if ("error" in authResult) {
        return res.status(authResult.status || 401).json({ message: authResult.error });
      }

      const { customer } = authResult;

      // Get all bookings for this customer's email only - scoped by email
      const customerBookings = await storage.getCustomerBookingsByEmail(customer.email);

      // Enrich bookings with service and business info
      const enrichedBookings = await Promise.all(
        customerBookings.map(async (booking) => {
          const service = await storage.getServiceById(booking.serviceId);
          const business = await storage.getBusinessById(booking.businessId);

          return {
            ...booking,
            service: service ? {
              id: service.id,
              name: service.name,
              duration: service.duration,
              price: service.price,
            } : null,
            business: business ? {
              id: business.id,
              name: business.name,
              slug: business.slug,
              phone: business.phone,
              email: business.email,
            } : null,
          };
        })
      );

      res.json(enrichedBookings);
    } catch (error) {
      console.error("Error fetching customer bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Cancel a booking (customer)
  app.post("/api/customer/bookings/:id/cancel", async (req, res) => {
    try {
      const authResult = await validateCustomerToken(req.headers.authorization);
      if ("error" in authResult) {
        return res.status(authResult.status || 401).json({ message: authResult.error });
      }

      const { customer } = authResult;

      const booking = await storage.getBookingById(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify the booking belongs to this customer by email (case-insensitive)
      if (booking.customerEmail.toLowerCase() !== customer.email.toLowerCase()) {
        console.warn(`Unauthorized cancel attempt: customer ${customer.email} tried to cancel booking ${req.params.id} belonging to ${booking.customerEmail}`);
        return res.status(403).json({ message: "Not authorized to cancel this booking" });
      }

      // Check if booking is already cancelled
      if (booking.status === "cancelled") {
        return res.status(400).json({ message: "Booking is already cancelled" });
      }

      // Check if booking is in the future (allow cancellation only for future bookings)
      const bookingDate = new Date(booking.bookingDate);
      const now = new Date();
      if (bookingDate < now) {
        return res.status(400).json({ message: "Cannot cancel past bookings" });
      }

      // Update booking status
      const updated = await storage.updateBooking(req.params.id, { status: "cancelled" });

      console.log(`Booking ${req.params.id} cancelled by customer ${customer.email}`);
      res.json(updated);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  // Customer logout
  app.post("/api/customer/logout", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const tokenRecord = await storage.getValidToken(token);
        if (tokenRecord) {
          await storage.markTokenAsUsed(tokenRecord.id);
        }
      }
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });
}
