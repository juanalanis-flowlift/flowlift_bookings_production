import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { useTier } from "@/hooks/useTier";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Pencil, Trash2, Clock, DollarSign, Eye, EyeOff, ImagePlus, X, Sparkles } from "lucide-react";
import type { Service, Business } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ObjectUploader } from "@/components/ObjectUploader";
import { UpgradeModal } from "@/components/UpgradeModal";
import type { UploadResult } from "@uppy/core";

const serviceFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  duration: z.coerce.number().min(5, "Duration must be at least 5 minutes"),
  price: z.coerce.number().min(0, "Price must be positive"),
  isActive: z.boolean().default(true),
  requiresConfirmation: z.boolean().default(false),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export default function Services() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useI18n();
  const { isStarter, isPro, isTeams } = useTier();
  const canAccessMultipleServices = isPro || isTeams;
  const canAccessServiceImages = isPro || isTeams;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showServicesUpgradeModal, setShowServicesUpgradeModal] = useState(false);
  const [showImagesUpgradeModal, setShowImagesUpgradeModal] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
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

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!business,
  });

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      duration: 30,
      price: 0,
      isActive: true,
      requiresConfirmation: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      const payload = {
        ...data,
        price: String(data.price),
      };
      return await apiRequest("POST", "/api/services", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Service created successfully" });
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
      toast({ title: "Failed to create service", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ServiceFormValues & { id: string }) => {
      const payload = {
        ...data,
        price: String(data.price),
      };
      return await apiRequest("PATCH", `/api/services/${data.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      setEditingService(null);
      form.reset();
      toast({ title: "Service updated successfully" });
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
      toast({ title: "Failed to update service", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setDeleteConfirmId(null);
      toast({ title: "Service deleted successfully" });
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
      toast({ title: "Failed to delete service", variant: "destructive" });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/services/${id}`, { isActive });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: variables.isActive
          ? t("services.serviceVisible")
          : t("services.serviceHidden")
      });
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
      toast({ title: "Failed to update service visibility", variant: "destructive" });
    },
  });

  const updateImageMutation = useMutation({
    mutationFn: async ({ id, imageUrl }: { id: string; imageUrl: string }) => {
      return await apiRequest("PUT", `/api/services/${id}/image`, { imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: t("services.imageUpdated") });
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
      toast({ title: t("services.imageUpdateFailed"), variant: "destructive" });
    },
  });

  const handleGetUploadParameters = useCallback(async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  }, []);

  const handleImageUploadComplete = useCallback((serviceId: string) => (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      if (uploadURL) {
        updateImageMutation.mutate({ id: serviceId, imageUrl: uploadURL });
      }
    }
  }, [updateImageMutation]);

  const handleEdit = (service: Service) => {
    setEditingService(service);
    form.reset({
      name: service.name,
      description: service.description || "",
      duration: service.duration,
      price: parseFloat(service.price),
      isActive: service.isActive ?? true,
      requiresConfirmation: service.requiresConfirmation ?? false,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingService(null);
    form.reset();
  };

  const onSubmit = (data: ServiceFormValues) => {
    if (editingService) {
      updateMutation.mutate({ ...data, id: editingService.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(typeof price === "string" ? parseFloat(price) : price);
  };

  if (isLoading || authLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
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
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-services-title">
            {t("services.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("services.subtitle")}
          </p>
        </div>
        {/* Starter tier limit: 1 service */}
        {isStarter && services && services.length >= 1 ? (
          <Button
            className="gap-2"
            onClick={() => setShowServicesUpgradeModal(true)}
            data-testid="button-upgrade-services"
          >
            <Plus className="h-4 w-4" />
            {t("services.addService")}
            <Badge variant="secondary" className="ml-1 text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Pro+
            </Badge>
          </Button>
        ) : (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) handleDialogClose();
            else setIsDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-service">
                <Plus className="h-4 w-4" />
                {t("services.addService")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingService ? t("services.editService") : t("services.addService")}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pr-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("services.name")} *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("services.namePlaceholder")}
                            {...field}
                            data-testid="input-service-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("services.description")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("services.descriptionPlaceholder")}
                            className="resize-none"
                            {...field}
                            data-testid="input-service-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("services.duration")} *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="5"
                              {...field}
                              data-testid="input-service-duration"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("services.price")} ($) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              {...field}
                              data-testid="input-service-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel className="text-base">{t("services.active")}</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            {t("services.activeDesc")}
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-service-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requiresConfirmation"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel className="text-base">{t("services.requiresConfirmation")}</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            {t("services.requiresConfirmationDesc")}
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-service-requires-confirmation"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Service Image - Only shown when editing */}
                  {editingService && (
                    <div className="space-y-2">
                      <FormLabel className="flex items-center gap-2">
                        {t("services.serviceImage")}
                        {!canAccessServiceImages && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Pro+
                          </Badge>
                        )}
                      </FormLabel>
                      <div className="rounded-lg border p-3">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
                            {editingService.imageUrl ? (
                              <img
                                src={editingService.imageUrl}
                                alt={editingService.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImagePlus className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground mb-2">
                              {canAccessServiceImages
                                ? (editingService.imageUrl ? t("services.changeImageDesc") : t("services.addImageDesc"))
                                : t("tier.availableInPro")
                              }
                            </p>
                            {canAccessServiceImages ? (
                              <ObjectUploader
                                maxNumberOfFiles={1}
                                maxFileSize={5 * 1024 * 1024}
                                allowedFileTypes={["image/*"]}
                                onGetUploadParameters={handleGetUploadParameters}
                                onComplete={handleImageUploadComplete(editingService.id)}
                                buttonVariant="outline"
                                buttonSize="sm"
                              >
                                <ImagePlus className="h-4 w-4 mr-2" />
                                {editingService.imageUrl ? t("services.changeImage") : t("services.addImage")}
                              </ObjectUploader>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowImagesUpgradeModal(true)}
                                data-testid="button-upgrade-images"
                              >
                                <ImagePlus className="h-4 w-4 mr-2" />
                                {t("upgrade.unlockFeature")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDialogClose}
                      data-testid="button-cancel"
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-save-service"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? t("settings.saving")
                        : editingService
                          ? t("common.edit")
                          : t("services.save")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Services Grid */}
      {services && services.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card
              key={service.id}
              className={`relative overflow-hidden ${!service.isActive ? "opacity-60" : ""}`}
              data-testid={`service-card-${service.id}`}
            >
              {/* Image Section */}
              <div className="relative aspect-[4/3] bg-muted">
                {service.imageUrl ? (
                  <img
                    src={service.imageUrl}
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImagePlus className="h-10 w-10" />
                      <span className="text-sm">{t("services.noImage")}</span>
                    </div>
                  </div>
                )}

                {/* Overlaid Action Buttons - Top Left */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => toggleVisibilityMutation.mutate({
                      id: service.id,
                      isActive: !service.isActive
                    })}
                    disabled={toggleVisibilityMutation.isPending}
                    data-testid={`button-toggle-visibility-${service.id}`}
                    title={service.isActive ? t("services.hideFromBooking") : t("services.showOnBooking")}
                  >
                    {service.isActive ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Dialog
                    open={deleteConfirmId === service.id}
                    onOpenChange={(open) =>
                      setDeleteConfirmId(open ? service.id : null)
                    }
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        data-testid={`button-delete-service-${service.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{t("services.delete")}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pr-2 text-muted-foreground">
                        <p>
                          {t("services.deleteConfirm")}
                        </p>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => deleteMutation.mutate(service.id)}
                          disabled={deleteMutation.isPending}
                          data-testid="button-confirm-delete"
                        >
                          {deleteMutation.isPending ? t("common.deleting") : t("common.delete")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Badges - Top Right */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                  {service.requiresConfirmation && (
                    <Badge variant="outline" className="bg-background/90" data-testid={`badge-requires-confirmation-${service.id}`}>
                      {t("services.confirmation")}
                    </Badge>
                  )}
                  {!service.isActive && (
                    <Badge variant="secondary">
                      {t("common.inactive")}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Content Section */}
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate" data-testid={`text-service-name-${service.id}`}>
                      {service.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <span>{service.duration} min</span>
                      <span className="text-muted-foreground/50">|</span>
                      <span className="font-medium text-foreground">{formatPrice(service.price)}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => handleEdit(service)}
                    data-testid={`button-edit-service-${service.id}`}
                  >
                    {t("common.edit")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t("services.noServices")}</h3>
            <p className="text-muted-foreground mb-4">
              {t("services.noServicesDesc")}
            </p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-service">
              {t("services.addService")}
            </Button>
          </CardContent>
        </Card>
      )}

      <UpgradeModal
        open={showServicesUpgradeModal}
        onOpenChange={setShowServicesUpgradeModal}
        targetTier="pro"
        title={t("upgrade.multipleServices.title")}
        benefits={[
          t("upgrade.multipleServices.benefit1"),
          t("upgrade.multipleServices.benefit2"),
          t("upgrade.multipleServices.benefit3"),
          t("upgrade.multipleServices.benefit4"),
        ]}
      />

      <UpgradeModal
        open={showImagesUpgradeModal}
        onOpenChange={setShowImagesUpgradeModal}
        targetTier="pro"
        title={t("upgrade.servicePhotos.title")}
        benefits={[
          t("upgrade.servicePhotos.benefit1"),
          t("upgrade.servicePhotos.benefit2"),
          t("upgrade.servicePhotos.benefit3"),
          t("upgrade.servicePhotos.benefit4"),
        ]}
      />
    </div>
  );
}
