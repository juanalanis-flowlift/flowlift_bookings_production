import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useI18n, type Language } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Clock, Calendar, ArrowRight, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";

interface ModificationDetails {
  booking: {
    id: string;
    customerName: string;
    customerEmail: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    proposedBookingDate: string;
    proposedStartTime: string;
    proposedEndTime: string;
    modificationReason?: string;
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
  };
}

export default function ConfirmModification() {
  const { t, language, setLanguage } = useI18n();
  const [token, setToken] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const getLocale = () => (language === "es" ? es : enUS);

  const LanguageSelector = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLanguage("en")}>
          English {language === "en" && "✓"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("es")}>
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

  const { data: details, isLoading, error } = useQuery<ModificationDetails>({
    queryKey: ["/api/public/bookings/modification", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/bookings/modification/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/public/bookings/confirm-modification", { token });
    },
    onSuccess: () => {
      setConfirmed(true);
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">{t("confirmModification.notFound")}</h2>
            <p className="text-muted-foreground">
              {t("confirmModification.notFoundDesc")}
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
    const isExpired = (error as Error).message?.includes("expired");
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
              <h2 className="text-lg font-semibold mb-2">
                {isExpired ? t("confirmModification.expired") : t("confirmModification.error")}
              </h2>
              <p className="text-muted-foreground">
                {isExpired ? t("confirmModification.expiredDesc") : t("confirmModification.errorDesc")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (confirmed) {
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
              <h2 className="text-xl font-semibold mb-2">{t("confirmModification.confirmed")}</h2>
              <p className="text-muted-foreground mb-4">
                {t("confirmModification.confirmedDesc")}
              </p>
              {details && (
                <div className="bg-muted/50 rounded-lg p-4 mt-4 text-left">
                  <p className="font-medium">{details.service.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(details.booking.proposedBookingDate), "MMMM d, yyyy", { locale: getLocale() })}
                  </p>
                  <p className="text-sm">
                    {details.booking.proposedStartTime} - {details.booking.proposedEndTime}
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
            <CardTitle className="text-center">{t("confirmModification.title")}</CardTitle>
            <p className="text-center text-muted-foreground text-sm">
              {t("confirmModification.subtitle")}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {details && (
              <>
                <div className="text-center">
                  <p className="font-medium text-lg">{details.service.name}</p>
                  <p className="text-muted-foreground">{details.business.name}</p>
                </div>

                <div className="grid gap-4">
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">{t("confirmModification.currentTime")}</span>
                    </div>
                    <p className="line-through text-muted-foreground">
                      {format(new Date(details.booking.bookingDate), "MMMM d, yyyy", { locale: getLocale() })}
                    </p>
                    <p className="line-through text-muted-foreground">
                      {details.booking.startTime} - {details.booking.endTime}
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">{t("confirmModification.proposedTime")}</span>
                    </div>
                    <p className="font-medium">
                      {format(new Date(details.booking.proposedBookingDate), "MMMM d, yyyy", { locale: getLocale() })}
                    </p>
                    <p className="font-medium">
                      {details.booking.proposedStartTime} - {details.booking.proposedEndTime}
                    </p>
                  </div>
                </div>

                {details.booking.modificationReason && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm font-medium mb-1">{t("confirmModification.reason")}</p>
                    <p className="text-sm text-muted-foreground">{details.booking.modificationReason}</p>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending}
                  data-testid="button-confirm-modification"
                >
                  {confirmMutation.isPending
                    ? t("confirmModification.confirming")
                    : t("confirmModification.confirm")}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
