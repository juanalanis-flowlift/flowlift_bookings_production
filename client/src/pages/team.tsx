import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { UploadResult } from "@uppy/core";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { useTier } from "@/hooks/useTier";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ObjectUploader } from "@/components/ObjectUploader";
import { UpgradeModal } from "@/components/UpgradeModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
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
import { Plus, Pencil, Trash2, User, Mail, Phone, Clock, Briefcase, Calendar, Camera, Image, Users, Sparkles } from "lucide-react";
import type { TeamMember, Service, Business, TeamMemberAvailability } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

const teamMemberFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  role: z.string().optional(),
  isActive: z.boolean().default(true),
});

type TeamMemberFormValues = z.infer<typeof teamMemberFormSchema>;

const daysOfWeek = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

interface DayAvailability {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

export default function Team() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useI18n();
  const { isTeams } = useTier();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberServices, setMemberServices] = useState<string[]>([]);
  const [memberAvailability, setMemberAvailability] = useState<DayAvailability[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

  if (!isTeams) {
    return (
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">{t("upgrade.team.title")}</CardTitle>
            <CardDescription>
              {t("tier.availableInTeams")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">{t("upgrade.team.benefit1")}</span>
              </li>
              <li className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">{t("upgrade.team.benefit2")}</span>
              </li>
              <li className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">{t("upgrade.team.benefit3")}</span>
              </li>
              <li className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">{t("upgrade.team.benefit4")}</span>
              </li>
            </ul>
            <Button
              className="w-full"
              onClick={() => setShowUpgradeModal(true)}
              data-testid="button-upgrade-teams"
            >
              {t("upgrade.upgradeTo")} {t("settings.tier.teams")}
            </Button>
          </CardContent>
        </Card>
        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          targetTier="teams"
          title={t("upgrade.team.title")}
          benefits={[
            t("upgrade.team.benefit1"),
            t("upgrade.team.benefit2"),
            t("upgrade.team.benefit3"),
            t("upgrade.team.benefit4"),
          ]}
        />
      </div>
    );
  }

  const { data: business } = useQuery<Business>({
    queryKey: ["/api/business"],
  });

  const { data: teamMembers, isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/team"],
    enabled: !!business,
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!business,
  });

  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TeamMemberFormValues) => {
      return await apiRequest("POST", "/api/team", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: t("team.created") });
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
      toast({ title: t("team.createError"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TeamMemberFormValues & { id: string }) => {
      const { id, ...payload } = data;
      return await apiRequest("PATCH", `/api/team/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      setIsDialogOpen(false);
      setEditingMember(null);
      form.reset();
      toast({ title: t("team.updated") });
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
      toast({ title: t("team.updateError"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/team/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      setDeleteConfirmId(null);
      if (selectedMember?.id === deleteConfirmId) {
        setSelectedMember(null);
      }
      toast({ title: t("team.deleted") });
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
      toast({ title: t("team.deleteError"), variant: "destructive" });
    },
  });

  const saveServicesMutation = useMutation({
    mutationFn: async ({ memberId, serviceIds }: { memberId: string; serviceIds: string[] }) => {
      return await apiRequest("PUT", `/api/team/${memberId}/services`, { serviceIds });
    },
    onSuccess: () => {
      toast({ title: t("team.servicesUpdated") });
    },
    onError: () => {
      toast({ title: t("team.servicesError"), variant: "destructive" });
    },
  });

  const saveAvailabilityMutation = useMutation({
    mutationFn: async ({ memberId, availability }: { memberId: string; availability: DayAvailability }) => {
      return await apiRequest("POST", `/api/team/${memberId}/availability`, availability);
    },
    onSuccess: () => {
      toast({ title: t("team.availabilityUpdated") });
    },
    onError: () => {
      toast({ title: t("team.availabilityError"), variant: "destructive" });
    },
  });

  const photoMutation = useMutation({
    mutationFn: async ({ memberId, photoURL }: { memberId: string; photoURL: string }) => {
      return await apiRequest("PUT", `/api/team/${memberId}/photo`, { photoURL });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      toast({ title: t("team.photoUpdated") });
    },
    onError: () => {
      toast({ title: t("team.photoError"), variant: "destructive" });
    },
  });

  const toggleShowPhotosMutation = useMutation({
    mutationFn: async (showTeamPicturesInBooking: boolean) => {
      return await apiRequest("PATCH", "/api/business", { showTeamPicturesInBooking });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
      toast({ title: t("team.settingsUpdated") });
    },
    onError: () => {
      toast({ title: t("team.settingsError"), variant: "destructive" });
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

  const handlePhotoUploadComplete = useCallback((memberId: string) => {
    return (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
      if (result.successful && result.successful.length > 0) {
        const uploadURL = result.successful[0].uploadURL;
        if (uploadURL) {
          photoMutation.mutate({ memberId, photoURL: uploadURL });
        }
      }
    };
  }, [photoMutation]);

  const openEditDialog = (member: TeamMember) => {
    setEditingMember(member);
    form.reset({
      name: member.name,
      email: member.email || "",
      phone: member.phone || "",
      role: member.role || "",
      isActive: member.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingMember(null);
    form.reset({
      name: "",
      email: "",
      phone: "",
      role: "",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: TeamMemberFormValues) => {
    if (editingMember) {
      updateMutation.mutate({ ...data, id: editingMember.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const selectMember = async (member: TeamMember) => {
    setSelectedMember(member);
    try {
      const servicesResponse = await fetch(`/api/team/${member.id}/services`, { credentials: "include" });
      const servicesData = await servicesResponse.json();
      setMemberServices(servicesData || []);

      const availResponse = await fetch(`/api/team/${member.id}/availability`, { credentials: "include" });
      const availData: TeamMemberAvailability[] = await availResponse.json();

      const defaultAvail = daysOfWeek.map(day => ({
        dayOfWeek: day.value,
        isAvailable: false,
        startTime: "09:00",
        endTime: "17:00",
      }));

      availData.forEach(a => {
        const idx = defaultAvail.findIndex(d => d.dayOfWeek === a.dayOfWeek);
        if (idx >= 0) {
          defaultAvail[idx] = {
            dayOfWeek: a.dayOfWeek,
            isAvailable: a.isAvailable ?? true,
            startTime: a.startTime,
            endTime: a.endTime,
          };
        }
      });

      setMemberAvailability(defaultAvail);
    } catch (error) {
      console.error("Error loading member details:", error);
    }
  };

  const toggleService = (serviceId: string) => {
    const newServices = memberServices.includes(serviceId)
      ? memberServices.filter(id => id !== serviceId)
      : [...memberServices, serviceId];
    setMemberServices(newServices);
    if (selectedMember) {
      saveServicesMutation.mutate({ memberId: selectedMember.id, serviceIds: newServices });
    }
  };

  const updateDayAvailability = (dayOfWeek: number, field: keyof DayAvailability, value: any) => {
    setMemberAvailability(prev => {
      const updated = prev.map(a =>
        a.dayOfWeek === dayOfWeek ? { ...a, [field]: value } : a
      );
      return updated;
    });
  };

  const saveDayAvailability = (dayOfWeek: number) => {
    if (!selectedMember) return;
    const dayAvail = memberAvailability.find(a => a.dayOfWeek === dayOfWeek);
    if (dayAvail) {
      saveAvailabilityMutation.mutate({ memberId: selectedMember.id, availability: dayAvail });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">{t("team.setupBusinessFirst")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("team.title")}</h1>
          <p className="text-muted-foreground">{t("team.subtitle")}</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {teamMembers && teamMembers.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
              <Image className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{t("team.showPhotosInBooking")}</span>
              <Switch
                checked={business?.showTeamPicturesInBooking ?? false}
                onCheckedChange={(checked) => toggleShowPhotosMutation.mutate(checked)}
                disabled={toggleShowPhotosMutation.isPending}
                data-testid="switch-show-photos-booking"
              />
            </div>
          )}
          <Button onClick={openAddDialog} data-testid="button-add-team-member">
            <Plus className="h-4 w-4 mr-2" />
            {t("team.addMember")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold">{t("team.members")}</h2>
          {teamMembers?.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">{t("team.noMembers")}</p>
              </CardContent>
            </Card>
          ) : (
            teamMembers?.map((member) => (
              <Card
                key={member.id}
                className={`cursor-pointer transition-colors hover-elevate ${selectedMember?.id === member.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => selectMember(member)}
                data-testid={`card-team-member-${member.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        {member.photoUrl && (
                          <AvatarImage src={member.photoUrl} className="object-cover" />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{member.name}</p>
                          {!member.isActive && (
                            <Badge variant="secondary">{t("team.inactive")}</Badge>
                          )}
                        </div>
                        {member.role && (
                          <p className="text-sm text-muted-foreground truncate">{member.role}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(member);
                        }}
                        data-testid={`button-edit-member-${member.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(member.id);
                        }}
                        data-testid={`button-delete-member-${member.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedMember ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16">
                        {selectedMember.photoUrl && (
                          <AvatarImage src={selectedMember.photoUrl} className="object-cover" />
                        )}
                        <AvatarFallback className="text-xl bg-primary/10 text-primary">
                          {selectedMember.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedMember.name}
                      </CardTitle>
                      {selectedMember.role && (
                        <CardDescription>{selectedMember.role}</CardDescription>
                      )}
                    </div>
                  </div>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5 * 1024 * 1024}
                    allowedFileTypes={["image/*"]}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handlePhotoUploadComplete(selectedMember.id)}
                    buttonVariant="outline"
                    buttonSize="sm"
                  >
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {photoMutation.isPending ? t("settings.uploading") : t("team.changePhoto")}
                      </span>
                    </div>
                  </ObjectUploader>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="services">
                  <TabsList className="mb-4">
                    <TabsTrigger value="services" data-testid="tab-services">
                      <Briefcase className="h-4 w-4 mr-2" />
                      {t("team.services")}
                    </TabsTrigger>
                    <TabsTrigger value="availability" data-testid="tab-availability">
                      <Calendar className="h-4 w-4 mr-2" />
                      {t("team.availability")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="services" className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("team.servicesDescription")}
                    </p>
                    {services?.length === 0 ? (
                      <p className="text-muted-foreground">{t("team.noServicesAvailable")}</p>
                    ) : (
                      <div className="space-y-3">
                        {services?.map((service) => (
                          <div
                            key={service.id}
                            className="flex items-center gap-3 p-3 border rounded-md"
                          >
                            <Checkbox
                              checked={memberServices.includes(service.id)}
                              onCheckedChange={() => toggleService(service.id)}
                              data-testid={`checkbox-service-${service.id}`}
                            />
                            <div className="flex-1">
                              <p className="font-medium">{service.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {service.duration} {t("common.minutes")} • ${Number(service.price).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="availability" className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("team.availabilityDescription")}
                    </p>
                    <div className="space-y-3">
                      {memberAvailability.map((day) => (
                        <div
                          key={day.dayOfWeek}
                          className="flex items-center gap-4 p-3 border rounded-md flex-wrap"
                        >
                          <div className="w-24 flex-shrink-0">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={day.isAvailable}
                                onCheckedChange={(checked) => {
                                  updateDayAvailability(day.dayOfWeek, "isAvailable", checked);
                                }}
                                data-testid={`switch-day-${day.dayOfWeek}`}
                              />
                              <span className="text-sm font-medium">
                                {t(`days.${daysOfWeek[day.dayOfWeek].label.toLowerCase()}`)}
                              </span>
                            </div>
                          </div>
                          {day.isAvailable && (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                type="time"
                                value={day.startTime}
                                onChange={(e) => updateDayAvailability(day.dayOfWeek, "startTime", e.target.value)}
                                className="w-28"
                                data-testid={`input-start-${day.dayOfWeek}`}
                              />
                              <span className="text-muted-foreground">{t("availability.to")}</span>
                              <Input
                                type="time"
                                value={day.endTime}
                                onChange={(e) => updateDayAvailability(day.dayOfWeek, "endTime", e.target.value)}
                                className="w-28"
                                data-testid={`input-end-${day.dayOfWeek}`}
                              />
                              <Button
                                size="sm"
                                onClick={() => saveDayAvailability(day.dayOfWeek)}
                                data-testid={`button-save-day-${day.dayOfWeek}`}
                              >
                                {t("common.save")}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("team.selectMember")}</h3>
                <p className="text-muted-foreground">{t("team.selectMemberDescription")}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? t("team.editMember") : t("team.addMember")}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pr-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("team.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("team.namePlaceholder")} data-testid="input-member-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("team.email")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder={t("team.emailPlaceholder")} data-testid="input-member-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("team.phone")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("team.phonePlaceholder")} data-testid="input-member-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("team.role")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("team.rolePlaceholder")} data-testid="input-member-role" />
                    </FormControl>
                    <FormDescription>{t("team.roleDescription")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t("team.active")}</FormLabel>
                      <FormDescription>{t("team.activeDescription")}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-member-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-member"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? t("common.saving")
                    : t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("team.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("team.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
