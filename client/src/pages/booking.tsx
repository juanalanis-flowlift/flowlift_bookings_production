import { useState, useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
  ArrowRight,
  Check,
  Tag,
  User,
  Users,
} from "lucide-react";
import type { Business, Service, Booking, Availability, TeamMember, TeamMemberAvailability } from "@shared/schema";
import { format, addDays, isBefore, startOfDay, isToday, addMinutes } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";
import { createBookingEvent, generateGoogleCalendarUrl, generateOutlookCalendarUrl, downloadICSFile } from "@/lib/calendar";
import { SiGoogle, SiApple } from "react-icons/si";

const bookingFormSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().optional(),
  customerNotes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

type BookingStep = "services" | "team" | "datetime" | "details" | "confirmation";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface TeamMemberWithAvailability extends TeamMember {
  availability: TeamMemberAvailability[];
}

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [step, setStep] = useState<BookingStep>("services");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMemberWithAvailability | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { t, language } = useI18n();

  const getCategoryLabel = (cat: string): string => {
    return t(`categories.${cat}`);
  };

  const dateLocale = language === "es" ? es : enUS;

  const { data: business, isLoading: businessLoading, error: businessError } = useQuery<Business>({
    queryKey: ["/api/public/business", slug],
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/public/services", slug],
    enabled: !!business,
  });

  const { data: availability } = useQuery<Availability[]>({
    queryKey: ["/api/public/availability", slug],
    enabled: !!business,
  });

  const { data: existingBookings, refetch: refetchBookings } = useQuery<Booking[]>({
    queryKey: ["/api/public/bookings", slug, selectedDate?.toISOString()],
    enabled: !!business && !!selectedDate,
  });

  // Fetch team members for the selected service
  const { data: teamMembers, isLoading: teamMembersLoading } = useQuery<TeamMemberWithAvailability[]>({
    queryKey: ["/api/public/team-members", selectedService?.id],
    enabled: !!selectedService,
  });

  const { toast } = useToast();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      customerNotes: "",
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormValues) => {
      if (!selectedService || !selectedDate || !selectedTime) {
        throw new Error("Missing booking details");
      }

      const endTime = calculateEndTime(selectedTime, selectedService.duration);

      return await apiRequest("POST", `/api/public/bookings/${slug}`, {
        serviceId: selectedService.id,
        teamMemberId: selectedTeamMember?.id || null,
        bookingDate: selectedDate.toISOString(),
        startTime: selectedTime,
        endTime,
        preferredLanguage: language,
        ...data,
      });
    },
    onSuccess: (booking) => {
      setConfirmedBooking(booking as unknown as Booking);
      setStep("confirmation");
    },
    onError: (error: any) => {
      console.error("Booking error:", error);
      const errorMessage = error?.details || error?.message || t("booking.errorGeneric");
      toast({
        title: t("booking.bookingFailed"),
        description: errorMessage,
        variant: "destructive",
      });
      // Refresh bookings to show updated availability
      if (selectedDate) {
        refetchBookings();
      }
    },
  });

  const formatPrice = (price: string | number) => {
    const locale = language === "es" ? "es-MX" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
    }).format(typeof price === "string" ? parseFloat(price) : price);
  };

  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = addMinutes(startDate, duration);
    return format(endDate, "HH:mm");
  };

  const getAvailableSlots = (): TimeSlot[] => {
    if (!selectedDate || !selectedService || !availability) return [];

    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = availability.find((a) => a.dayOfWeek === dayOfWeek);

    if (!dayAvailability || !dayAvailability.isOpen) return [];

    const slots: TimeSlot[] = [];
    const slotDuration = dayAvailability.slotDuration || 30;
    const serviceDuration = selectedService.duration;
    const maxSlotCapacity = dayAvailability.maxBookingsPerSlot || 1;

    const [startHour, startMin] = dayAvailability.startTime.split(":").map(Number);
    const [endHour, endMin] = dayAvailability.endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    for (let time = startMinutes; time + serviceDuration <= endMinutes; time += slotDuration) {
      const hours = Math.floor(time / 60);
      const mins = time % 60;
      const timeStr = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
      const serviceEndTime = calculateEndTime(timeStr, serviceDuration);

      const overlappingBookings = (existingBookings || []).filter((booking) => {
        if (booking.status === "cancelled") return false;
        return (
          (timeStr >= booking.startTime && timeStr < booking.endTime) ||
          (serviceEndTime > booking.startTime && serviceEndTime <= booking.endTime) ||
          (timeStr <= booking.startTime && serviceEndTime >= booking.endTime)
        );
      });

      const isAtCapacity = overlappingBookings.length >= maxSlotCapacity;

      let isPast = false;
      if (isToday(selectedDate)) {
        const now = new Date();
        const slotDate = new Date(selectedDate);
        slotDate.setHours(hours, mins, 0, 0);
        isPast = isBefore(slotDate, now);
      }

      slots.push({
        time: timeStr,
        available: !isAtCapacity && !isPast,
      });
    }

    return slots;
  };

  const isDateAvailable = (date: Date): boolean => {
    if (isBefore(date, startOfDay(new Date()))) return false;
    if (!availability) return false;

    const dayOfWeek = date.getDay();
    const dayAvailability = availability.find((a) => a.dayOfWeek === dayOfWeek);
    return dayAvailability?.isOpen ?? false;
  };

  const onSubmit = (data: BookingFormValues) => {
    console.log("Form submitted with data:", data);
    createBookingMutation.mutate(data);
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedTeamMember(null);
    setSelectedDate(undefined);
    setSelectedTime(null);
    // We'll navigate to team step after team members are loaded via useEffect
    setStep("team");
  };

  const handleTeamMemberSelect = (member: TeamMemberWithAvailability | null) => {
    setSelectedTeamMember(member);
    setStep("datetime");
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep("details");
  };

  const handleBack = () => {
    if (step === "team") {
      setStep("services");
      setSelectedService(null);
      setSelectedTeamMember(null);
    } else if (step === "datetime") {
      // Go back to team step if there are multiple team members, otherwise go to services
      if (teamMembers && teamMembers.length > 1) {
        setStep("team");
      } else {
        setStep("services");
        setSelectedService(null);
        setSelectedTeamMember(null);
      }
    } else if (step === "details") {
      setStep("datetime");
      setSelectedTime(null);
    }
  };

  // Auto-skip team step if there's 0 or 1 team member
  useEffect(() => {
    if (step === "team" && !teamMembersLoading && teamMembers) {
      if (teamMembers.length === 0) {
        // No team members, skip to datetime
        setStep("datetime");
      } else if (teamMembers.length === 1) {
        // Only one team member, auto-select and skip
        setSelectedTeamMember(teamMembers[0]);
        setStep("datetime");
      }
      // If more than 1, stay on team step and let user choose
    }
  }, [step, teamMembersLoading, teamMembers]);

  if (businessLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (businessError || !business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">{t("booking.businessNotFound")}</h2>
            <p className="text-muted-foreground">
              {t("booking.businessNotFoundDesc")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "confirmation" && confirmedBooking) {
    // Check if booking is pending (requires confirmation) by looking at the status
    const isPendingConfirmation = confirmedBooking.status === "pending";
    
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-lg mx-auto">
          <Card>
            <CardContent className="pt-8 text-center space-y-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                isPendingConfirmation ? "bg-yellow-500/10" : "bg-green-500/10"
              }`}>
                {isPendingConfirmation ? (
                  <Clock className="h-8 w-8 text-yellow-500" />
                ) : (
                  <Check className="h-8 w-8 text-green-500" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {isPendingConfirmation 
                    ? t("booking.requestSubmitted") 
                    : t("booking.confirmed")}
                </h2>
                <p className="text-muted-foreground">
                  {isPendingConfirmation 
                    ? t("booking.pendingConfirmation", { business: business.name })
                    : `${t("booking.thankYou")} ${business.name}`}
                </p>
              </div>

              <Card className="bg-muted/50 text-left">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy", { locale: dateLocale }) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedTime && selectedService
                        ? `${selectedTime} - ${calculateEndTime(selectedTime, selectedService.duration)}`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedService?.name}</span>
                  </div>
                </CardContent>
              </Card>

              <p className="text-sm text-muted-foreground">
                {isPendingConfirmation 
                  ? t("booking.pendingConfirmationNote")
                  : t("booking.confirmationSent")}
              </p>

              {/* Add to Calendar Section - only show when booking is confirmed */}
              {!isPendingConfirmation && selectedDate && selectedTime && selectedService && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">{t("booking.addToCalendar")}</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const event = createBookingEvent(
                          selectedService.name,
                          business.name,
                          selectedDate,
                          selectedTime,
                          selectedService.duration,
                          business.address ? `${business.address}, ${business.city || ""}` : undefined
                        );
                        window.open(generateGoogleCalendarUrl(event), "_blank");
                      }}
                      data-testid="button-add-google-calendar"
                    >
                      <SiGoogle className="h-4 w-4 mr-2" />
                      {t("booking.googleCalendar")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const event = createBookingEvent(
                          selectedService.name,
                          business.name,
                          selectedDate,
                          selectedTime,
                          selectedService.duration,
                          business.address ? `${business.address}, ${business.city || ""}` : undefined
                        );
                        window.open(generateOutlookCalendarUrl(event), "_blank");
                      }}
                      data-testid="button-add-outlook-calendar"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {t("booking.outlookCalendar")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const event = createBookingEvent(
                          selectedService.name,
                          business.name,
                          selectedDate,
                          selectedTime,
                          selectedService.duration,
                          business.address ? `${business.address}, ${business.city || ""}` : undefined
                        );
                        downloadICSFile(event, `${selectedService.name.replace(/\s+/g, "-")}-appointment.ics`);
                      }}
                      data-testid="button-add-apple-calendar"
                    >
                      <SiApple className="h-4 w-4 mr-2" />
                      {t("booking.appleCalendar")}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => {
                    setStep("services");
                    setSelectedService(null);
                    setSelectedTeamMember(null);
                    setSelectedDate(undefined);
                    setSelectedTime(null);
                    setConfirmedBooking(null);
                    form.reset();
                  }}
                  variant="outline"
                  data-testid="button-book-another"
                >
                  {t("booking.bookAnother")}
                </Button>
                <Button
                  onClick={() => window.location.href = "/my-bookings"}
                  data-testid="button-view-my-bookings"
                >
                  {t("booking.viewMyBookings")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={business.logoUrl || undefined} className="object-cover" />
              <AvatarFallback>{business.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold">{business.name}</h1>
              <p className="text-xs text-muted-foreground">
                {getCategoryLabel(business.category)}
              </p>
            </div>
          </div>
          <LanguageSwitcher minimal />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Progress Indicator */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-center gap-2">
            {["services", "datetime", "details"].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? "bg-primary text-primary-foreground"
                      : i < ["services", "datetime", "details"].indexOf(step)
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                {i < 2 && (
                  <div
                    className={`w-12 h-0.5 ${
                      i < ["services", "datetime", "details"].indexOf(step)
                        ? "bg-primary"
                        : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-8 mt-2 text-xs text-muted-foreground">
            <span>{t("booking.step.service")}</span>
            <span>{t("booking.step.datetime")}</span>
            <span>{t("booking.step.details")}</span>
          </div>
        </div>

        {/* Step: Services */}
        {step === "services" && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Business Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <Avatar className="h-20 w-20 md:h-24 md:w-24 flex-shrink-0">
                    <AvatarImage src={business.logoUrl || undefined} className="object-cover" />
                    <AvatarFallback className="text-2xl">
                      {business.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h2 className="text-2xl font-bold">{business.name}</h2>
                      <Badge variant="secondary" className="mt-1">
                        {getCategoryLabel(business.category)}
                      </Badge>
                    </div>
                    {business.description && (
                      <p className="text-muted-foreground">{business.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {(business.city || business.country) && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {[business.city, business.country].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}
                      {business.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          <span>{business.phone}</span>
                        </div>
                      )}
                      {business.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          <span>{business.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Services List */}
            <div>
              <h3 className="text-xl font-semibold mb-4">{t("booking.selectService")}</h3>
              {services && services.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {services
                    .filter((s) => s.isActive)
                    .map((service) => (
                      <Card
                        key={service.id}
                        className="cursor-pointer hover-elevate"
                        onClick={() => handleServiceSelect(service)}
                        data-testid={`service-card-${service.id}`}
                      >
                        <CardContent className="pt-6 space-y-3">
                          <h4 className="text-lg font-semibold">{service.name}</h4>
                          {service.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {service.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm">{service.duration} {t("booking.min")}</span>
                            </div>
                            <span className="text-lg font-bold">
                              {formatPrice(service.price)}
                            </span>
                          </div>
                          <Button className="w-full" data-testid={`button-select-service-${service.id}`}>
                            {t("booking.select")}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      {t("booking.noServices")}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Terms and Conditions */}
            {business.showTermsInBooking && business.termsAndConditions && (
              <Card className="border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {t("booking.termsAndConditions")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {business.termsAndConditions}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step: Team Member Selection */}
        {step === "team" && selectedService && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Button
              variant="default"
              onClick={handleBack}
              className="gap-2 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("booking.back")}
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>{t("booking.selectedService")}</CardTitle>
                <CardDescription>
                  {selectedService.name} - {selectedService.duration} {t("booking.min")} -{" "}
                  {formatPrice(selectedService.price)}
                </CardDescription>
              </CardHeader>
            </Card>

            <div>
              <h3 className="text-xl font-semibold mb-4">{t("booking.selectTeamMember")}</h3>
              {teamMembersLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
                        <Skeleton className="h-5 w-32 mx-auto mb-2" />
                        <Skeleton className="h-4 w-24 mx-auto" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : teamMembers && teamMembers.length > 1 ? (
                <div className="space-y-4">
                  {/* Option to skip team member selection */}
                  <Card
                    className="cursor-pointer hover-elevate border-dashed"
                    onClick={() => handleTeamMemberSelect(null)}
                    data-testid="team-member-any"
                  >
                    <CardContent className="pt-6 flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold">{t("booking.anyTeamMember")}</h4>
                        <p className="text-sm text-muted-foreground">
                          {t("booking.anyTeamMemberDesc")}
                        </p>
                      </div>
                      <Button variant="outline" data-testid="button-select-any-team-member">
                        {t("booking.select")}
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {teamMembers.map((member) => (
                      <Card
                        key={member.id}
                        className="cursor-pointer hover-elevate"
                        onClick={() => handleTeamMemberSelect(member)}
                        data-testid={`team-member-card-${member.id}`}
                      >
                        <CardContent className="pt-6 text-center space-y-3">
                          <Avatar className="h-20 w-20 mx-auto">
                            {business?.showTeamPicturesInBooking && member.photoUrl && (
                              <AvatarImage src={member.photoUrl} className="object-cover" />
                            )}
                            <AvatarFallback className="text-xl bg-primary/10 text-primary">
                              {member.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="text-lg font-semibold">{member.name}</h4>
                            {member.role && (
                              <p className="text-sm text-muted-foreground">{member.role}</p>
                            )}
                          </div>
                          <Button className="w-full" data-testid={`button-select-team-member-${member.id}`}>
                            {t("booking.select")}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-8">
                  <Skeleton className="h-8 w-8 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Date & Time */}
        {step === "datetime" && selectedService && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Button
              variant="default"
              onClick={handleBack}
              className="gap-2 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("booking.back")}
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>{t("booking.selectedService")}</CardTitle>
                <CardDescription>
                  {selectedService.name} - {selectedService.duration} {t("booking.min")} -{" "}
                  {formatPrice(selectedService.price)}
                  {selectedTeamMember && (
                    <span className="block mt-1">
                      {t("booking.withTeamMember")}: {selectedTeamMember.name}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("booking.selectDate")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => !isDateAvailable(date)}
                    fromDate={new Date()}
                    toDate={addDays(new Date(), 60)}
                    className="rounded-md"
                    locale={dateLocale}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedDate
                      ? `${t("booking.availableTimes")} - ${format(selectedDate, "MMM d, yyyy", { locale: dateLocale })}`
                      : t("booking.selectDateFirst")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDate ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {getAvailableSlots().map((slot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time ? "default" : "outline"}
                          disabled={!slot.available}
                          onClick={() => handleTimeSelect(slot.time)}
                          className="h-12"
                          data-testid={`time-slot-${slot.time}`}
                        >
                          {slot.time}
                        </Button>
                      ))}
                      {getAvailableSlots().length === 0 && (
                        <p className="col-span-full text-center text-muted-foreground py-8">
                          {t("booking.noSlots")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">
                        {t("booking.pleaseSelectDate")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step: Details */}
        {step === "details" && selectedService && selectedDate && selectedTime && (
          <div className="max-w-lg mx-auto space-y-6">
            <Button
              variant="default"
              onClick={handleBack}
              className="gap-2 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("booking.back")}
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>{t("booking.summary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedService.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{format(selectedDate, "EEEE, MMMM d, yyyy", { locale: dateLocale })}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedTime} - {calculateEndTime(selectedTime, selectedService.duration)} ({selectedService.duration} {t("booking.min")})
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <span className="font-semibold">{formatPrice(selectedService.price)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("booking.yourDetails")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("booking.name")} *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-customer-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("booking.email")} *</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" data-testid="input-customer-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("booking.phone")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" data-testid="input-customer-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("booking.notes")}</FormLabel>
                          <FormControl>
                            <Textarea {...field} className="resize-none" data-testid="input-customer-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {business?.showTermsInBooking && business?.termsAndConditions && (
                      <div className="space-y-3 pt-2 border-t">
                        <div className="bg-muted/50 rounded-md p-3 max-h-32 overflow-y-auto">
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                            {business.termsAndConditions}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="terms-checkbox"
                            checked={termsAccepted}
                            onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                            data-testid="checkbox-terms"
                          />
                          <Label
                            htmlFor="terms-checkbox"
                            className="text-sm font-normal cursor-pointer"
                          >
                            {t("booking.agreeToTerms")} *
                          </Label>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full gap-2"
                      disabled={createBookingMutation.isPending || (!!business?.showTermsInBooking && !!business?.termsAndConditions && !termsAccepted)}
                      data-testid="button-confirm-booking"
                    >
                      {createBookingMutation.isPending ? t("booking.processing") : t("booking.confirmBooking")}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
