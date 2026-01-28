import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, type Language } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Clock, Briefcase, Building2, Globe, XCircle, ArrowLeft, ArrowRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, addDays, isBefore, startOfDay, isToday, addMinutes } from "date-fns";
import { es, enUS } from "date-fns/locale";
import type { Service, Availability, Booking } from "@shared/schema";

interface BookingDetails {
  booking: {
    id: string;
    customerName: string;
    customerEmail: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    status: string;
    serviceId: number;
  };
  service: {
    id: string;
    name: string;
    duration: number;
    price: string;
  };
  business: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    slug: string;
  };
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function CustomerModify() {
  const { t, language, setLanguage } = useI18n();
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<"current" | "select" | "confirm">("current");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const getLocale = () => (language === "es" ? es : enUS);

  const LanguageSelector = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-language-selector">
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLanguage("en")} data-testid="menu-item-english">
          English {language === "en" && "✓"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("es")} data-testid="menu-item-spanish">
          Español {language === "es" && "✓"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    setToken(tokenParam);
  }, []);

  const { data: details, isLoading, error } = useQuery<BookingDetails>({
    queryKey: ["/api/public/bookings/customer-action", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/bookings/customer-action/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const { data: availability } = useQuery<Availability[]>({
    queryKey: ["/api/public/availability", details?.business?.slug],
    enabled: !!details?.business?.slug,
  });

  const { data: existingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/public/bookings", details?.business?.slug, selectedDate?.toISOString()],
    enabled: !!details?.business?.slug && !!selectedDate,
  });

  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = addMinutes(startDate, duration);
    return format(endDate, "HH:mm");
  };

  const getAvailableSlots = (): TimeSlot[] => {
    if (!selectedDate || !details?.service || !availability) return [];

    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = availability.find((a) => a.dayOfWeek === dayOfWeek);

    if (!dayAvailability || !dayAvailability.isOpen) return [];

    const slots: TimeSlot[] = [];
    const slotDuration = dayAvailability.slotDuration || 30;
    const serviceDuration = details.service.duration;
    const maxSlotCapacity = dayAvailability.maxBookingsPerSlot || 1;

    const [startHour, startMin] = dayAvailability.startTime.split(":").map(Number);
    const [endHour, endMin] = dayAvailability.endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    for (let time = startMinutes; time + serviceDuration <= endMinutes; time += slotDuration) {
      const hours = Math.floor(time / 60);
      const mins = time % 60;
      const timeStr = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
      const endTimeStr = calculateEndTime(timeStr, serviceDuration);

      let overlappingBookings = 0;
      if (existingBookings) {
        const currentBookingId = details.booking.id;
        overlappingBookings = existingBookings.filter((booking) => {
          if (booking.status === "cancelled") return false;
          if (String(booking.id) === currentBookingId) return false;
          
          const bookingStart = booking.startTime;
          const bookingEnd = booking.endTime;

          return !(endTimeStr <= bookingStart || timeStr >= bookingEnd);
        }).length;
      }

      let isPastTime = false;
      if (isToday(selectedDate)) {
        const now = new Date();
        const slotTime = new Date();
        slotTime.setHours(hours, mins, 0, 0);
        isPastTime = slotTime <= now;
      }

      slots.push({
        time: timeStr,
        available: overlappingBookings < maxSlotCapacity && !isPastTime,
      });
    }

    return slots;
  };

  const isDayAvailable = (date: Date): boolean => {
    if (!availability) return false;
    const dayOfWeek = date.getDay();
    const dayAvailability = availability.find((a) => a.dayOfWeek === dayOfWeek);
    return dayAvailability?.isOpen ?? false;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !token || !details) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const endTime = calculateEndTime(selectedTime, details.service.duration);
      
      const res = await fetch("/api/public/bookings/customer-modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newDate: selectedDate.toISOString(),
          newStartTime: selectedTime,
          newEndTime: endTime,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to modify booking");
      }

      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2" data-testid="text-not-found-title">{t("customerModify.notFound")}</h2>
            <p className="text-muted-foreground" data-testid="text-not-found-desc">
              {t("customerModify.notFoundDesc")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-bold">{t("app.name")}</h1>
          <LanguageSelector />
        </header>
        <div className="max-w-lg mx-auto p-4 mt-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-bold">{t("app.name")}</h1>
          <LanguageSelector />
        </header>
        <div className="max-w-lg mx-auto p-4 mt-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2" data-testid="text-error-title">{t("customerModify.error")}</h2>
              <p className="text-muted-foreground" data-testid="text-error-desc">
                {(error as Error)?.message || t("customerModify.errorDesc")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (details.booking.status === "cancelled") {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-bold">{t("app.name")}</h1>
          <LanguageSelector />
        </header>
        <div className="max-w-lg mx-auto p-4 mt-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">{t("customerModify.alreadyCancelled")}</h2>
              <p className="text-muted-foreground">
                {t("customerModify.alreadyCancelledDesc")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-bold">{t("app.name")}</h1>
          <LanguageSelector />
        </header>
        <div className="max-w-lg mx-auto p-4 mt-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2" data-testid="text-modified-title">{t("customerModify.modified")}</h2>
              <p className="text-muted-foreground mb-4" data-testid="text-modified-desc">
                {t("customerModify.modifiedDesc")}
              </p>
              <div className="bg-muted/50 rounded-lg p-4 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t("customerModify.newDate")}:</span>
                  <span>{selectedDate && format(selectedDate, "PPP", { locale: getLocale() })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t("customerModify.newTime")}:</span>
                  <span>{selectedTime && formatTime(selectedTime)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const availableSlots = getAvailableSlots();
  const bookingDate = new Date(details.booking.bookingDate);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">{t("app.name")}</h1>
        <LanguageSelector />
      </header>

      <div className="max-w-2xl mx-auto p-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle data-testid="text-modify-title">{t("customerModify.title")}</CardTitle>
            <p className="text-muted-foreground">{t("customerModify.subtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === "current" && (
              <>
                <div>
                  <h3 className="font-medium mb-3">{t("customerModify.currentBooking")}</h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{t("customerModify.service")}:</span>
                      <span>{details.service.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{t("customerModify.date")}:</span>
                      <span>{format(bookingDate, "PPP", { locale: getLocale() })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{t("customerModify.time")}:</span>
                      <span>{formatTime(details.booking.startTime)} - {formatTime(details.booking.endTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{t("customerModify.business")}:</span>
                      <span>{details.business.name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.history.back()}
                    data-testid="button-go-back"
                  >
                    {t("customerModify.goBack")}
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => setStep("select")}
                    data-testid="button-change-time"
                  >
                    {t("customerModify.changeTime")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {step === "select" && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Button variant="ghost" size="icon" onClick={() => setStep("current")}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="font-medium">{t("customerModify.selectNewTime")}</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium mb-2">{t("customerModify.selectDate")}</h4>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setSelectedTime(null);
                      }}
                      disabled={(date) =>
                        isBefore(date, startOfDay(new Date())) || !isDayAvailable(date)
                      }
                      locale={getLocale()}
                      className="rounded-md border"
                      data-testid="calendar-modify"
                    />
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">{t("customerModify.selectTime")}</h4>
                    {selectedDate ? (
                      availableSlots.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                          {availableSlots.map((slot) => (
                            <Button
                              key={slot.time}
                              variant={selectedTime === slot.time ? "default" : "outline"}
                              size="sm"
                              disabled={!slot.available}
                              onClick={() => setSelectedTime(slot.time)}
                              data-testid={`button-time-${slot.time}`}
                            >
                              {formatTime(slot.time)}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          {t("customerModify.noSlots")}
                        </p>
                      )
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        {t("customerModify.selectDateFirst")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("current")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("customerModify.goBack")}
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    disabled={!selectedDate || !selectedTime}
                    onClick={() => setStep("confirm")}
                    data-testid="button-continue"
                  >
                    {t("customerModify.continue")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {step === "confirm" && selectedDate && selectedTime && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Button variant="ghost" size="icon" onClick={() => setStep("select")}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="font-medium">{t("customerModify.confirmChange")}</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{t("customerModify.currentBooking")}</h4>
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{format(bookingDate, "PPP", { locale: getLocale() })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatTime(details.booking.startTime)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-primary mb-2">{t("customerModify.newBooking")}</h4>
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        <span className="font-medium">{format(selectedDate, "PPP", { locale: getLocale() })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-medium">{formatTime(selectedTime)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {submitError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
                    {submitError}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("select")}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("customerModify.goBack")}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    data-testid="button-confirm-modify"
                  >
                    {isSubmitting ? t("customerModify.modifying") : t("customerModify.confirmModify")}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
