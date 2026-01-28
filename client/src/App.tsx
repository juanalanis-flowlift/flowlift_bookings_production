import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardThemeProvider } from "@/components/DashboardThemeProvider";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SettingsDropdown } from "@/components/SettingsDropdown";
import { useAuth } from "@/hooks/useAuth";
import { TierProvider } from "@/hooks/useTier";
import { I18nProvider } from "@/lib/i18n";

import Landing from "@/pages/landing";
import SignIn from "@/pages/signin";
import SignUp from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import Services from "@/pages/services";
import Bookings from "@/pages/bookings";
import Availability from "@/pages/availability";
import Settings from "@/pages/settings";
import BookingPage from "@/pages/booking";
import MyBookings from "@/pages/my-bookings";
import ConfirmModification from "@/pages/confirm-modification";
import CustomerCancel from "@/pages/customer-cancel";
import CustomerModify from "@/pages/customer-modify";
import Team from "@/pages/team";
import Onboarding from "@/pages/onboarding";
import About from "@/pages/about";
import Products from "@/pages/products";
import NotFound from "@/pages/not-found";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <TierProvider>
      <DashboardThemeProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <SidebarInset className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between gap-4 p-2 border-b h-14 flex-shrink-0">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <SettingsDropdown />
              </header>
              <main className="flex-1 overflow-auto">{children}</main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </DashboardThemeProvider>
    </TierProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public booking page - always accessible */}
      <Route path="/book/:slug" component={BookingPage} />

      {/* Customer bookings page - always accessible */}
      <Route path="/my-bookings" component={MyBookings} />

      {/* Confirm modification page - always accessible */}
      <Route path="/confirm-modification" component={ConfirmModification} />

      {/* Customer cancel page - always accessible */}
      <Route path="/customer-cancel" component={CustomerCancel} />

      {/* Customer modify page - always accessible */}
      <Route path="/customer-modify" component={CustomerModify} />

      {/* Sign-in and Sign-up pages - always accessible */}
      <Route path="/signin" component={SignIn} />
      <Route path="/signup" component={SignUp} />

      {/* Onboarding page - for authenticated users setting up their business */}
      <Route path="/onboarding" component={Onboarding} />

      {/* About and Products pages - always accessible */}
      <Route path="/about" component={About} />
      <Route path="/products" component={Products} />

      {/* Landing page for non-authenticated users */}
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          {/* Authenticated routes with sidebar layout */}
          <Route path="/">
            <AuthenticatedLayout>
              <Dashboard />
            </AuthenticatedLayout>
          </Route>
          <Route path="/dashboard">
            <AuthenticatedLayout>
              <Dashboard />
            </AuthenticatedLayout>
          </Route>
          <Route path="/services">
            <AuthenticatedLayout>
              <Services />
            </AuthenticatedLayout>
          </Route>
          <Route path="/bookings">
            <AuthenticatedLayout>
              <Bookings />
            </AuthenticatedLayout>
          </Route>
          <Route path="/availability">
            <AuthenticatedLayout>
              <Availability />
            </AuthenticatedLayout>
          </Route>
          <Route path="/settings">
            <AuthenticatedLayout>
              <Settings />
            </AuthenticatedLayout>
          </Route>
          <Route path="/team">
            <AuthenticatedLayout>
              <Team />
            </AuthenticatedLayout>
          </Route>
        </>
      )}

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
