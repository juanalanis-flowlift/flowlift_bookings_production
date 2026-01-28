import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { useTier } from "@/hooks/useTier";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UpgradeModal } from "@/components/UpgradeModal";
import {
  CalendarDays,
  CalendarCheck,
  CalendarClock,
  ArrowRight,
  Plus,
  Ban,
  Info,
  Sparkles,
  Lock,
} from "lucide-react";
import type { Business, Booking, Service, BlockedTime, Availability } from "@shared/schema";
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays, addDays, isSameDay } from "date-fns";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useI18n();
  const { isStarter, canAccessFeature } = useTier();
  const [showAnalyticsUpgradeModal, setShowAnalyticsUpgradeModal] = useState(false);
  const [, navigate] = useLocation();

  // Analytics charts require Pro+ tier
  const canAccessAnalytics = canAccessFeature("pro");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: t("common.unauthorized"),
        description: t("onboarding.logoutMessage"),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: business, isLoading: businessLoading } = useQuery<Business>({
    queryKey: ["/api/business"],
  });

  useEffect(() => {
    if (!businessLoading && !authLoading && isAuthenticated) {
      if (!business || !business.onboardingComplete) {
        navigate("/onboarding");
      }
    }
  }, [business, businessLoading, authLoading, isAuthenticated, navigate]);

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: !!business,
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!business,
  });

  const { data: blockedTimes } = useQuery<BlockedTime[]>({
    queryKey: ["/api/blocked-times"],
    enabled: !!business,
  });

  const { data: availability } = useQuery<Availability[]>({
    queryKey: ["/api/availability"],
    enabled: !!business,
  });

  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);
  const weekAgo = subDays(startOfToday, 7);
  const weekFromNow = addDays(endOfToday, 7);

  // Last week's bookings (past 7 days)
  const lastWeekBookings = bookings
    ?.filter(
      (b) =>
        b.status !== "cancelled" &&
        isAfter(new Date(b.bookingDate), weekAgo) &&
        isBefore(new Date(b.bookingDate), startOfToday)
    )
    .sort(
      (a, b) =>
        new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime()
    ) || [];

  // Today's bookings
  const todayBookings = bookings
    ?.filter(
      (b) =>
        b.status !== "cancelled" &&
        isSameDay(new Date(b.bookingDate), today)
    )
    .sort(
      (a, b) => {
        const timeA = a.startTime || "00:00";
        const timeB = b.startTime || "00:00";
        return timeA.localeCompare(timeB);
      }
    ) || [];

  // Next week's bookings (next 7 days, excluding today)
  const nextWeekBookings = bookings
    ?.filter(
      (b) =>
        b.status !== "cancelled" &&
        isAfter(new Date(b.bookingDate), endOfToday) &&
        isBefore(new Date(b.bookingDate), weekFromNow)
    )
    .sort(
      (a, b) =>
        new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()
    ) || [];

  // Helper to check if a blocked time overlaps with a date range
  const blockedTimeOverlaps = (bt: BlockedTime, rangeStart: Date, rangeEnd: Date) => {
    const btStart = new Date(bt.startDateTime);
    const btEnd = new Date(bt.endDateTime);
    return btStart < rangeEnd && btEnd > rangeStart;
  };

  // Last week's blocked times
  const lastWeekBlocked = blockedTimes
    ?.filter((bt) => blockedTimeOverlaps(bt, weekAgo, startOfToday))
    .sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime()) || [];

  // Today's blocked times
  const todayBlocked = blockedTimes
    ?.filter((bt) => blockedTimeOverlaps(bt, startOfToday, endOfToday))
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()) || [];

  // Next week's blocked times
  const nextWeekBlocked = blockedTimes
    ?.filter((bt) => blockedTimeOverlaps(bt, endOfToday, weekFromNow))
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()) || [];

  // Chart data for next 7 working days availability (Daily Occupation Rate)
  const chartData = useMemo(() => {
    if (!availability || !bookings || !services) return [];

    const data: { date: string; bookedHours: number; availableHours: number }[] = [];

    // Helper to convert time string (HH:MM) to hours as decimal
    const timeToHours = (time: string): number => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours + minutes / 60;
    };

    // Helper to get availability for a day of week
    const getDayAvailability = (dayOfWeek: number) => {
      const dayAvail = availability.find((a) => a.dayOfWeek === dayOfWeek && a.isOpen);
      if (!dayAvail) return 0;
      const start = timeToHours(dayAvail.startTime);
      const end = timeToHours(dayAvail.endTime);
      return Math.max(0, end - start);
    };

    // Generate data for next 7 WORKING days (skip closed days)
    let workingDaysFound = 0;
    let dayOffset = 0;
    while (workingDaysFound < 7 && dayOffset < 30) {
      const date = addDays(startOfToday, dayOffset);
      const dayOfWeek = date.getDay();
      const totalHours = getDayAvailability(dayOfWeek);
      dayOffset++;

      // Skip days that are closed
      if (totalHours === 0) continue;
      workingDaysFound++;

      // Calculate booked hours for this day
      const dayBookings = bookings.filter(
        (b) => b.status !== "cancelled" && isSameDay(new Date(b.bookingDate), date)
      );

      let bookedMinutes = 0;
      dayBookings.forEach((booking) => {
        const service = services.find((s) => s.id === booking.serviceId);
        if (service) {
          bookedMinutes += service.duration || 0;
        }
      });

      const bookedHours = Math.round((bookedMinutes / 60) * 10) / 10;
      const availableHours = Math.max(0, Math.round((totalHours - bookedHours) * 10) / 10);

      data.push({
        date: format(date, "dd-MMM"),
        bookedHours,
        availableHours,
      });
    }

    return data;
  }, [availability, bookings, services, startOfToday]);

  // Line chart data for last 7 working days completed bookings
  const lineChartData = useMemo(() => {
    if (!availability || !bookings) return [];

    const data: { date: string; completed: number }[] = [];

    // Helper to get availability for a day of week
    const isDayOpen = (dayOfWeek: number) => {
      return availability.some((a) => a.dayOfWeek === dayOfWeek && a.isOpen);
    };

    // Find the last 7 working days (going backwards from today)
    let workingDaysFound = 0;
    let dayOffset = 1; // Start from yesterday
    const workingDays: Date[] = [];

    while (workingDaysFound < 7 && dayOffset < 30) {
      const date = subDays(startOfToday, dayOffset);
      const dayOfWeek = date.getDay();
      dayOffset++;

      // Skip days that are closed
      if (!isDayOpen(dayOfWeek)) continue;
      workingDaysFound++;
      workingDays.push(date);
    }

    // Reverse to show oldest first
    workingDays.reverse();

    // Calculate completed bookings for each working day
    workingDays.forEach((date) => {
      const dayBookings = bookings.filter(
        (b) => b.status === "confirmed" && isSameDay(new Date(b.bookingDate), date)
      );

      data.push({
        date: format(date, "dd-MMM"),
        completed: dayBookings.length,
      });
    });

    return data;
  }, [availability, bookings, startOfToday]);

  // Calculate max Y-axis value for the chart
  const maxHours = useMemo(() => {
    if (!chartData.length) return 8;
    const maxTotal = Math.max(...chartData.map((d) => d.bookedHours + d.availableHours));
    return Math.ceil(maxTotal);
  }, [chartData]);

  // Pie chart data for booked services in last 7 working days
  const pieChartData = useMemo(() => {
    if (!availability || !bookings || !services) return [];

    // Helper to get availability for a day of week
    const isDayOpen = (dayOfWeek: number) => {
      return availability.some((a) => a.dayOfWeek === dayOfWeek && a.isOpen);
    };

    // Find the last 7 working days (going backwards from today)
    let workingDaysFound = 0;
    let dayOffset = 1; // Start from yesterday
    const workingDays: Date[] = [];

    while (workingDaysFound < 7 && dayOffset < 30) {
      const date = subDays(startOfToday, dayOffset);
      const dayOfWeek = date.getDay();
      dayOffset++;

      // Skip days that are closed
      if (!isDayOpen(dayOfWeek)) continue;
      workingDaysFound++;
      workingDays.push(date);
    }

    // Count bookings by service for these working days
    const serviceCounts: Record<string, number> = {};

    workingDays.forEach((date) => {
      const dayBookings = bookings.filter(
        (b) => b.status !== "cancelled" && isSameDay(new Date(b.bookingDate), date)
      );

      dayBookings.forEach((booking) => {
        const service = services.find((s) => s.id === booking.serviceId);
        if (service) {
          serviceCounts[service.name] = (serviceCounts[service.name] || 0) + 1;
        }
      });
    });

    // Convert to pie chart format
    return Object.entries(serviceCounts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [availability, bookings, services, startOfToday]);

  // Colors for pie chart segments
  const PIE_COLORS = [
    "hsl(139, 55%, 46%)", // Green (primary)
    "hsl(217, 91%, 60%)", // Blue
    "hsl(280, 65%, 60%)", // Purple
    "hsl(45, 93%, 47%)",  // Yellow/Gold
    "hsl(340, 75%, 55%)", // Pink
    "hsl(190, 90%, 45%)", // Cyan
    "hsl(25, 95%, 53%)",  // Orange
    "hsl(160, 60%, 45%)", // Teal
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 text-xs">{t("common.confirmed")}</Badge>;
      case "pending":
        return <Badge variant="secondary" className="text-xs">{t("common.pending")}</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="text-xs">{t("common.cancelled")}</Badge>;
      case "blocked":
        return <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs">{t("common.blockedSlot")}</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const BookingItem = ({ booking }: { booking: Booking }) => {
    const service = services?.find((s) => s.id === booking.serviceId);
    return (
      <div
        className="flex items-start justify-between gap-3 py-2 border-b last:border-b-0"
        data-testid={`booking-item-${booking.id}`}
      >
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-sm font-medium truncate">{booking.customerName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {service?.name} - {booking.startTime}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[70px]">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {format(new Date(booking.bookingDate), "MMM d")}
          </span>
          {getStatusBadge(booking.status)}
        </div>
      </div>
    );
  };

  const BlockedTimeItem = ({ blockedTime }: { blockedTime: BlockedTime }) => {
    const startDate = new Date(blockedTime.startDateTime);
    const endDate = new Date(blockedTime.endDateTime);
    const isSameDate = isSameDay(startDate, endDate);

    return (
      <div
        className="flex items-start justify-between gap-3 py-2 border-b last:border-b-0"
        data-testid={`blocked-item-${blockedTime.id}`}
      >
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1 min-w-0">
            <Ban className="h-3 w-3 text-orange-500 flex-shrink-0" />
            <p className="text-sm font-medium truncate">
              {blockedTime.reason || t("common.blockedTime")}
            </p>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[70px]">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {isSameDate
              ? format(startDate, "MMM d")
              : `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}`
            }
          </span>
          {getStatusBadge("blocked")}
        </div>
      </div>
    );
  };

  if (businessLoading || authLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">{t("dashboard.welcomeNewBusiness")}</h2>
            <p className="text-muted-foreground">
              {t("dashboard.setupNewBusiness")}
            </p>
            <Link href="/settings">
              <Button className="gap-2" data-testid="button-setup-business">
                {t("dashboard.setupButton")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-dashboard-title">
            {t("dashboard.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("dashboard.welcome")} {user?.firstName}
          </p>
        </div>
      </div>

      {/* Booking Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Last Week's Bookings */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.lastWeekBookings")}
                </CardTitle>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">{t("dashboard.infoLastWeek")}</p>
                  </TooltipContent>
                </UITooltip>
              </div>
              <p className="text-2xl font-bold mt-1" data-testid="text-lastweek-count">
                {lastWeekBookings.length}
              </p>
            </div>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <div className="px-6">
            <hr className="border-t border-border mb-4" />
          </div>
          <CardContent className="flex-1 pt-0">
            {bookingsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (lastWeekBookings.length > 0 || lastWeekBlocked.length > 0) ? (
              <ScrollArea className="h-40">
                <div className="pr-4">
                  {lastWeekBookings.map((booking) => (
                    <BookingItem key={booking.id} booking={booking} />
                  ))}
                  {lastWeekBlocked.map((bt) => (
                    <BlockedTimeItem key={bt.id} blockedTime={bt} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-40 flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">
                  {t("dashboard.noBookingsLastWeek")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Bookings */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.todaysBookings")}
                </CardTitle>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">{t("dashboard.infoToday")}</p>
                  </TooltipContent>
                </UITooltip>
              </div>
              <p className="text-2xl font-bold mt-1" data-testid="text-today-count">
                {todayBookings.length}
              </p>
            </div>
            <CalendarCheck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <div className="px-6">
            <hr className="border-t border-border mb-4" />
          </div>
          <CardContent className="flex-1 pt-0">
            {bookingsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (todayBookings.length > 0 || todayBlocked.length > 0) ? (
              <ScrollArea className="h-40">
                <div className="pr-4">
                  {todayBookings.map((booking) => (
                    <BookingItem key={booking.id} booking={booking} />
                  ))}
                  {todayBlocked.map((bt) => (
                    <BlockedTimeItem key={bt.id} blockedTime={bt} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-40 flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">
                  {t("dashboard.noBookingsToday")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Week's Bookings */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.nextWeekBookings")}
                </CardTitle>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">{t("dashboard.infoNext7Days")}</p>
                  </TooltipContent>
                </UITooltip>
              </div>
              <p className="text-2xl font-bold mt-1" data-testid="text-nextweek-count">
                {nextWeekBookings.length}
              </p>
            </div>
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <div className="px-6">
            <hr className="border-t border-border mb-4" />
          </div>
          <CardContent className="flex-1 pt-0">
            {bookingsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (nextWeekBookings.length > 0 || nextWeekBlocked.length > 0) ? (
              <ScrollArea className="h-40">
                <div className="pr-4">
                  {nextWeekBookings.map((booking) => (
                    <BookingItem key={booking.id} booking={booking} />
                  ))}
                  {nextWeekBlocked.map((bt) => (
                    <BlockedTimeItem key={bt.id} blockedTime={bt} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-40 flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">
                  {t("dashboard.noBookingsNextWeek")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid - matches 3-column layout of cards above */}
      {canAccessAnalytics ? (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Completed Bookings Line Chart - aligned with Last Week card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("dashboard.completedBookings")}
              </CardTitle>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">{t("dashboard.infoCompletedBookings")}</p>
                </TooltipContent>
              </UITooltip>
            </CardHeader>
            <CardContent>
              <div className="h-48" data-testid="chart-completed-bookings">
                {lineChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11 }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [value, t("dashboard.completed")]}
                        labelFormatter={(label) => `${t("dashboard.date")}: ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="completed"
                        stroke="hsl(139, 55%, 46%)"
                        strokeWidth={2}
                        dot={{ fill: "hsl(139, 55%, 46%)", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: "hsl(139, 55%, 46%)" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">{t("dashboard.noDataAvailable")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Booked Services Pie Chart - aligned with Today card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("dashboard.bookedServicesLastWeek")}
              </CardTitle>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">{t("dashboard.infoBookedServices")}</p>
                </TooltipContent>
              </UITooltip>
            </CardHeader>
            <CardContent>
              <div className="h-48" data-testid="chart-booked-services">
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {pieChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string) => [value, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">{t("dashboard.noDataAvailable")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Daily Occupation Rate Chart - aligned with Next 7 Days card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("dashboard.dailyOccupationRate")}
              </CardTitle>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">{t("dashboard.infoOccupationRate")}</p>
                </TooltipContent>
              </UITooltip>
            </CardHeader>
            <CardContent>
              <div className="h-48" data-testid="chart-daily-occupation">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis
                        domain={[0, maxHours]}
                        tick={{ fontSize: 11 }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                        label={{
                          value: t("dashboard.hours"),
                          angle: -90,
                          position: "insideLeft",
                          style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" }
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string) => [
                          `${value}h`,
                          name === "bookedHours" ? t("dashboard.booked") : t("dashboard.available")
                        ]}
                        labelFormatter={(label) => `${t("dashboard.date")}: ${label}`}
                      />
                      <Legend
                        formatter={(value) =>
                          value === "bookedHours" ? t("dashboard.booked") : t("dashboard.available")
                        }
                        wrapperStyle={{ fontSize: "11px" }}
                      />
                      <Bar
                        dataKey="bookedHours"
                        stackId="a"
                        fill="#33B658"
                        name="bookedHours"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="availableHours"
                        stackId="a"
                        fill="#D26969"
                        name="availableHours"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">{t("dashboard.noDataAvailable")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Locked Analytics Card for Starter tier */
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background z-10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              {t("dashboard.analytics")}
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Pro+
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {/* Blurred placeholder charts */}
            <div className="grid gap-4 md:grid-cols-3 blur-sm opacity-50 pointer-events-none">
              <div className="h-48 bg-muted rounded-lg" />
              <div className="h-48 bg-muted rounded-lg" />
              <div className="h-48 bg-muted rounded-lg" />
            </div>

            {/* Upgrade overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">{t("dashboard.analyticsLocked")}</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {t("dashboard.analyticsLockedDesc")}
                </p>
                <Button
                  onClick={() => setShowAnalyticsUpgradeModal(true)}
                  className="gap-2"
                  data-testid="button-upgrade-analytics"
                >
                  <Sparkles className="h-4 w-4" />
                  {t("upgrade.unlockFeature")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <UpgradeModal
        open={showAnalyticsUpgradeModal}
        onOpenChange={setShowAnalyticsUpgradeModal}
        targetTier="pro"
        title={t("upgrade.analytics.title")}
        benefits={[
          t("upgrade.analytics.benefit1"),
          t("upgrade.analytics.benefit2"),
          t("upgrade.analytics.benefit3"),
          t("upgrade.analytics.benefit4"),
        ]}
      />
    </div>
  );
}
