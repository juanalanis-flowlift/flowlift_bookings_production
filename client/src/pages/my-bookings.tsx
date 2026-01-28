import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, isPast, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { es, enUS } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, Clock, MapPin, Mail, Phone, X, LogOut, Loader2, CheckCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface CustomerSession {
  customer: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
  };
  sessionToken: string;
  expiresAt: string;
}

interface EnrichedBooking {
  id: string;
  businessId: string;
  serviceId: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerNotes: string | null;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  service: {
    id: string;
    name: string;
    duration: number;
    price: string;
  } | null;
  business: {
    id: string;
    name: string;
    slug: string;
    phone: string | null;
    email: string | null;
  } | null;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getStatusBadge(status: string, bookingDate: string, t: (key: string) => string) {
  const isInPast = isPast(parseISO(bookingDate));

  if (status === "cancelled") {
    return <Badge variant="destructive" data-testid="badge-status-cancelled">{t("common.cancelled")}</Badge>;
  }
  if (isInPast) {
    return <Badge variant="secondary" data-testid="badge-status-completed">{t("myBookings.completed")}</Badge>;
  }
  if (status === "confirmed") {
    return <Badge className="bg-green-500 hover:bg-green-600" data-testid="badge-status-confirmed">{t("common.confirmed")}</Badge>;
  }
  return <Badge variant="outline" data-testid="badge-status-pending">{t("common.pending")}</Badge>;
}

export default function MyBookings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, language } = useI18n();

  const getLocale = () => language === "es" ? es : enUS;
  const [email, setEmail] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return localStorage.getItem("customer_session_token");
  });
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [accessRequestSent, setAccessRequestSent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      verifyToken(token);
      window.history.replaceState({}, "", "/my-bookings");
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch("/api/customer/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Invalid or expired token");
      }

      const data: CustomerSession = await response.json();
      localStorage.setItem("customer_session_token", data.sessionToken);
      setSessionToken(data.sessionToken);
      toast({
        title: t("auth.signedIn"),
        description: t("auth.viewManageBookings"),
      });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("auth.errorVerifyToken"),
        variant: "destructive",
      });
    }
  };

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["/api/customer/session"],
    queryFn: async () => {
      if (!sessionToken) return null;
      const response = await fetch("/api/customer/session", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("customer_session_token");
          setSessionToken(null);
          return null;
        }
        throw new Error("Failed to fetch session");
      }
      return response.json();
    },
    enabled: !!sessionToken,
  });

  const { data: bookings, isLoading: bookingsLoading, refetch: refetchBookings } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/customer/bookings"],
    queryFn: async () => {
      if (!sessionToken) return [];
      const response = await fetch("/api/customer/bookings", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("customer_session_token");
          setSessionToken(null);
          return [];
        }
        throw new Error("Failed to fetch bookings");
      }
      return response.json();
    },
    enabled: !!sessionToken && !!session,
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await fetch(`/api/customer/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to cancel booking");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("myBookings.bookingCancelled"),
        description: t("myBookings.bookingCancelledDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/bookings"] });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsRequestingAccess(true);
    try {
      const response = await fetch("/api/customer/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to request access");
      }

      setAccessRequestSent(true);
      toast({
        title: t("myBookings.checkEmail"),
        description: t("myBookings.sentAccessLink"),
      });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("common.failedToSave"),
        variant: "destructive",
      });
    } finally {
      setIsRequestingAccess(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/customer/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("customer_session_token");
      setSessionToken(null);
      setAccessRequestSent(false);
    }
  };

  const upcomingBookings = bookings?.filter(
    (b) => !isPast(parseISO(b.bookingDate)) && b.status !== "cancelled"
  ) || [];

  const pastBookings = bookings?.filter(
    (b) => isPast(parseISO(b.bookingDate)) || b.status === "cancelled"
  ) || [];

  if (!sessionToken || (!sessionLoading && !session)) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <h1 className="font-semibold">flowlift</h1>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12 max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>{t("myBookings.viewTitle")}</CardTitle>
              <CardDescription>
                {t("myBookings.enterEmailDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accessRequestSent ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">{t("myBookings.checkEmail")}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("myBookings.sentSignInLink", { email })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setAccessRequestSent(false)}
                    data-testid="button-try-different-email"
                  >
                    {t("myBookings.tryDifferentEmail")}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleRequestAccess} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder={t("myBookings.enterEmailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="input-customer-email"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isRequestingAccess}
                    data-testid="button-request-access"
                  >
                    {isRequestingAccess ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("myBookings.sending")}
                      </>
                    ) : (
                      t("myBookings.getAccessLink")
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (sessionLoading || bookingsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <h1 className="font-semibold">flowlift</h1>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <h1 className="font-semibold">flowlift</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {session?.customer?.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold" data-testid="text-my-bookings-title">{t("myBookings.myBookingsTitle")}</h2>
          <p className="text-muted-foreground">{t("myBookings.viewManageAppointments")}</p>
        </div>

        {upcomingBookings.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">{t("myBookings.upcoming")}</h3>
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold" data-testid={`text-service-name-${booking.id}`}>
                              {booking.service?.name || "Service"}
                            </h4>
                            <p className="text-sm text-muted-foreground" data-testid={`text-business-name-${booking.id}`}>
                              {booking.business?.name || "Business"}
                            </p>
                          </div>
                          {getStatusBadge(booking.status, booking.bookingDate, t)}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span data-testid={`text-booking-date-${booking.id}`}>
                              {format(parseISO(booking.bookingDate), "EEEE, MMMM d, yyyy", { locale: getLocale() })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span data-testid={`text-booking-time-${booking.id}`}>
                              {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                            </span>
                          </div>
                        </div>

                        {booking.business && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            {booking.business.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-4 h-4" />
                                <span>{booking.business.phone}</span>
                              </div>
                            )}
                            {booking.business.email && (
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-4 h-4" />
                                <span>{booking.business.email}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {booking.service && (
                          <p className="text-sm">
                            <span className="font-medium">
                              ${(parseFloat(booking.service.price) / 100).toFixed(2)}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}· {booking.service.duration} min
                            </span>
                          </p>
                        )}
                      </div>

                      <div className="flex sm:flex-col gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={cancelMutation.isPending}
                              data-testid={`button-cancel-${booking.id}`}
                            >
                              <X className="w-4 h-4 mr-1" />
                              {t("myBookings.cancel")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("myBookings.cancelBooking")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("myBookings.cancelBookingConfirm", {
                                  serviceName: booking.service?.name || "Service",
                                  date: format(parseISO(booking.bookingDate), "MMMM d, yyyy", { locale: getLocale() })
                                })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("myBookings.keepBooking")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => cancelMutation.mutate(booking.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-testid={`button-confirm-cancel-${booking.id}`}
                              >
                                {cancelMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  t("myBookings.cancelBooking")
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {booking.business?.slug && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/book/${booking.business!.slug}`)}
                            data-testid={`button-book-again-${booking.id}`}
                          >
                            {t("myBookings.bookAgain")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {pastBookings.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">{t("myBookings.pastCancelled")}</h3>
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <Card key={booking.id} className="opacity-75" data-testid={`card-past-booking-${booking.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold">
                              {booking.service?.name || "Service"}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {booking.business?.name || "Business"}
                            </p>
                          </div>
                          {getStatusBadge(booking.status, booking.bookingDate, t)}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(parseISO(booking.bookingDate), "MMMM d, yyyy", { locale: getLocale() })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>
                              {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {booking.business?.slug && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/book/${booking.business!.slug}`)}
                          data-testid={`button-book-again-past-${booking.id}`}
                        >
                          {t("myBookings.bookAgain")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!bookings || bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("myBookings.noBookingsYet")}</h3>
              <p className="text-muted-foreground mb-4">
                {t("myBookings.noBookingsEmailDesc")}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
