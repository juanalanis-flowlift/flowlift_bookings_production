import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { useTier } from "@/hooks/useTier";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar as CalendarIcon,
  List,
  Clock,
  User,
  Users,
  Mail,
  Phone,
  FileText,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Edit,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import type { Booking, Service, Business, TeamMember, TeamMemberAvailability } from "@shared/schema";
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays } from "date-fns";
import { es, enUS } from "date-fns/locale";

interface TeamMemberWithAvailability extends TeamMember {
  availability: TeamMemberAvailability[];
}
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Bookings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t, language } = useI18n();
  const { isTeams } = useTier();

  const getLocale = () => language === "es" ? es : enUS;
  const [view, setView] = useState<"list" | "calendar" | "teamLoad">("list");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [weekStartDate, setWeekStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Modify booking state
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [bookingToModify, setBookingToModify] = useState<Booking | null>(null);
  const [proposedDate, setProposedDate] = useState<Date | undefined>(undefined);
  const [proposedStartTime, setProposedStartTime] = useState<string>("");
  const [proposedEndTime, setProposedEndTime] = useState<string>("");
  const [modificationReason, setModificationReason] = useState<string>("");

  // Add booking state
  const [addBookingDialogOpen, setAddBookingDialogOpen] = useState(false);
  const [newBookingServiceId, setNewBookingServiceId] = useState<string>("");
  const [newBookingDate, setNewBookingDate] = useState<Date | undefined>(undefined);
  const [newBookingStartTime, setNewBookingStartTime] = useState<string>("");
  const [newBookingEndTime, setNewBookingEndTime] = useState<string>("");
  const [newBookingCustomerName, setNewBookingCustomerName] = useState<string>("");
  const [newBookingCustomerEmail, setNewBookingCustomerEmail] = useState<string>("");
  const [newBookingCustomerPhone, setNewBookingCustomerPhone] = useState<string>("");
  const [newBookingNotes, setNewBookingNotes] = useState<string>("");

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

  const { data: business } = useQuery<Business>({
    queryKey: ["/api/business"],
  });

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: !!business,
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!business,
  });

  const { data: teamMembers } = useQuery<TeamMemberWithAvailability[]>({
    queryKey: ["/api/team-members"],
    enabled: !!business,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      internalNotes,
    }: {
      id: string;
      status?: string;
      internalNotes?: string;
    }) => {
      return await apiRequest("PATCH", `/api/bookings/${id}`, {
        status,
        internalNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setSelectedBooking(null);
      toast({ title: t("bookings.updated") });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: t("bookings.updateError"), variant: "destructive" });
    },
  });

  const modifyMutation = useMutation({
    mutationFn: async ({
      id,
      proposedBookingDate,
      proposedStartTime,
      proposedEndTime,
      modificationReason,
    }: {
      id: string;
      proposedBookingDate: Date;
      proposedStartTime: string;
      proposedEndTime: string;
      modificationReason?: string;
    }) => {
      return await apiRequest("POST", `/api/bookings/${id}/request-modification`, {
        proposedBookingDate,
        proposedStartTime,
        proposedEndTime,
        modificationReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setModifyDialogOpen(false);
      setBookingToModify(null);
      setProposedDate(undefined);
      setProposedStartTime("");
      setProposedEndTime("");
      setModificationReason("");
      toast({ title: t("bookings.modificationRequestSent") });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: t("bookings.modificationRequestFailed"), variant: "destructive" });
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: {
      serviceId: string;
      bookingDate: Date;
      startTime: string;
      endTime: string;
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      customerNotes?: string;
      preferredLanguage?: string;
    }) => {
      return await apiRequest("POST", "/api/bookings", bookingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setAddBookingDialogOpen(false);
      resetAddBookingForm();
      toast({ title: t("bookings.bookingCreated") });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: t("bookings.bookingCreateFailed"), variant: "destructive" });
    },
  });

  const resetAddBookingForm = () => {
    setNewBookingServiceId("");
    setNewBookingDate(undefined);
    setNewBookingStartTime("");
    setNewBookingEndTime("");
    setNewBookingCustomerName("");
    setNewBookingCustomerEmail("");
    setNewBookingCustomerPhone("");
    setNewBookingNotes("");
  };

  const handleOpenAddBookingDialog = () => {
    resetAddBookingForm();
    setAddBookingDialogOpen(true);
  };

  // Calculate end time from service duration
  const calculateEndTime = (startTime: string, serviceId: string) => {
    const service = services?.find(s => s.id === serviceId);
    if (!service || !startTime) return "";

    const [hours, minutes] = startTime.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + service.duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
  };

  // Auto-update end time when start time or service changes
  const handleNewBookingStartTimeChange = (startTime: string) => {
    setNewBookingStartTime(startTime);
    if (newBookingServiceId && startTime) {
      setNewBookingEndTime(calculateEndTime(startTime, newBookingServiceId));
    }
  };

  const handleNewBookingServiceChange = (serviceId: string) => {
    setNewBookingServiceId(serviceId);
    if (newBookingStartTime && serviceId) {
      setNewBookingEndTime(calculateEndTime(newBookingStartTime, serviceId));
    }
  };

  const handleSubmitNewBooking = () => {
    if (!newBookingServiceId || !newBookingDate || !newBookingStartTime || !newBookingCustomerName || !newBookingCustomerEmail) {
      toast({ title: t("common.fillAllFields"), variant: "destructive" });
      return;
    }

    // End time is auto-calculated or manually entered
    const endTime = newBookingEndTime || calculateEndTime(newBookingStartTime, newBookingServiceId);

    createBookingMutation.mutate({
      serviceId: newBookingServiceId,
      bookingDate: newBookingDate,
      startTime: newBookingStartTime,
      endTime: endTime,
      customerName: newBookingCustomerName,
      customerEmail: newBookingCustomerEmail,
      customerPhone: newBookingCustomerPhone || undefined,
      customerNotes: newBookingNotes || undefined,
      preferredLanguage: language,
    });
  };

  const getServiceName = (serviceId: string) => {
    return services?.find((s) => s.id === serviceId)?.name || "Unknown Service";
  };

  const getTeamMemberName = (teamMemberId: string | null | undefined) => {
    if (!teamMemberId) return null;
    return teamMembers?.find((m) => m.id === teamMemberId)?.name || null;
  };

  // Get the week days for the team load view
  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStartDate, i));
    }
    return days;
  };

  // Get bookings for a specific team member on a specific date
  const getTeamMemberBookingsForDate = (teamMemberId: string, date: Date) => {
    return bookings?.filter((booking) =>
      booking.teamMemberId === teamMemberId &&
      isSameDay(new Date(booking.bookingDate), date) &&
      booking.status !== "cancelled"
    ) || [];
  };

  // Get all bookings for a date (for team members without specific assignment)
  const getBookingsForDateWithoutTeamMember = (date: Date) => {
    return bookings?.filter((booking) =>
      !booking.teamMemberId &&
      isSameDay(new Date(booking.bookingDate), date) &&
      booking.status !== "cancelled"
    ) || [];
  };

  // Convert time string to minutes from midnight
  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Get team member availability for a specific day
  const getTeamMemberAvailabilityForDay = (member: TeamMemberWithAvailability, dayOfWeek: number) => {
    return member.availability?.find((a) => a.dayOfWeek === dayOfWeek && a.isAvailable);
  };

  // Color palette for team members
  const teamMemberColors = [
    { bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-300 dark:border-blue-700", text: "text-blue-700 dark:text-blue-300" },
    { bg: "bg-rose-100 dark:bg-rose-900/30", border: "border-rose-300 dark:border-rose-700", text: "text-rose-700 dark:text-rose-300" },
    { bg: "bg-green-100 dark:bg-green-900/30", border: "border-green-300 dark:border-green-700", text: "text-green-700 dark:text-green-300" },
    { bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-300 dark:border-purple-700", text: "text-purple-700 dark:text-purple-300" },
    { bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-300 dark:border-amber-700", text: "text-amber-700 dark:text-amber-300" },
    { bg: "bg-cyan-100 dark:bg-cyan-900/30", border: "border-cyan-300 dark:border-cyan-700", text: "text-cyan-700 dark:text-cyan-300" },
  ];

  const getTeamMemberColor = (index: number) => {
    return teamMemberColors[index % teamMemberColors.length];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
            {t("common.confirmed")}
          </Badge>
        );
      case "pending":
        return <Badge variant="secondary">{t("common.pending")}</Badge>;
      case "modification_pending":
        return (
          <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400">
            {t("bookings.modificationPending")}
          </Badge>
        );
      case "cancelled":
        return <Badge variant="destructive">{t("common.cancelled")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredBookings = bookings?.filter((booking) => {
    if (statusFilter === "all") return true;
    return booking.status === statusFilter;
  });

  const sortedBookings = filteredBookings?.sort(
    (a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime()
  );

  const getBookingsForDate = (date: Date) => {
    return bookings?.filter((booking) =>
      isSameDay(new Date(booking.bookingDate), date)
    ) || [];
  };

  const getDatesWithBookings = () => {
    const start = startOfMonth(calendarDate);
    const end = endOfMonth(calendarDate);
    return bookings
      ?.filter((b) => {
        const date = new Date(b.bookingDate);
        return date >= start && date <= end && b.status !== "cancelled";
      })
      .map((b) => new Date(b.bookingDate)) || [];
  };

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setInternalNotes(booking.internalNotes || "");
  };

  const handleStatusChange = (bookingId: string, newStatus: string) => {
    updateMutation.mutate({ id: bookingId, status: newStatus });
  };

  const handleSaveNotes = () => {
    if (selectedBooking) {
      updateMutation.mutate({
        id: selectedBooking.id,
        internalNotes,
      });
    }
  };

  const handleOpenModifyDialog = (booking: Booking) => {
    setBookingToModify(booking);
    setProposedDate(new Date(booking.bookingDate));
    setProposedStartTime(booking.startTime);
    setProposedEndTime(booking.endTime);
    setModificationReason("");
    setModifyDialogOpen(true);
  };

  const handleSubmitModification = () => {
    if (!bookingToModify || !proposedDate || !proposedStartTime || !proposedEndTime) {
      toast({ title: t("common.fillAllFields"), variant: "destructive" });
      return;
    }
    modifyMutation.mutate({
      id: bookingToModify.id,
      proposedBookingDate: proposedDate,
      proposedStartTime,
      proposedEndTime,
      modificationReason: modificationReason || undefined,
    });
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let h = 6; h < 22; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hour = h.toString().padStart(2, "0");
        const min = m.toString().padStart(2, "0");
        slots.push(`${hour}:${min}`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  if (isLoading || authLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="p-6">
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Please set up your business profile first.
            </p>
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
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-bookings-title">
            {t("bookings.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("bookings.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("bookings.all")}</SelectItem>
              <SelectItem value="pending">{t("bookings.pending")}</SelectItem>
              <SelectItem value="confirmed">{t("bookings.confirmed")}</SelectItem>
              <SelectItem value="cancelled">{t("bookings.cancelled")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleOpenAddBookingDialog}
            className="gap-2"
            data-testid="button-add-booking"
          >
            <Plus className="h-4 w-4" />
            {t("bookings.addBooking")}
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar" | "teamLoad")}>
        <TabsList>
          <TabsTrigger value="list" className="gap-2" data-testid="tab-list-view">
            <List className="h-4 w-4" />
            {t("bookings.list")}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2" data-testid="tab-calendar-view">
            <CalendarIcon className="h-4 w-4" />
            {t("bookings.calendar")}
          </TabsTrigger>
          {isTeams && (
            <TabsTrigger value="teamLoad" className="gap-2" data-testid="tab-team-load-view">
              <Users className="h-4 w-4" />
              {t("bookings.teamLoad")}
            </TabsTrigger>
          )}
        </TabsList>

        {/* List View */}
        <TabsContent value="list" className="mt-4">
          {sortedBookings && sortedBookings.length > 0 ? (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("booking.yourDetails")}</TableHead>
                      <TableHead>{t("booking.selectedService")}</TableHead>
                      <TableHead>{t("booking.selectDateTime")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedBookings.map((booking) => (
                      <TableRow key={booking.id} data-testid={`booking-row-${booking.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{booking.customerName}</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.customerEmail}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getServiceName(booking.serviceId)}</TableCell>
                        <TableCell>
                          <div className="min-w-max">
                            <p className="whitespace-normal">{format(new Date(booking.bookingDate), "MMM d, yyyy", { locale: getLocale() })}</p>
                            <p className="text-sm text-muted-foreground whitespace-normal">
                              {booking.startTime} - {booking.endTime}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-actions-${booking.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewDetails(booking)}
                                data-testid={`action-view-${booking.id}`}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                {t("bookings.viewDetails")}
                              </DropdownMenuItem>
                              {booking.status !== "cancelled" && booking.status !== "modification_pending" && (
                                <DropdownMenuItem
                                  onClick={() => handleOpenModifyDialog(booking)}
                                  data-testid={`action-modify-${booking.id}`}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t("bookings.modify")}
                                </DropdownMenuItem>
                              )}
                              {booking.status !== "confirmed" && booking.status !== "modification_pending" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(booking.id, "confirmed")
                                  }
                                  data-testid={`action-confirm-${booking.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  {t("bookings.confirm")}
                                </DropdownMenuItem>
                              )}
                              {booking.status !== "cancelled" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(booking.id, "cancelled")
                                  }
                                  className="text-destructive"
                                  data-testid={`action-cancel-${booking.id}`}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  {t("bookings.cancelBooking")}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">{t("bookings.noBookingsEmpty")}</h3>
                <p className="text-muted-foreground">
                  {statusFilter !== "all"
                    ? t("bookings.noBookingsFilter")
                    : t("bookings.sharePage")}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
            <Card>
              <CardContent className="pt-4">
                <Calendar
                  mode="single"
                  selected={calendarDate}
                  onSelect={(date) => date && setCalendarDate(date)}
                  locale={language === "es" ? es : undefined}
                  modifiers={{
                    booked: getDatesWithBookings(),
                  }}
                  modifiersStyles={{
                    booked: {
                      fontWeight: "bold",
                      backgroundColor: "hsl(var(--primary) / 0.1)",
                    },
                  }}
                  className="rounded-md"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {format(calendarDate, "EEEE, MMMM d, yyyy", { locale: getLocale() })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getBookingsForDate(calendarDate).length > 0 ? (
                  <div className="space-y-3">
                    {getBookingsForDate(calendarDate)
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between gap-4 p-3 rounded-lg border cursor-pointer hover-elevate"
                          onClick={() => handleViewDetails(booking)}
                          data-testid={`calendar-booking-${booking.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Clock className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{booking.customerName}</p>
                              <p className="text-sm text-muted-foreground">
                                {getServiceName(booking.serviceId)} • {booking.startTime}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(booking.status)}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      {t("common.noBookingsOnDate")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Team Load View */}
        <TabsContent value="teamLoad" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t("bookings.teamSchedule")}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setWeekStartDate(subWeeks(weekStartDate, 1))}
                    data-testid="button-prev-week"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[200px] text-center">
                    {format(weekStartDate, "MMM d", { locale: getLocale() })} - {format(addDays(weekStartDate, 6), "MMM d, yyyy", { locale: getLocale() })}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setWeekStartDate(addWeeks(weekStartDate, 1))}
                    data-testid="button-next-week"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWeekStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                    data-testid="button-today"
                  >
                    {t("bookings.today")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {teamMembers && teamMembers.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Week Header */}
                    <div className="grid grid-cols-8 gap-2 mb-4">
                      <div className="font-medium text-sm text-muted-foreground">
                        {t("bookings.teamMember")}
                      </div>
                      {getWeekDays().map((day, index) => {
                        const isToday = isSameDay(day, new Date());
                        return (
                          <div
                            key={index}
                            className={`text-center p-2 rounded-lg ${isToday ? "bg-primary/10" : ""}`}
                          >
                            <div className="text-xs text-muted-foreground uppercase">
                              {format(day, "EEE", { locale: getLocale() })}
                            </div>
                            <div className={`text-lg font-semibold ${isToday ? "text-primary" : ""}`}>
                              {format(day, "d")}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Team Members Rows */}
                    {teamMembers.filter(m => m.isActive).map((member, memberIndex) => {
                      const color = getTeamMemberColor(memberIndex);
                      return (
                        <div key={member.id} className="grid grid-cols-8 gap-2 mb-4">
                          {/* Team Member Info */}
                          <div className="flex items-start gap-2 p-2">
                            <div className={`w-10 h-10 rounded-full ${color.bg} flex items-center justify-center flex-shrink-0`}>
                              <span className={`text-sm font-medium ${color.text}`}>
                                {member.name.charAt(0)}
                              </span>
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm font-medium truncate">{member.name}</p>
                              {member.role && (
                                <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                              )}
                            </div>
                          </div>

                          {/* Days Columns */}
                          {getWeekDays().map((day, dayIndex) => {
                            const dayOfWeek = day.getDay();
                            const memberAvail = getTeamMemberAvailabilityForDay(member, dayOfWeek);
                            const dayBookings = getTeamMemberBookingsForDate(member.id, day);

                            return (
                              <div
                                key={dayIndex}
                                className={`min-h-[100px] border rounded-lg p-1 ${memberAvail ? "bg-background" : "bg-muted/50"
                                  }`}
                              >
                                {memberAvail && (
                                  <div className="text-[10px] text-muted-foreground mb-1 text-center">
                                    {memberAvail.startTime} - {memberAvail.endTime}
                                  </div>
                                )}
                                <div className="space-y-1">
                                  {dayBookings
                                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                    .map((booking) => (
                                      <div
                                        key={booking.id}
                                        className={`p-1.5 rounded text-xs cursor-pointer hover:opacity-80 ${color.bg} ${color.border} border-l-2`}
                                        onClick={() => handleViewDetails(booking)}
                                        data-testid={`team-load-booking-${booking.id}`}
                                      >
                                        <div className={`font-medium ${color.text}`}>
                                          {booking.startTime} - {booking.endTime}
                                        </div>
                                        <div className="truncate text-muted-foreground">
                                          {booking.customerName}
                                        </div>
                                        <div className="truncate text-muted-foreground opacity-75">
                                          {getServiceName(booking.serviceId)}
                                        </div>
                                        {booking.status === "confirmed" && (
                                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* Unassigned Bookings Row */}
                    {getWeekDays().some(day => getBookingsForDateWithoutTeamMember(day).length > 0) && (
                      <div className="grid grid-cols-8 gap-2 mb-4 pt-4 border-t">
                        <div className="flex items-start gap-2 p-2">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{t("bookings.unassigned")}</p>
                            <p className="text-xs text-muted-foreground">{t("bookings.noTeamMember")}</p>
                          </div>
                        </div>

                        {getWeekDays().map((day, dayIndex) => {
                          const dayBookings = getBookingsForDateWithoutTeamMember(day);
                          return (
                            <div
                              key={dayIndex}
                              className="min-h-[100px] border rounded-lg p-1 bg-background border-dashed"
                            >
                              <div className="space-y-1">
                                {dayBookings
                                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                  .map((booking) => (
                                    <div
                                      key={booking.id}
                                      className="p-1.5 rounded text-xs cursor-pointer hover:opacity-80 bg-muted border-l-2 border-muted-foreground"
                                      onClick={() => handleViewDetails(booking)}
                                      data-testid={`team-load-unassigned-${booking.id}`}
                                    >
                                      <div className="font-medium">
                                        {booking.startTime} - {booking.endTime}
                                      </div>
                                      <div className="truncate text-muted-foreground">
                                        {booking.customerName}
                                      </div>
                                      <div className="truncate text-muted-foreground opacity-75">
                                        {getServiceName(booking.serviceId)}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-semibold mb-2">{t("bookings.noTeamMembers")}</h3>
                  <p className="text-muted-foreground">
                    {t("bookings.addTeamMembersFirst")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Booking Details Dialog */}
      <Dialog
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("bookings.title")}</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 pr-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("common.status")}</span>
                {getStatusBadge(selectedBooking.status)}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedBooking.customerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedBooking.customerEmail}</span>
                </div>
                {selectedBooking.customerPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedBooking.customerPhone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(selectedBooking.bookingDate), "MMMM d, yyyy", { locale: getLocale() })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedBooking.startTime} - {selectedBooking.endTime}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="font-medium mb-1">{t("booking.selectedService")}</p>
                <p className="text-muted-foreground">
                  {getServiceName(selectedBooking.serviceId)}
                </p>
              </div>

              {selectedBooking.customerNotes && (
                <div className="border-t pt-4">
                  <p className="font-medium mb-1">{t("bookings.customerNotes")}</p>
                  <p className="text-muted-foreground">
                    {selectedBooking.customerNotes}
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="font-medium mb-2">{t("bookings.internalNotes")}</p>
                <Textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder={t("bookings.internalNotes")}
                  className="resize-none"
                  data-testid="input-internal-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedBooking?.status !== "confirmed" && (
              <Button
                variant="outline"
                onClick={() =>
                  handleStatusChange(selectedBooking!.id, "confirmed")
                }
                disabled={updateMutation.isPending}
                className="gap-2"
                data-testid="button-dialog-confirm"
              >
                <CheckCircle className="h-4 w-4" />
                {t("bookings.confirm")}
              </Button>
            )}
            {selectedBooking?.status !== "cancelled" && (
              <Button
                variant="outline"
                onClick={() =>
                  handleStatusChange(selectedBooking!.id, "cancelled")
                }
                disabled={updateMutation.isPending}
                className="gap-2 text-destructive"
                data-testid="button-dialog-cancel"
              >
                <XCircle className="h-4 w-4" />
                {t("bookings.cancelBooking")}
              </Button>
            )}
            <Button
              onClick={handleSaveNotes}
              disabled={updateMutation.isPending}
              data-testid="button-save-notes"
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modify Booking Dialog */}
      <Dialog
        open={modifyDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setModifyDialogOpen(false);
            setBookingToModify(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("bookings.modifyBooking")}</DialogTitle>
          </DialogHeader>
          {bookingToModify && (
            <div className="space-y-4 pr-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">{t("bookings.currentAppointment")}</p>
                <p className="font-medium">{bookingToModify.customerName}</p>
                <p className="text-sm">
                  {format(new Date(bookingToModify.bookingDate), "MMMM d, yyyy", { locale: getLocale() })}
                  {" • "}
                  {bookingToModify.startTime} - {bookingToModify.endTime}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="mb-2 block">{t("bookings.proposedNewDate")}</Label>
                  <div className="border rounded-md">
                    <Calendar
                      mode="single"
                      selected={proposedDate}
                      onSelect={setProposedDate}
                      locale={language === "es" ? es : undefined}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">{t("bookings.startTime")}</Label>
                    <Select value={proposedStartTime} onValueChange={setProposedStartTime}>
                      <SelectTrigger data-testid="select-start-time">
                        <SelectValue placeholder={t("bookings.selectTime")} />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block">{t("bookings.endTime")}</Label>
                    <Select value={proposedEndTime} onValueChange={setProposedEndTime}>
                      <SelectTrigger data-testid="select-end-time">
                        <SelectValue placeholder={t("bookings.selectTime")} />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">{t("bookings.reasonForChange")}</Label>
                  <Textarea
                    value={modificationReason}
                    onChange={(e) => setModificationReason(e.target.value)}
                    placeholder={t("bookings.reasonForChangePlaceholder")}
                    className="resize-none"
                    data-testid="input-modification-reason"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setModifyDialogOpen(false);
                setBookingToModify(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmitModification}
              disabled={modifyMutation.isPending || !proposedDate || !proposedStartTime || !proposedEndTime}
              data-testid="button-send-modification-request"
            >
              {modifyMutation.isPending ? t("common.sending") : t("bookings.sendModificationRequest")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Booking Dialog */}
      <Dialog
        open={addBookingDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAddBookingDialogOpen(false);
            resetAddBookingForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("bookings.addBookingTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pr-4">
            <div>
              <Label className="mb-2 block">{t("bookings.selectService")}</Label>
              <Select value={newBookingServiceId} onValueChange={handleNewBookingServiceChange}>
                <SelectTrigger data-testid="select-new-booking-service">
                  <SelectValue placeholder={t("bookings.selectService")} />
                </SelectTrigger>
                <SelectContent>
                  {services?.filter(s => s.isActive).map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} ({service.duration} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">{t("bookings.selectDate")}</Label>
              <div className="border rounded-md">
                <Calendar
                  mode="single"
                  selected={newBookingDate}
                  onSelect={setNewBookingDate}
                  locale={language === "es" ? es : undefined}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">{t("bookings.startTime")}</Label>
                <Select value={newBookingStartTime} onValueChange={handleNewBookingStartTimeChange}>
                  <SelectTrigger data-testid="select-new-booking-start-time">
                    <SelectValue placeholder={t("bookings.selectTime")} />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">{t("bookings.endTime")} ({t("common.optional")})</Label>
                <Select value={newBookingEndTime} onValueChange={setNewBookingEndTime}>
                  <SelectTrigger data-testid="select-new-booking-end-time">
                    <SelectValue placeholder={newBookingEndTime || t("bookings.selectTime")} />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">{t("bookings.customerName")}</Label>
              <Input
                value={newBookingCustomerName}
                onChange={(e) => setNewBookingCustomerName(e.target.value)}
                placeholder={t("bookings.customerName")}
                data-testid="input-new-booking-customer-name"
              />
            </div>

            <div>
              <Label className="mb-2 block">{t("bookings.customerEmail")}</Label>
              <Input
                type="email"
                value={newBookingCustomerEmail}
                onChange={(e) => setNewBookingCustomerEmail(e.target.value)}
                placeholder={t("bookings.customerEmail")}
                data-testid="input-new-booking-customer-email"
              />
            </div>

            <div>
              <Label className="mb-2 block">{t("bookings.customerPhone")} ({t("common.optional")})</Label>
              <Input
                type="tel"
                value={newBookingCustomerPhone}
                onChange={(e) => setNewBookingCustomerPhone(e.target.value)}
                placeholder={t("bookings.customerPhone")}
                data-testid="input-new-booking-customer-phone"
              />
            </div>

            <div>
              <Label className="mb-2 block">{t("bookings.notes")} ({t("common.optional")})</Label>
              <Textarea
                value={newBookingNotes}
                onChange={(e) => setNewBookingNotes(e.target.value)}
                placeholder={t("bookings.notesPlaceholder")}
                className="resize-none"
                data-testid="input-new-booking-notes"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAddBookingDialogOpen(false);
                resetAddBookingForm();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmitNewBooking}
              disabled={createBookingMutation.isPending || !newBookingServiceId || !newBookingDate || !newBookingStartTime || !newBookingCustomerName || !newBookingCustomerEmail}
              data-testid="button-create-booking"
            >
              {createBookingMutation.isPending ? t("common.loading") : t("bookings.createBooking")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
