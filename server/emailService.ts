import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { Resend } from "resend";
import type { Booking, Service, Business } from "@shared/schema";

type Language = "en" | "es";

// Resend integration via Replit Connectors API
interface ResendConnectionSettings {
  settings: {
    api_key: string;
    from_email?: string;
  };
}

async function getResendCredentials(): Promise<{ apiKey: string; fromEmail: string } | null> {
  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    if (!hostname) {
      console.log("[email] Resend: REPLIT_CONNECTORS_HOSTNAME not available");
      return null;
    }

    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!xReplitToken) {
      console.log("[email] Resend: No auth token available (REPL_IDENTITY or WEB_REPL_RENEWAL)");
      return null;
    }

    console.log("[email] Resend: Fetching credentials from connector...");
    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );

    if (!response.ok) {
      console.log(`[email] Resend: Failed to fetch credentials, status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const connectionSettings: ResendConnectionSettings = data.items?.[0];

    if (!connectionSettings?.settings?.api_key) {
      console.log("[email] Resend: No API key found in connection settings");
      return null;
    }

    console.log(`[email] Resend: Credentials loaded, fromEmail: ${connectionSettings.settings.from_email || "noreply@flowlift.app"}`);
    return {
      apiKey: connectionSettings.settings.api_key,
      fromEmail: connectionSettings.settings.from_email || "noreply@flowlift.app"
    };
  } catch (error) {
    console.log("[email] Resend connector error:", error);
    return null;
  }
}

async function getResendClient(): Promise<{ client: Resend; fromEmail: string } | null> {
  const credentials = await getResendCredentials();
  if (!credentials) {
    return null;
  }
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: credentials.fromEmail
  };
}

// FlowLift logo - use hosted URL for email client compatibility
function getFlowLiftLogoUrl(baseUrl: string): string {
  if (baseUrl) {
    return `${baseUrl}/objects/public/email-assets/flowlift-logo.png`;
  }
  return "";
}

// Simple Icons CDN URLs for social media (widely supported in email clients)
const SOCIAL_ICON_URLS: Record<string, string> = {
  facebook: "https://cdn.simpleicons.org/facebook/1877F2",
  instagram: "https://cdn.simpleicons.org/instagram/E4405F",
  twitter: "https://cdn.simpleicons.org/x/000000",
  linkedin: "https://cdn.simpleicons.org/linkedin/0A66C2",
  youtube: "https://cdn.simpleicons.org/youtube/FF0000",
  tiktok: "https://cdn.simpleicons.org/tiktok/000000",
  whatsapp: "https://cdn.simpleicons.org/whatsapp/25D366",
};

function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

function getEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "noreply@flowlift.app";

  if (!host || !port || !user || !pass) {
    return null;
  }

  return {
    host,
    port: parseInt(port, 10),
    secure: parseInt(port, 10) === 465,
    auth: { user, pass },
    from,
  };
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const config = getEmailConfig();
  if (!config) {
    console.log("Email service not configured - emails will be logged only");
    return null;
  }

  console.log(`Email service configured: host=${config.host}, port=${config.port}, secure=${config.secure}, user=${config.auth.user}, from=${config.from}`);

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  return transporter;
}

export async function verifyEmailConnection(): Promise<{ success: boolean; error?: string; config?: { host: string; port: number; user: string; from: string } }> {
  const config = getEmailConfig();
  
  if (!config) {
    return { 
      success: false, 
      error: "Email not configured. Missing SMTP_HOST, SMTP_PORT, SMTP_USER, or SMTP_PASS environment variables." 
    };
  }

  const testTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  try {
    await testTransporter.verify();
    return { 
      success: true,
      config: { host: config.host, port: config.port, user: config.auth.user, from: config.from }
    };
  } catch (error: any) {
    console.error("SMTP verification failed:", error);
    return { 
      success: false, 
      error: error.message || "Failed to connect to SMTP server",
      config: { host: config.host, port: config.port, user: config.auth.user, from: config.from }
    };
  }
}

const emailTranslations: Record<Language, Record<string, string>> = {
  en: {
    reservationConfirmed: "Your reservation is confirmed",
    youreGoingTo: "You're going to",
    address: "Address",
    guests: "Guests",
    addToCalendar: "Add to Calendar",
    bookAnotherAppointment: "Book Another Appointment",
    viewMyBookings: "View My Bookings",
    localRequirement: "Local Requirement",
    changeReservation: "Change reservation",
    cancelReservation: "Cancel reservation",
    sentWithLove: "Sent with",
    withFlowlift: "with flowlift",
    signUpFree: "Sign up for free",
    bookingConfirmed: "Booking Confirmed",
    appointmentScheduled: "Your appointment has been scheduled",
    date: "Date",
    time: "Time",
    duration: "Duration",
    price: "Price",
    minutes: "minutes",
    businessDetails: "Business Details",
    poweredBy: "Powered by FlowLift",
    newBooking: "New Booking",
    newAppointment: "You have a new appointment",
    customerDetails: "Customer Details",
    customerNotes: "Customer Notes",
    loginDashboard: "Log in to your FlowLift dashboard to manage this booking.",
    signInFlowLift: "Sign in to FlowLift",
    clickToAccess: "Click the button below to access your bookings",
    linkExpires: "This link will expire in 1 hour. If you didn't request this email, you can safely ignore it.",
    buttonNotWork: "If the button doesn't work, copy and paste this link into your browser:",
    modificationRequested: "Booking Modification Requested",
    modificationRequestDesc: "{businessName} has requested to modify your appointment",
    currentAppointment: "Current Appointment",
    proposedNewTime: "Proposed New Time",
    modificationReason: "Reason for Change",
    confirmModification: "Confirm Modification",
    modificationExpires: "Please respond within 48 hours. If you don't confirm, the original appointment will remain unchanged.",
    manageBooking: "MANAGE YOUR BOOKING",
    modifyBooking: "Modify Booking",
    cancelBooking: "Cancel Booking",
    termsAndConditions: "Terms & Conditions",
    contact: "Contact",
    phone: "Phone",
  },
  es: {
    reservationConfirmed: "Tu reservación está confirmada",
    youreGoingTo: "Vas a",
    address: "Dirección",
    guests: "Invitados",
    addToCalendar: "Agregar al Calendario",
    bookAnotherAppointment: "Reservar Otra Cita",
    viewMyBookings: "Ver Mis Reservaciones",
    localRequirement: "Requisito Local",
    changeReservation: "Cambiar reservación",
    cancelReservation: "Cancelar reservación",
    sentWithLove: "Enviado con",
    withFlowlift: "con flowlift",
    signUpFree: "Regístrate gratis",
    bookingConfirmed: "Reservación Confirmada",
    appointmentScheduled: "Tu cita ha sido programada",
    date: "Fecha",
    time: "Hora",
    duration: "Duración",
    price: "Precio",
    minutes: "minutos",
    businessDetails: "Detalles del Negocio",
    poweredBy: "Desarrollado por FlowLift",
    newBooking: "Nueva Reservación",
    newAppointment: "Tienes una nueva cita",
    customerDetails: "Detalles del Cliente",
    customerNotes: "Notas del Cliente",
    loginDashboard: "Inicia sesión en tu panel de FlowLift para gestionar esta reservación.",
    signInFlowLift: "Inicia sesión en FlowLift",
    clickToAccess: "Haz clic en el botón de abajo para acceder a tus reservaciones",
    linkExpires: "Este enlace expirará en 1 hora. Si no solicitaste este correo, puedes ignorarlo con seguridad.",
    buttonNotWork: "Si el botón no funciona, copia y pega este enlace en tu navegador:",
    modificationRequested: "Solicitud de Modificación de Reservación",
    modificationRequestDesc: "{businessName} ha solicitado modificar tu cita",
    currentAppointment: "Cita Actual",
    proposedNewTime: "Nueva Hora Propuesta",
    modificationReason: "Razón del Cambio",
    confirmModification: "Confirmar Modificación",
    modificationExpires: "Por favor responde en un plazo de 48 horas. Si no confirmas, la cita original permanecerá sin cambios.",
    manageBooking: "GESTIONAR TU RESERVACIÓN",
    modifyBooking: "Modificar Reservación",
    cancelBooking: "Cancelar Reservación",
    termsAndConditions: "Términos y Condiciones",
    contact: "Contacto",
    phone: "Teléfono",
  },
};

function getEmailText(key: string, lang: Language, params?: Record<string, string>): string {
  let text = emailTranslations[lang][key] || emailTranslations.en[key] || key;
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(`{${paramKey}}`, value);
    });
  }
  return text;
}

function formatDate(date: Date | string | undefined | null, lang: Language = "en"): string {
  if (!date) return lang === "es" ? "Fecha no disponible" : "Date not available";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return String(date).split('T')[0];
    }
    return d.toLocaleDateString(lang === "es" ? "es-MX" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return String(date).split('T')[0];
  }
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDateShort(date: Date | string | undefined | null, lang: Language = "en"): { day: string; fullDate: string } {
  if (!date) return { day: "", fullDate: "" };
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return { day: "", fullDate: String(date) };
    }
    const day = d.toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { weekday: "long" });
    const fullDate = d.toLocaleDateString(lang === "es" ? "es-MX" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return { day, fullDate };
  } catch {
    return { day: "", fullDate: String(date) };
  }
}

interface CalendarLinks {
  google: string;
  outlook: string;
  apple: string;
}

function generateCalendarLinks(
  booking: Booking & { customerActionToken?: string | null },
  service: Service,
  business: Business,
  baseUrl: string
): CalendarLinks {
  const bookingDate = new Date(booking.bookingDate);
  const [startHour, startMin] = booking.startTime.split(":").map(Number);
  const [endHour, endMin] = booking.endTime.split(":").map(Number);

  const startDateTime = new Date(bookingDate);
  startDateTime.setHours(startHour, startMin, 0, 0);
  
  const endDateTime = new Date(bookingDate);
  endDateTime.setHours(endHour, endMin, 0, 0);

  const formatForGoogle = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const formatForOutlook = (d: Date) => d.toISOString();

  const title = encodeURIComponent(`${service.name} at ${business.name}`);
  const location = encodeURIComponent(business.address || "");
  const description = encodeURIComponent(`Booking for ${service.name}\nDuration: ${service.duration} minutes`);

  const googleStart = formatForGoogle(startDateTime);
  const googleEnd = formatForGoogle(endDateTime);
  const googleLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${googleStart}/${googleEnd}&location=${location}&details=${description}`;

  const outlookStart = formatForOutlook(startDateTime);
  const outlookEnd = formatForOutlook(endDateTime);
  const outlookLink = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${outlookStart}&enddt=${outlookEnd}&location=${location}&body=${description}`;

  // Apple Calendar requires the customer action token for security
  const appleLink = booking.customerActionToken 
    ? `${baseUrl}/api/calendar/ics/${booking.id}?token=${booking.customerActionToken}`
    : "";

  return {
    google: googleLink,
    outlook: outlookLink,
    apple: appleLink,
  };
}

interface BookingEmailData {
  booking: Booking;
  service: Service;
  business: Business;
  language?: Language;
  baseUrl?: string;
}

function generateCustomerConfirmationHtml(data: BookingEmailData): string {
  const { booking, service, business, language = "en", baseUrl = "" } = data;
  const t = (key: string, params?: Record<string, string>) => getEmailText(key, language, params);

  const customerActionToken = (booking as any).customerActionToken;
  const cancelUrl = customerActionToken ? `${baseUrl}/customer-cancel?token=${customerActionToken}` : "";
  const modifyUrl = customerActionToken ? `${baseUrl}/customer-modify?token=${customerActionToken}` : "";
  const bookingPageUrl = `${baseUrl}/book/${business.slug}`;
  
  const calendarLinks = generateCalendarLinks(booking, service, business, baseUrl);
  const dateInfo = formatDateShort(booking.bookingDate, language);
  const timeRange = `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`;
  
  // Convert relative URLs to absolute URLs for email compatibility
  const getAbsoluteUrl = (url: string | null | undefined): string => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };
  
  const businessLogoUrl = getAbsoluteUrl(business.logoUrl);
  const businessCoverUrl = getAbsoluteUrl(business.coverImageUrl);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t("reservationConfirmed")}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff; color: #18181b;">
  <div style="max-width: 500px; margin: 0 auto; padding: 24px 16px;">
    
    <!-- FlowLift Logo -->
    <div style="margin-bottom: 24px;">
      ${getFlowLiftLogoUrl(baseUrl) ? `<img src="${getFlowLiftLogoUrl(baseUrl)}" alt="flowlift" style="height: 32px; width: auto; display: block;" />` : `<span style="font-size: 24px; font-weight: 700; color: #2563eb;">flowlift</span>`}
    </div>
    
    <!-- Main Title -->
    <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 700; color: #18181b;">${t("reservationConfirmed")}</h1>
    
    ${businessCoverUrl ? `
    <!-- Cover Image -->
    <div style="margin-bottom: 16px; border-radius: 12px; overflow: hidden;">
      <img src="${escapeHtml(businessCoverUrl)}" alt="${escapeHtml(business.name)}" style="width: 100%; height: auto; display: block; max-height: 200px; object-fit: cover;" />
    </div>
    ` : ""}
    
    <!-- Business Name & Logo -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid #e4e4e7; padding-bottom: 16px;">
      <p style="margin: 0; font-size: 20px; font-weight: 700; color: #18181b;">${escapeHtml(business.name)}</p>
      ${businessLogoUrl ? `
      <img src="${escapeHtml(businessLogoUrl)}" alt="${escapeHtml(business.name)} logo" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />
      ` : ""}
    </div>
    
    <!-- Appointment Date/Time -->
    <div style="margin-bottom: 24px; border-bottom: 1px solid #e4e4e7; padding-bottom: 16px;">
      <p style="margin: 0 0 12px; font-size: 16px; font-weight: 700; color: #18181b;">${escapeHtml(service.name)}</p>
      <p style="margin: 0 0 4px; font-size: 16px; font-weight: 600; color: #18181b;">${escapeHtml(dateInfo.day)},</p>
      <p style="margin: 0 0 4px; font-size: 16px; color: #18181b;">${escapeHtml(dateInfo.fullDate)}</p>
      <p style="margin: 0; font-size: 14px; color: #71717a;">Your appointment is at: ${escapeHtml(timeRange)}</p>
    </div>
    
    ${business.address || business.city || business.country ? `
    <!-- Address -->
    <div style="margin-bottom: 24px; border-bottom: 1px solid #e4e4e7; padding-bottom: 16px;">
      <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #71717a;">${t("address")}</p>
      ${business.address ? `<p style="margin: 0; font-size: 14px; color: #18181b; line-height: 1.5;">${escapeHtml(business.address)}</p>` : ""}
      ${business.city ? `<p style="margin: 4px 0 0; font-size: 14px; color: #18181b;">${escapeHtml(business.city)}</p>` : ""}
      ${business.country ? `<p style="margin: 4px 0 0; font-size: 14px; color: #18181b;">${escapeHtml(business.country)}</p>` : ""}
    </div>
    ` : ""}
    
    ${business.phone || business.email || business.socialFacebook || business.socialInstagram || business.socialTwitter || business.socialLinkedin || business.socialYoutube || business.socialTiktok || business.socialWhatsapp ? `
    <!-- Contact -->
    <div style="margin-bottom: 24px; border-bottom: 1px solid #e4e4e7; padding-bottom: 16px;">
      <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #71717a;">${t("contact")}</p>
      ${business.phone ? `<p style="margin: 0 0 4px; font-size: 14px; color: #18181b;"><a href="tel:${escapeHtml(business.phone)}" style="color: #18181b; text-decoration: none;">${escapeHtml(business.phone)}</a></p>` : ""}
      ${business.email ? `<p style="margin: 0 0 12px; font-size: 14px; color: #18181b;"><a href="mailto:${escapeHtml(business.email)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(business.email)}</a></p>` : ""}
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        ${business.socialFacebook ? `<a href="https://facebook.com/${escapeHtml(business.socialFacebook)}" target="_blank" style="display: inline-block; width: 28px; height: 28px;"><img src="${SOCIAL_ICON_URLS.facebook}" alt="Facebook" style="width: 28px; height: 28px;" /></a>` : ""}
        ${business.socialInstagram ? `<a href="https://instagram.com/${escapeHtml(business.socialInstagram)}" target="_blank" style="display: inline-block; width: 28px; height: 28px;"><img src="${SOCIAL_ICON_URLS.instagram}" alt="Instagram" style="width: 28px; height: 28px;" /></a>` : ""}
        ${business.socialTwitter ? `<a href="https://x.com/${escapeHtml(business.socialTwitter)}" target="_blank" style="display: inline-block; width: 28px; height: 28px;"><img src="${SOCIAL_ICON_URLS.twitter}" alt="X" style="width: 28px; height: 28px;" /></a>` : ""}
        ${business.socialLinkedin ? `<a href="https://linkedin.com/in/${escapeHtml(business.socialLinkedin)}" target="_blank" style="display: inline-block; width: 28px; height: 28px;"><img src="${SOCIAL_ICON_URLS.linkedin}" alt="LinkedIn" style="width: 28px; height: 28px;" /></a>` : ""}
        ${business.socialYoutube ? `<a href="https://youtube.com/@${escapeHtml(business.socialYoutube)}" target="_blank" style="display: inline-block; width: 28px; height: 28px;"><img src="${SOCIAL_ICON_URLS.youtube}" alt="YouTube" style="width: 28px; height: 28px;" /></a>` : ""}
        ${business.socialTiktok ? `<a href="https://tiktok.com/@${escapeHtml(business.socialTiktok)}" target="_blank" style="display: inline-block; width: 28px; height: 28px;"><img src="${SOCIAL_ICON_URLS.tiktok}" alt="TikTok" style="width: 28px; height: 28px;" /></a>` : ""}
        ${business.socialWhatsapp ? `<a href="https://wa.me/${escapeHtml(business.socialWhatsapp.replace(/[^0-9]/g, ''))}" target="_blank" style="display: inline-block; width: 28px; height: 28px;"><img src="${SOCIAL_ICON_URLS.whatsapp}" alt="WhatsApp" style="width: 28px; height: 28px;" /></a>` : ""}
      </div>
    </div>
    ` : ""}
    
    <!-- Guests -->
    <div style="margin-bottom: 24px; border-bottom: 1px solid #e4e4e7; padding-bottom: 16px;">
      <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #71717a;">${t("guests")}</p>
      <p style="margin: 0; font-size: 14px; color: #18181b;">${escapeHtml(booking.customerName)}</p>
      ${booking.customerPhone ? `<p style="margin: 4px 0 0; font-size: 14px; color: #71717a;">${escapeHtml(booking.customerPhone)}</p>` : ""}
      <p style="margin: 4px 0 0; font-size: 14px; color: #71717a;">${escapeHtml(booking.customerEmail)}</p>
    </div>
    
    <!-- Add to Calendar -->
    <div style="margin-bottom: 24px; border-bottom: 1px solid #e4e4e7; padding-bottom: 24px;">
      <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #18181b; text-align: center;">${t("addToCalendar")}</p>
      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
        <tr>
          <td style="${calendarLinks.apple ? "width: 33.33%;" : "width: 50%;"} text-align: center; padding: 0 4px;">
            <a href="${calendarLinks.google}" target="_blank" style="display: inline-block; padding: 10px 16px; background-color: #4285f4; border-radius: 8px; text-decoration: none; font-size: 12px; color: #ffffff; font-weight: 500;">
              Google
            </a>
          </td>
          <td style="${calendarLinks.apple ? "width: 33.33%;" : "width: 50%;"} text-align: center; padding: 0 4px;">
            <a href="${calendarLinks.outlook}" target="_blank" style="display: inline-block; padding: 10px 16px; background-color: #0078d4; border-radius: 8px; text-decoration: none; font-size: 12px; color: #ffffff; font-weight: 500;">
              Outlook
            </a>
          </td>
          ${calendarLinks.apple ? `
          <td style="width: 33.33%; text-align: center; padding: 0 4px;">
            <a href="${calendarLinks.apple}" target="_blank" style="display: inline-block; padding: 10px 16px; background-color: #18181b; border-radius: 8px; text-decoration: none; font-size: 12px; color: #ffffff; font-weight: 500;">
              Apple
            </a>
          </td>
          ` : ""}
        </tr>
      </table>
    </div>
    
    <!-- Action Buttons -->
    <div style="margin-bottom: 24px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
        <tr>
          <td style="width: 50%; padding-right: 8px; vertical-align: top;">
            <a href="${bookingPageUrl}" style="display: block; padding: 14px 8px; border: 1px solid #e4e4e7; border-radius: 8px; text-decoration: none; font-size: 14px; color: #18181b; font-weight: 500; text-align: center; min-height: 48px; line-height: 20px; box-sizing: border-box;">
              ${t("bookAnotherAppointment")}
            </a>
          </td>
          <td style="width: 50%; padding-left: 8px; vertical-align: top;">
            <a href="${baseUrl}/my-bookings" style="display: block; padding: 14px 8px; background-color: #22c55e; border-radius: 8px; text-decoration: none; font-size: 14px; color: #ffffff; font-weight: 500; text-align: center; min-height: 48px; line-height: 20px; box-sizing: border-box;">
              ${t("viewMyBookings")}
            </a>
          </td>
        </tr>
      </table>
    </div>
    
    ${business.showTermsInEmail && business.termsAndConditions ? `
    <!-- Terms and Conditions -->
    <div style="margin-bottom: 24px; padding: 16px; background-color: #f4f4f5; border-radius: 8px;">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 20px;">📋</span>
        <div>
          <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #18181b;">${t("termsAndConditions")}</p>
          <p style="margin: 0; font-size: 13px; color: #52525b; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(business.termsAndConditions)}</p>
        </div>
      </div>
    </div>
    ` : ""}
    
    ${modifyUrl ? `
    <!-- Change Reservation -->
    <div style="margin-bottom: 12px;">
      <a href="${modifyUrl}" style="display: block; padding: 14px; border: 1px solid #e4e4e7; border-radius: 8px; text-decoration: none; font-size: 14px; color: #18181b; font-weight: 500; text-align: center;">
        ${t("changeReservation")}
      </a>
    </div>
    ` : ""}
    
    ${cancelUrl ? `
    <!-- Cancel Reservation -->
    <div style="margin-bottom: 32px;">
      <a href="${cancelUrl}" style="display: block; padding: 14px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; text-decoration: none; font-size: 14px; color: #dc2626; font-weight: 500; text-align: center;">
        ${t("cancelReservation")}
      </a>
    </div>
    ` : ""}
    
    <!-- Footer -->
    <div style="padding-top: 24px; border-top: 1px solid #e4e4e7;">
      <p style="margin: 0 0 4px; font-size: 14px; color: #18181b;">
        ${t("sentWithLove")} <span style="color: #ef4444;">&#10084;</span> ${t("withFlowlift")}
      </p>
      <p style="margin: 0 0 4px; font-size: 14px; color: #71717a;">Saltillo, Mexico</p>
      <p style="margin: 0;">
        <a href="https://flowlift.co" style="font-size: 14px; color: #2563eb; text-decoration: none;">${t("signUpFree")}</a>
      </p>
    </div>
    
  </div>
</body>
</html>
  `;
}

function generateCustomerConfirmationText(data: BookingEmailData): string {
  const { booking, service, business, language = "en", baseUrl = "" } = data;
  const t = (key: string, params?: Record<string, string>) => getEmailText(key, language, params);
  
  const dateInfo = formatDateShort(booking.bookingDate, language);
  const timeRange = `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`;
  const customerActionToken = (booking as any).customerActionToken;
  const cancelUrl = customerActionToken ? `${baseUrl}/customer-cancel?token=${customerActionToken}` : "";
  const modifyUrl = customerActionToken ? `${baseUrl}/customer-modify?token=${customerActionToken}` : "";
  
  // Generate calendar links for text email
  const calendarLinks = generateCalendarLinks(booking as any, service, business, baseUrl);
  
  // Build calendar section with only available options
  const calendarOptions = [
    `- Google Calendar: ${calendarLinks.google}`,
    `- Outlook: ${calendarLinks.outlook}`,
  ];
  if (calendarLinks.apple) {
    calendarOptions.push(`- Apple Calendar: ${calendarLinks.apple}`);
  }

  return `
FLOWLIFT

${t("reservationConfirmed").toUpperCase()}

---

${business.name}

${service.name}
${dateInfo.day}, ${dateInfo.fullDate}
Your appointment is at: ${timeRange}

${business.address || business.city || business.country ? `${t("address")}:
${business.address || ""}${business.city ? `\n${business.city}` : ""}${business.country ? `\n${business.country}` : ""}` : ""}

${business.phone || business.email ? `${t("contact")}:
${business.phone ? `${t("phone")}: ${business.phone}` : ""}${business.email ? `\nEmail: ${business.email}` : ""}
` : ""}${t("guests")}:
${booking.customerName}
${booking.customerPhone || ""}
${booking.customerEmail}

---

${t("addToCalendar")}:
${calendarOptions.join("\n")}

${t("bookAnotherAppointment")}: ${baseUrl}/book/${business.slug}
${t("viewMyBookings")}: ${baseUrl}/my-bookings

${business.showTermsInEmail && business.termsAndConditions ? `${t("termsAndConditions").toUpperCase()}:
${business.termsAndConditions}

` : ""}${modifyUrl ? `${t("changeReservation")}: ${modifyUrl}` : ""}
${cancelUrl ? `${t("cancelReservation")}: ${cancelUrl}` : ""}

---
${t("sentWithLove")} with ${t("withFlowlift")}
Saltillo, Mexico
${t("signUpFree")}: https://flowlift.co
  `.trim();
}

function generateBusinessNotificationHtml(data: BookingEmailData): string {
  const { booking, service, business } = data;
  const lang: Language = "en";
  const t = (key: string, params?: Record<string, string>) => getEmailText(key, lang, params);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t("newBooking")}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Checkmark Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; background: #dcfce7; border-radius: 50%;">
        <span style="font-size: 40px; color: #22c55e;">✓</span>
      </div>
    </div>

    <!-- Title -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; color: #18181b;">${t("newBooking")}</h1>
      <p style="margin: 0; color: #71717a; font-size: 16px;">${t("newAppointment")}</p>
    </div>
    
    <!-- Booking Details Card -->
    <div style="border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <div style="margin-bottom: 16px;">
        <span style="font-size: 18px; margin-right: 12px;">📅</span>
        <span style="font-size: 16px; color: #18181b; font-weight: 500;">${escapeHtml(formatDate(booking.bookingDate, lang))}</span>
      </div>
      <div style="margin-bottom: 16px;">
        <span style="font-size: 18px; margin-right: 12px;">🕐</span>
        <span style="font-size: 16px; color: #18181b; font-weight: 500;">${escapeHtml(formatTime(booking.startTime))} - ${escapeHtml(formatTime(booking.endTime))}</span>
      </div>
      <div>
        <span style="font-size: 18px; margin-right: 12px;">🏷️</span>
        <span style="font-size: 16px; color: #18181b; font-weight: 500;">${escapeHtml(service.name)}</span>
      </div>
    </div>
    
    <!-- Green Confirmation Message -->
    <div style="border-left: 4px solid #22c55e; background: #f0fdf4; padding: 16px; margin-bottom: 32px;">
      <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
        A confirmation email has been sent to <a href="mailto:${escapeHtml(booking.customerEmail)}" style="color: #2563eb; text-decoration: underline;">${escapeHtml(booking.customerEmail)}</a>. You can manage all your bookings from your account.
      </p>
    </div>
    
    <!-- Customer Details -->
    <div style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 700; color: #18181b; text-transform: uppercase; letter-spacing: 0.5px;">CUSTOMER DETAILS</h3>
      <p style="margin: 0; color: #18181b; font-size: 15px; line-height: 1.8;">
        <strong>${escapeHtml(booking.customerName)}</strong><br>
        <a href="mailto:${escapeHtml(booking.customerEmail)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(booking.customerEmail)}</a>
        ${booking.customerPhone ? `<br><a href="tel:${escapeHtml(booking.customerPhone)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(booking.customerPhone)}</a>` : ""}
      </p>
    </div>
    
    ${booking.customerNotes ? `
    <!-- Customer Notes -->
    <div style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 700; color: #18181b; text-transform: uppercase; letter-spacing: 0.5px;">CUSTOMER NOTES</h3>
      <p style="margin: 0; color: #52525b; font-size: 14px; line-height: 1.6;">${escapeHtml(booking.customerNotes)}</p>
    </div>
    ` : ""}
    
    <!-- Footer Message -->
    <div style="text-align: center; margin-bottom: 32px;">
      <p style="margin: 0; color: #71717a; font-size: 14px;">
        ${t("loginDashboard")}
      </p>
    </div>
    
    <!-- Powered By -->
    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #f4f4f5;">
      <p style="margin: 0; color: #a1a1aa; font-size: 13px;">
        ${t("poweredBy")}
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateBusinessNotificationText(data: BookingEmailData): string {
  const { booking, service } = data;
  const t = (key: string) => getEmailText(key, "en");

  return `
${t("newBooking").toUpperCase()}

${t("newAppointment")}

${service.name}
${t("date")}: ${formatDate(booking.bookingDate, "en")}
${t("time")}: ${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}
${t("duration")}: ${service.duration} ${t("minutes")}
${t("price")}: $${parseFloat(String(service.price)).toFixed(2)}

${t("customerDetails")}:
${booking.customerName}
${booking.customerEmail}
${booking.customerPhone || ""}

${booking.customerNotes ? `${t("customerNotes")}: ${booking.customerNotes}` : ""}

${t("loginDashboard")}

---
${t("poweredBy")}
  `.trim();
}

export async function sendBookingConfirmationToCustomer(
  data: BookingEmailData
): Promise<boolean> {
  const { booking, service, business, language = "en" } = data;
  const t = (key: string) => getEmailText(key, language);

  const subject = `${t("bookingConfirmed")}: ${service.name} - ${business.name}`;
  const text = generateCustomerConfirmationText(data);
  const html = generateCustomerConfirmationHtml(data);

  // Try Resend first (via Replit connector)
  console.log("[email] Attempting to send customer confirmation email...");
  const resend = await getResendClient();
  if (resend) {
    try {
      console.log(`[email] Sending via Resend to: ${booking.customerEmail}`);
      await resend.client.emails.send({
        from: resend.fromEmail,
        to: booking.customerEmail,
        subject,
        text,
        html,
      });
      console.log(`[email] Email sent via Resend to customer: ${booking.customerEmail} (lang: ${language})`);
      return true;
    } catch (error) {
      console.error("[email] Resend failed, falling back to SMTP:", error);
    }
  } else {
    console.log("[email] Resend client not available, falling back to SMTP");
  }

  // Fall back to SMTP
  const config = getEmailConfig();
  const transport = getTransporter();

  const emailContent = {
    from: config?.from || "noreply@flowlift.app",
    to: booking.customerEmail,
    subject,
    text,
    html,
  };

  if (!transport) {
    console.log("=== EMAIL (Customer Confirmation) ===");
    console.log("To:", emailContent.to);
    console.log("Subject:", emailContent.subject);
    console.log("Language:", language);
    console.log("Text:", emailContent.text.substring(0, 200) + "...");
    console.log("=====================================");
    return true;
  }

  try {
    await transport.sendMail(emailContent);
    console.log(`Email sent via SMTP to customer: ${booking.customerEmail} (lang: ${language})`);
    return true;
  } catch (error) {
    console.error("Failed to send customer confirmation email:", error);
    return false;
  }
}

export async function sendBookingNotificationToBusiness(
  data: BookingEmailData
): Promise<boolean> {
  const { booking, service, business } = data;

  if (!business.email) {
    console.log("Business has no email configured, skipping notification");
    return true;
  }

  const subject = `New Booking: ${service.name} from ${booking.customerName}`;
  const text = generateBusinessNotificationText(data);
  const html = generateBusinessNotificationHtml(data);

  // Try Resend first (via Replit connector)
  const resend = await getResendClient();
  if (resend) {
    try {
      await resend.client.emails.send({
        from: resend.fromEmail,
        to: business.email,
        subject,
        text,
        html,
      });
      console.log(`Email sent via Resend to business: ${business.email}`);
      return true;
    } catch (error) {
      console.error("Resend failed, falling back to SMTP:", error);
    }
  }

  // Fall back to SMTP
  const config = getEmailConfig();
  const transport = getTransporter();

  const emailContent = {
    from: config?.from || "noreply@flowlift.app",
    to: business.email,
    subject,
    text,
    html,
  };

  if (!transport) {
    console.log("=== EMAIL (Business Notification) ===");
    console.log("To:", emailContent.to);
    console.log("Subject:", emailContent.subject);
    console.log("Text:", emailContent.text.substring(0, 200) + "...");
    console.log("======================================");
    return true;
  }

  try {
    await transport.sendMail(emailContent);
    console.log(`Email sent via SMTP to business: ${business.email}`);
    return true;
  } catch (error) {
    console.error("Failed to send business notification email:", error);
    return false;
  }
}

export async function sendBookingEmails(
  data: BookingEmailData
): Promise<{ customerSent: boolean; businessSent: boolean }> {
  const [customerSent, businessSent] = await Promise.all([
    sendBookingConfirmationToCustomer(data),
    sendBookingNotificationToBusiness(data),
  ]);

  return { customerSent, businessSent };
}

interface MagicLinkData {
  email: string;
  token: string;
  baseUrl: string;
  language?: Language;
}

function generateMagicLinkHtml(data: MagicLinkData): string {
  const { baseUrl, token, language = "en" } = data;
  const magicLinkUrl = `${baseUrl}/my-bookings?token=${token}`;
  const t = (key: string) => getEmailText(key, language);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t("signInFlowLift")}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">${t("signInFlowLift")}</h1>
        <p style="margin: 8px 0 0; color: #71717a; font-size: 16px;">${t("clickToAccess")}</p>
      </div>
      
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${magicLinkUrl}" style="display: inline-block; background: #18181b; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 16px;">
          ${t("viewMyBookings")}
        </a>
      </div>
      
      <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #52525b; font-size: 14px; line-height: 1.6;">
          <strong>Note:</strong> ${t("linkExpires")}
        </p>
      </div>
      
      <div style="border-top: 1px solid #e4e4e7; padding-top: 24px; text-align: center;">
        <p style="margin: 0; color: #71717a; font-size: 12px;">
          ${t("buttonNotWork")}<br>
          <a href="${magicLinkUrl}" style="color: #3b82f6; word-break: break-all;">${escapeHtml(magicLinkUrl)}</a>
        </p>
      </div>
    </div>
    
    <div style="text-align: center; padding: 24px;">
      <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
        ${t("poweredBy")}
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateMagicLinkText(data: MagicLinkData): string {
  const { baseUrl, token, language = "en" } = data;
  const magicLinkUrl = `${baseUrl}/my-bookings?token=${token}`;
  const t = (key: string) => getEmailText(key, language);
  
  return `
${t("signInFlowLift").toUpperCase()}

${t("clickToAccess")}

${magicLinkUrl}

${t("linkExpires")}

---
${t("poweredBy")}
  `.trim();
}

export async function sendMagicLinkEmail(data: MagicLinkData): Promise<boolean> {
  const { language = "en" } = data;
  const t = (key: string) => getEmailText(key, language);

  const subject = `${t("signInFlowLift")} - ${t("viewMyBookings")}`;
  const text = generateMagicLinkText(data);
  const html = generateMagicLinkHtml(data);

  // Try Resend first (via Replit connector)
  const resend = await getResendClient();
  if (resend) {
    try {
      await resend.client.emails.send({
        from: resend.fromEmail,
        to: data.email,
        subject,
        text,
        html,
      });
      console.log(`Magic link email sent via Resend to: ${data.email} (lang: ${language})`);
      return true;
    } catch (error) {
      console.error("Resend failed, falling back to SMTP:", error);
    }
  }

  // Fall back to SMTP
  const config = getEmailConfig();
  const transport = getTransporter();

  const emailContent = {
    from: config?.from || "noreply@flowlift.app",
    to: data.email,
    subject,
    text,
    html,
  };

  if (!transport) {
    console.log("=== EMAIL (Magic Link) ===");
    console.log("To:", emailContent.to);
    console.log("Subject:", emailContent.subject);
    console.log("Language:", language);
    console.log("Link:", `${data.baseUrl}/my-bookings?token=${data.token}`);
    console.log("==========================");
    return true;
  }

  try {
    await transport.sendMail(emailContent);
    console.log(`Magic link email sent via SMTP to: ${data.email} (lang: ${language})`);
    return true;
  } catch (error) {
    console.error("Failed to send magic link email:", error);
    return false;
  }
}

interface ModificationEmailData {
  booking: Booking;
  service: Service;
  business: Business;
  proposedDate: Date;
  proposedStartTime: string;
  proposedEndTime: string;
  modificationReason?: string;
  modificationToken: string;
  baseUrl: string;
  language?: Language;
}

function generateModificationRequestHtml(data: ModificationEmailData): string {
  const { booking, service, business, proposedDate, proposedStartTime, proposedEndTime, modificationReason, modificationToken, baseUrl, language = "en" } = data;
  const t = (key: string, params?: Record<string, string>) => getEmailText(key, language, params);
  const confirmUrl = `${baseUrl}/confirm-modification?token=${modificationToken}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t("modificationRequested")}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Warning Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; background: #fef3c7; border-radius: 50%;">
        <span style="font-size: 40px;">⚠️</span>
      </div>
    </div>

    <!-- Title -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; color: #18181b;">${t("modificationRequested")}</h1>
      <p style="margin: 0; color: #71717a; font-size: 16px;">${t("modificationRequestDesc", { businessName: business.name })}</p>
    </div>
    
    <!-- Current Appointment Card (Red/Strikethrough) -->
    <div style="border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 16px; background: #fef2f2;">
      <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 700; color: #991b1b; text-transform: uppercase;">${t("currentAppointment")}</h3>
      <div style="margin-bottom: 12px;">
        <span style="font-size: 18px; margin-right: 12px;">📅</span>
        <span style="font-size: 16px; color: #71717a; font-weight: 500; text-decoration: line-through;">${escapeHtml(formatDate(booking.bookingDate, language))}</span>
      </div>
      <div style="margin-bottom: 12px;">
        <span style="font-size: 18px; margin-right: 12px;">🕐</span>
        <span style="font-size: 16px; color: #71717a; font-weight: 500; text-decoration: line-through;">${escapeHtml(formatTime(booking.startTime))} - ${escapeHtml(formatTime(booking.endTime))}</span>
      </div>
      <div>
        <span style="font-size: 18px; margin-right: 12px;">🏷️</span>
        <span style="font-size: 16px; color: #71717a; font-weight: 500;">${escapeHtml(service.name)}</span>
      </div>
    </div>
    
    <!-- Proposed New Time Card (Green) -->
    <div style="border: 1px solid #a7f3d0; border-radius: 12px; padding: 20px; margin-bottom: 24px; background: #f0fdf4;">
      <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 700; color: #166534; text-transform: uppercase;">${t("proposedNewTime")}</h3>
      <div style="margin-bottom: 12px;">
        <span style="font-size: 18px; margin-right: 12px;">📅</span>
        <span style="font-size: 16px; color: #18181b; font-weight: 600;">${escapeHtml(formatDate(proposedDate, language))}</span>
      </div>
      <div style="margin-bottom: 12px;">
        <span style="font-size: 18px; margin-right: 12px;">🕐</span>
        <span style="font-size: 16px; color: #18181b; font-weight: 600;">${escapeHtml(formatTime(proposedStartTime))} - ${escapeHtml(formatTime(proposedEndTime))}</span>
      </div>
      <div>
        <span style="font-size: 18px; margin-right: 12px;">🏷️</span>
        <span style="font-size: 16px; color: #18181b; font-weight: 500;">${escapeHtml(service.name)}</span>
      </div>
    </div>
    
    ${modificationReason ? `
    <!-- Reason -->
    <div style="border-left: 4px solid #f59e0b; background: #fffbeb; padding: 16px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #92400e; text-transform: uppercase;">${t("modificationReason")}</h3>
      <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">${escapeHtml(modificationReason)}</p>
    </div>
    ` : ""}
    
    <!-- Confirm Button -->
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${confirmUrl}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        ${t("confirmModification")}
      </a>
    </div>
    
    <!-- Warning Message -->
    <div style="border-left: 4px solid #f59e0b; background: #fffbeb; padding: 16px; margin-bottom: 32px;">
      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
        <strong>Note:</strong> ${t("modificationExpires")}
      </p>
    </div>
    
    <!-- Business Details -->
    <div style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 700; color: #18181b; text-transform: uppercase; letter-spacing: 0.5px;">BUSINESS DETAILS</h3>
      <p style="margin: 0; color: #18181b; font-size: 15px; line-height: 1.8;">
        <strong>${escapeHtml(business.name)}</strong><br>
        ${business.email ? `<a href="mailto:${escapeHtml(business.email)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(business.email)}</a><br>` : ""}
        ${business.phone ? `<a href="tel:${escapeHtml(business.phone)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(business.phone)}</a><br>` : ""}
        ${business.address ? `<span style="color: #52525b;">${escapeHtml(business.address)}</span>` : ""}
      </p>
    </div>
    
    <!-- Link Fallback -->
    <div style="text-align: center; margin-bottom: 24px;">
      <p style="margin: 0; color: #71717a; font-size: 12px;">
        ${t("buttonNotWork")}<br>
        <a href="${confirmUrl}" style="color: #2563eb; word-break: break-all;">${escapeHtml(confirmUrl)}</a>
      </p>
    </div>
    
    <!-- Powered By -->
    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #f4f4f5;">
      <p style="margin: 0; color: #a1a1aa; font-size: 13px;">
        ${t("poweredBy")}
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateModificationRequestText(data: ModificationEmailData): string {
  const { booking, service, business, proposedDate, proposedStartTime, proposedEndTime, modificationReason, modificationToken, baseUrl, language = "en" } = data;
  const t = (key: string, params?: Record<string, string>) => getEmailText(key, language, params);
  const confirmUrl = `${baseUrl}/confirm-modification?token=${modificationToken}`;

  return `
${t("modificationRequested").toUpperCase()}

${t("modificationRequestDesc", { businessName: business.name })}

${service.name}

${t("currentAppointment")}:
${t("date")}: ${formatDate(booking.bookingDate, language)}
${t("time")}: ${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}

${t("proposedNewTime")}:
${t("date")}: ${formatDate(proposedDate, language)}
${t("time")}: ${formatTime(proposedStartTime)} - ${formatTime(proposedEndTime)}

${modificationReason ? `${t("modificationReason")}: ${modificationReason}` : ""}

${t("confirmModification")}: ${confirmUrl}

${t("modificationExpires")}

---
${t("poweredBy")}
  `.trim();
}

export async function sendModificationRequestEmail(data: ModificationEmailData): Promise<boolean> {
  const { booking, service, business, language = "en" } = data;
  const t = (key: string) => getEmailText(key, language);

  const subject = `${t("modificationRequested")}: ${service.name} - ${business.name}`;
  const text = generateModificationRequestText(data);
  const html = generateModificationRequestHtml(data);

  // Try Resend first (via Replit connector)
  const resend = await getResendClient();
  if (resend) {
    try {
      await resend.client.emails.send({
        from: resend.fromEmail,
        to: booking.customerEmail,
        subject,
        text,
        html,
      });
      console.log(`Modification request email sent via Resend to: ${booking.customerEmail} (lang: ${language})`);
      return true;
    } catch (error) {
      console.error("Resend failed, falling back to SMTP:", error);
    }
  }

  // Fall back to SMTP
  const config = getEmailConfig();
  const transport = getTransporter();

  const emailContent = {
    from: config?.from || "noreply@flowlift.app",
    to: booking.customerEmail,
    subject,
    text,
    html,
  };

  if (!transport) {
    console.log("=== EMAIL (Modification Request) ===");
    console.log("To:", emailContent.to);
    console.log("Subject:", emailContent.subject);
    console.log("Language:", language);
    console.log("Confirm URL:", `${data.baseUrl}/confirm-modification?token=${data.modificationToken}`);
    console.log("=====================================");
    return true;
  }

  try {
    await transport.sendMail(emailContent);
    console.log(`Modification request email sent via SMTP to: ${booking.customerEmail} (lang: ${language})`);
    return true;
  } catch (error) {
    console.error("Failed to send modification request email:", error);
    return false;
  }
}
