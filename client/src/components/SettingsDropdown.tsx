import { useState } from "react";
import { Settings, Sun, Moon, LogOut, CreditCard, Sparkles, Crown, Users, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n, type Language } from "@/lib/i18n";
import { useDashboardTheme } from "@/components/DashboardThemeProvider";
import { useTier, type SubscriptionTier } from "@/hooks/useTier";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function SettingsDropdown() {
  const { t, language, setLanguage } = useI18n();
  const { theme, setTheme } = useDashboardTheme();
  const { tier, setTier, isUpdating } = useTier();
  const { toast } = useToast();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const deleteBusinessMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/business");
    },
    onSuccess: () => {
      toast({
        title: t("settings.membership.cancelModal.success"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
      window.location.href = "/";
    },
    onError: () => {
      toast({
        title: t("settings.membership.cancelModal.error"),
        variant: "destructive",
      });
    },
  });

  const tierConfig: Record<SubscriptionTier, { icon: typeof Sparkles; label: string; color: string }> = {
    starter: { icon: Sparkles, label: t("settings.tier.starter"), color: "text-muted-foreground" },
    pro: { icon: Crown, label: t("settings.tier.pro"), color: "text-amber-500" },
    teams: { icon: Users, label: t("settings.tier.teams"), color: "text-purple-500" },
  };

  const currentTierConfig = tierConfig[tier];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" data-testid="button-settings-dropdown">
            <Settings className="h-5 w-5" />
            <span className="sr-only">{t("settings.title")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64" data-testid="settings-dropdown-menu">
          <DropdownMenuLabel className="flex items-center gap-2">
            <currentTierConfig.icon className={`h-4 w-4 ${currentTierConfig.color}`} />
            <span>{t("settings.membership.title")}</span>
          </DropdownMenuLabel>
          
          <DropdownMenuGroup>
            <div className="px-2 py-1.5 space-y-1">
              {(["starter", "pro", "teams"] as SubscriptionTier[]).map((tierOption) => {
                const config = tierConfig[tierOption];
                const isActive = tier === tierOption;
                return (
                  <div
                    key={tierOption}
                    className={`flex items-center justify-between p-2 rounded-md ${
                      isActive ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <config.icon className={`h-4 w-4 ${config.color}`} />
                      <span className="text-sm">{config.label}</span>
                    </div>
                    {isActive ? (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        {t("settings.membership.current")}
                      </Badge>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs" 
                        data-testid={`button-upgrade-${tierOption}`}
                        onClick={() => setTier(tierOption)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? "..." : t("settings.membership.upgrade")}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            
            <DropdownMenuItem className="cursor-pointer" data-testid="link-manage-payments">
              <CreditCard className="h-4 w-4 mr-2" />
              {t("settings.membership.managePayments")}
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer text-destructive" 
              data-testid="link-cancel-subscription"
              onClick={() => setShowCancelModal(true)}
            >
              {t("settings.membership.cancelSubscription")}
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          
          <DropdownMenuLabel>{t("settings.preferences.title")}</DropdownMenuLabel>
          <DropdownMenuGroup>
            <div className="px-2 py-1.5">
              <p className="text-xs text-muted-foreground mb-2">{t("settings.preferences.language")}</p>
              <div className="flex gap-1">
                <Button
                  variant={language === "en" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => setLanguage("en")}
                  data-testid="button-language-en"
                >
                  English
                </Button>
                <Button
                  variant={language === "es" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => setLanguage("es")}
                  data-testid="button-language-es"
                >
                  Español
                </Button>
              </div>
            </div>
            
            <div className="px-2 py-1.5">
              <p className="text-xs text-muted-foreground mb-2">{t("settings.preferences.theme")}</p>
              <div className="flex gap-1">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => setTheme("light")}
                  data-testid="button-theme-light"
                >
                  <Sun className="h-4 w-4 mr-1" />
                  {t("settings.preferences.light")}
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => setTheme("dark")}
                  data-testid="button-theme-dark"
                >
                  <Moon className="h-4 w-4 mr-1" />
                  {t("settings.preferences.dark")}
                </Button>
              </div>
            </div>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          
          <DropdownMenuGroup>
            <DropdownMenuItem asChild className="cursor-pointer text-destructive">
              <a href="/api/logout" data-testid="button-settings-logout">
                <LogOut className="h-4 w-4 mr-2" />
                {t("nav.logout")}
              </a>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <AlertDialogContent data-testid="cancel-subscription-modal">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("settings.membership.cancelModal.title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>{t("settings.membership.cancelModal.description")}</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>{t("settings.membership.cancelModal.records.services")}</li>
                <li>{t("settings.membership.cancelModal.records.bookings")}</li>
                <li>{t("settings.membership.cancelModal.records.team")}</li>
                <li>{t("settings.membership.cancelModal.records.availability")}</li>
              </ul>
              <p className="font-medium text-destructive">{t("settings.membership.cancelModal.warning")}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-modal-keep">
              {t("settings.membership.cancelModal.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteBusinessMutation.mutate()}
              disabled={deleteBusinessMutation.isPending}
              data-testid="button-cancel-modal-confirm"
            >
              {deleteBusinessMutation.isPending ? "..." : t("settings.membership.cancelModal.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
