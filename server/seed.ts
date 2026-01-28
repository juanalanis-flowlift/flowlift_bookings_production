import { db } from "./db";
import {
  users,
  businesses,
  services,
  availability,
  bookings,
} from "@shared/schema";
import { sql } from "drizzle-orm";
import { addDays, format } from "date-fns";

async function seed() {
  console.log("Seeding database...");

  // Create demo users
  const demoUsers = [
    {
      id: "demo-barber-owner",
      email: "barber@example.com",
      firstName: "Marcus",
      lastName: "Johnson",
    },
    {
      id: "demo-salon-owner",
      email: "salon@example.com",
      firstName: "Sarah",
      lastName: "Chen",
    },
    {
      id: "demo-rental-owner",
      email: "rentals@example.com",
      firstName: "Mike",
      lastName: "Rodriguez",
    },
  ];

  for (const user of demoUsers) {
    await db
      .insert(users)
      .values(user)
      .onConflictDoNothing();
  }
  console.log("Created demo users");

  // Create businesses
  const businessData = [
    {
      id: "biz-classic-cuts",
      ownerId: "demo-barber-owner",
      name: "Classic Cuts Barbershop",
      slug: "classic-cuts",
      description: "Traditional barbershop offering premium haircuts and grooming services for men. Expert barbers with over 20 years of combined experience.",
      category: "barber",
      address: "123 Main Street",
      city: "Brooklyn",
      country: "USA",
      phone: "+1 (555) 123-4567",
      email: "info@classiccuts.com",
    },
    {
      id: "biz-luxe-hair",
      ownerId: "demo-salon-owner",
      name: "Luxe Hair Studio",
      slug: "luxe-hair",
      description: "Award-winning hair salon specializing in color, styling, and treatments. Creating beautiful hair since 2015.",
      category: "hairdresser",
      address: "456 Fashion Ave",
      city: "Manhattan",
      country: "USA",
      phone: "+1 (555) 987-6543",
      email: "hello@luxehair.com",
    },
    {
      id: "biz-bounce-party",
      ownerId: "demo-rental-owner",
      name: "Bounce Party Rentals",
      slug: "bounce-party",
      description: "Make your event unforgettable with our premium inflatable rentals! Perfect for birthday parties, corporate events, and community gatherings.",
      category: "inflatable_rentals",
      address: "789 Event Plaza",
      city: "Austin",
      country: "USA",
      phone: "+1 (555) 456-7890",
      email: "bookings@bounceparty.com",
    },
  ];

  for (const biz of businessData) {
    await db
      .insert(businesses)
      .values(biz)
      .onConflictDoNothing();
  }
  console.log("Created businesses");

  // Create services for Classic Cuts Barbershop
  const barberServices = [
    {
      id: "srv-haircut",
      businessId: "biz-classic-cuts",
      name: "Classic Haircut",
      description: "Traditional haircut with hot towel and neck shave",
      duration: 30,
      price: "25.00",
      tags: ["haircut", "men", "classic"],
      isActive: true,
    },
    {
      id: "srv-beard-trim",
      businessId: "biz-classic-cuts",
      name: "Beard Trim & Shape",
      description: "Professional beard grooming and shaping",
      duration: 20,
      price: "15.00",
      tags: ["beard", "grooming"],
      isActive: true,
    },
    {
      id: "srv-premium-cut",
      businessId: "biz-classic-cuts",
      name: "Premium Cut & Style",
      description: "Haircut with styling, hot towel, and scalp massage",
      duration: 45,
      price: "40.00",
      tags: ["haircut", "premium", "styling"],
      isActive: true,
    },
    {
      id: "srv-kids-cut",
      businessId: "biz-classic-cuts",
      name: "Kids Haircut",
      description: "Gentle haircut for children under 12",
      duration: 20,
      price: "18.00",
      tags: ["kids", "haircut"],
      isActive: true,
    },
  ];

  // Create services for Luxe Hair Studio
  const salonServices = [
    {
      id: "srv-cut-style",
      businessId: "biz-luxe-hair",
      name: "Cut & Style",
      description: "Precision cut with professional styling and blowout",
      duration: 60,
      price: "75.00",
      tags: ["haircut", "styling", "women"],
      isActive: true,
    },
    {
      id: "srv-color",
      businessId: "biz-luxe-hair",
      name: "Full Color",
      description: "Single process color with deep conditioning treatment",
      duration: 120,
      price: "120.00",
      tags: ["color", "treatment"],
      isActive: true,
    },
    {
      id: "srv-highlights",
      businessId: "biz-luxe-hair",
      name: "Highlights / Balayage",
      description: "Hand-painted or foil highlights for natural dimension",
      duration: 150,
      price: "180.00",
      tags: ["highlights", "balayage", "color"],
      isActive: true,
    },
    {
      id: "srv-blowout",
      businessId: "biz-luxe-hair",
      name: "Express Blowout",
      description: "Quick wash and professional blowout styling",
      duration: 30,
      price: "45.00",
      tags: ["blowout", "styling"],
      isActive: true,
    },
  ];

  // Create services for Bounce Party Rentals
  const rentalServices = [
    {
      id: "srv-bounce-castle",
      businessId: "biz-bounce-party",
      name: "Classic Bounce Castle",
      description: "15x15 ft colorful bounce house, perfect for up to 8 kids",
      duration: 240,
      price: "175.00",
      tags: ["bounce house", "kids party", "birthday"],
      isActive: true,
    },
    {
      id: "srv-water-slide",
      businessId: "biz-bounce-party",
      name: "Water Slide Combo",
      description: "18 ft water slide with splash pool - summer favorite!",
      duration: 240,
      price: "275.00",
      tags: ["water slide", "summer", "outdoor"],
      isActive: true,
    },
    {
      id: "srv-obstacle-course",
      businessId: "biz-bounce-party",
      name: "Mega Obstacle Course",
      description: "40 ft obstacle course with climbing walls and slides",
      duration: 240,
      price: "350.00",
      tags: ["obstacle course", "corporate", "team building"],
      isActive: true,
    },
    {
      id: "srv-party-package",
      businessId: "biz-bounce-party",
      name: "Party Package",
      description: "Bounce house + tables + chairs for 20 guests",
      duration: 300,
      price: "399.00",
      tags: ["package", "full service", "birthday"],
      isActive: true,
    },
  ];

  const allServices = [...barberServices, ...salonServices, ...rentalServices];
  for (const service of allServices) {
    await db
      .insert(services)
      .values(service)
      .onConflictDoNothing();
  }
  console.log("Created services");

  // Create availability for all businesses
  const businessIds = ["biz-classic-cuts", "biz-luxe-hair", "biz-bounce-party"];
  
  for (const businessId of businessIds) {
    const isRental = businessId === "biz-bounce-party";
    
    for (let day = 0; day < 7; day++) {
      const isWeekend = day === 0 || day === 6;
      
      await db
        .insert(availability)
        .values({
          businessId,
          dayOfWeek: day,
          startTime: isRental ? "08:00" : (isWeekend ? "10:00" : "09:00"),
          endTime: isRental ? "18:00" : (isWeekend ? "17:00" : "19:00"),
          isOpen: isRental ? (day !== 0) : true, // Rental closed Sundays
          slotDuration: isRental ? 60 : 30,
        })
        .onConflictDoNothing();
    }
  }
  console.log("Created availability");

  // Create sample bookings
  const today = new Date();
  const sampleBookings = [
    // Barber bookings
    {
      businessId: "biz-classic-cuts",
      serviceId: "srv-haircut",
      customerName: "John Smith",
      customerEmail: "john.smith@email.com",
      customerPhone: "+1 (555) 111-2222",
      bookingDate: addDays(today, 1),
      startTime: "10:00",
      endTime: "10:30",
      status: "confirmed",
    },
    {
      businessId: "biz-classic-cuts",
      serviceId: "srv-premium-cut",
      customerName: "David Lee",
      customerEmail: "david.lee@email.com",
      bookingDate: addDays(today, 1),
      startTime: "14:00",
      endTime: "14:45",
      status: "pending",
    },
    {
      businessId: "biz-classic-cuts",
      serviceId: "srv-beard-trim",
      customerName: "Mike Wilson",
      customerEmail: "mike.w@email.com",
      bookingDate: addDays(today, 2),
      startTime: "11:00",
      endTime: "11:20",
      status: "confirmed",
    },
    // Salon bookings
    {
      businessId: "biz-luxe-hair",
      serviceId: "srv-cut-style",
      customerName: "Emily Johnson",
      customerEmail: "emily.j@email.com",
      customerPhone: "+1 (555) 333-4444",
      bookingDate: addDays(today, 1),
      startTime: "09:00",
      endTime: "10:00",
      status: "confirmed",
    },
    {
      businessId: "biz-luxe-hair",
      serviceId: "srv-highlights",
      customerName: "Jessica Brown",
      customerEmail: "jess.brown@email.com",
      customerNotes: "First time client, wants subtle highlights",
      bookingDate: addDays(today, 3),
      startTime: "13:00",
      endTime: "15:30",
      status: "pending",
    },
    // Rental bookings
    {
      businessId: "biz-bounce-party",
      serviceId: "srv-bounce-castle",
      customerName: "Amy Martinez",
      customerEmail: "amy.m@email.com",
      customerPhone: "+1 (555) 555-6666",
      customerNotes: "Birthday party for 10 kids, ages 5-8",
      bookingDate: addDays(today, 7),
      startTime: "10:00",
      endTime: "14:00",
      status: "confirmed",
    },
    {
      businessId: "biz-bounce-party",
      serviceId: "srv-party-package",
      customerName: "Tom Anderson",
      customerEmail: "tom.a@email.com",
      customerNotes: "Corporate family day event",
      bookingDate: addDays(today, 14),
      startTime: "09:00",
      endTime: "14:00",
      status: "pending",
    },
  ];

  for (const booking of sampleBookings) {
    await db
      .insert(bookings)
      .values(booking)
      .onConflictDoNothing();
  }
  console.log("Created sample bookings");

  console.log("Database seeded successfully!");
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0));
