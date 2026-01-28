import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Scissors,
  Calendar,
  Clock,
  Briefcase,
  LogOut,
  ExternalLink,
  Users,
} from "lucide-react";
import type { Business } from "@shared/schema";
import { useI18n } from "@/lib/i18n";
import { useTier } from "@/hooks/useTier";

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useI18n();
  const { isTeams } = useTier();

  const baseMenuItems = [
    { titleKey: "nav.dashboard", url: "/dashboard", icon: LayoutDashboard },
    { titleKey: "nav.bookings", url: "/bookings", icon: Calendar },
    { titleKey: "nav.services", url: "/services", icon: Scissors },
    { titleKey: "nav.availability", url: "/availability", icon: Clock },
    { titleKey: "nav.settings", url: "/settings", icon: Briefcase },
  ];
  
  const menuItems = isTeams 
    ? [...baseMenuItems, { titleKey: "nav.team", url: "/team", icon: Users }]
    : baseMenuItems;

  const { data: business } = useQuery<Business>({
    queryKey: ["/api/business"],
    retry: false,
  });

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          {business?.logoUrl ? (
            <img 
              src={business.logoUrl} 
              alt={business.name} 
              className="w-10 h-10 rounded-md object-contain flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
              <Calendar className="h-6 w-6 text-primary-foreground" />
            </div>
          )}
          <span className="font-bold text-xl truncate">
            {business?.name || t("app.name")}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.menu")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url || (item.url === "/dashboard" && location === "/")}
                  >
                    <Link href={item.url} data-testid={`link-${item.titleKey.split('.')[1]}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.titleKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {business && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("sidebar.quickActions")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a
                      href={`/book/${business.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="link-booking-page"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>{t("settings.previewBooking")}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={user?.profileImageUrl || undefined}
              className="object-cover"
            />
            <AvatarFallback>
              {getInitials(user?.firstName, user?.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.firstName || user?.email || "User"}
            </p>
            {user?.email && (
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            )}
          </div>
          <a href="/api/logout">
            <Button variant="ghost" size="icon" data-testid="button-logout" title={t("nav.logout")}>
              <LogOut className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
