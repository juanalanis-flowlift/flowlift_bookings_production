import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useI18n, type Language } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Calendar, Clock, Briefcase, Building2, Globe, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";

interface BookingDetails {
  booking: {
    id: string;
    customerName: string;
    customerEmail: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    status: string;
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
  };
}

export default function CustomerCancel() {
  const { t, language, setLanguage } = useI18n();
  const [token, setToken] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [reason, setReason] = useState("");

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

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/public/bookings/customer-cancel", { 
        token,
        reason: reason.trim() || undefined,
      });
    },
    onSuccess: () => {
      setCancelled(true);
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2" data-testid="text-not-found-title">{t("customerCancel.notFound")}</h2>
            <p className="text-muted-foreground" data-testid="text-not-found-desc">
              {t("customerCancel.notFoundDesc")}
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
        <div className="max-w-lg mx-auto p-4 space-y-4 mt-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-12" />
        </div>
      </div>
    );
  }

  if (error) {
    const isAlreadyCancelled = (error as Error).message?.includes("cancelled");
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-bold">{t("app.name")}</h1>
          <LanguageSelector />
        </header>
        <div className="flex items-center justify-center p-4 mt-16">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2" data-testid="text-error-title">
                {isAlreadyCancelled ? t("customerCancel.alreadyCancelled") : t("customerCancel.error")}
              </h2>
              <p className="text-muted-foreground" data-testid="text-error-desc">
                {isAlreadyCancelled ? t("customerCancel.alreadyCancelledDesc") : t("customerCancel.errorDesc")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-bold">{t("app.name")}</h1>
          <LanguageSelector />
        </header>
        <div className="flex items-center justify-center p-4 mt-16">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2" data-testid="text-cancelled-title">{t("customerCancel.cancelled")}</h2>
              <p className="text-muted-foreground mb-4" data-testid="text-cancelled-desc">
                {t("customerCancel.cancelledDesc")}
              </p>
              {details && (
                <div className="bg-muted/50 rounded-lg p-4 mt-4 text-left">
                  <p className="font-medium">{details.service.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(details.booking.bookingDate), "MMMM d, yyyy", { locale: getLocale() })}
                  </p>
                  <p className="text-sm">
                    {details.booking.startTime} - {details.booking.endTime}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">{t("app.name")}</h1>
        <LanguageSelector />
      </header>

      <div className="max-w-lg mx-auto p-4 mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
            </div>
            <CardTitle className="text-center" data-testid="text-cancel-title">{t("customerCancel.title")}</CardTitle>
            <p className="text-center text-muted-foreground text-sm">
              {t("customerCancel.subtitle")}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {details && (
              <>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    {t("customerCancel.bookingDetails")}
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t("customerCancel.service")}:</span>
                      <span className="font-medium">{details.service.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t("customerCancel.date")}:</span>
                      <span className="font-medium">
                        {format(new Date(details.booking.bookingDate), "MMMM d, yyyy", { locale: getLocale() })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t("customerCancel.time")}:</span>
                      <span className="font-medium">
                        {details.booking.startTime} - {details.booking.endTime}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t("customerCancel.business")}:</span>
                      <span className="font-medium">{details.business.name}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">{t("customerCancel.reasonLabel")}</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("customerCancel.reasonPlaceholder")}
                    rows={3}
                    data-testid="input-cancellation-reason"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    variant="destructive"
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    data-testid="button-confirm-cancel"
                  >
                    {cancelMutation.isPending ? t("customerCancel.cancelling") : t("customerCancel.confirmCancel")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.history.back()}
                    disabled={cancelMutation.isPending}
                    data-testid="button-keep-booking"
                  >
                    {t("customerCancel.keepBooking")}
                  </Button>
                </div>

                {cancelMutation.isError && (
                  <p className="text-destructive text-sm text-center" data-testid="text-cancel-error">
                    {t("customerCancel.errorDesc")}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
