import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, MapPin, Phone, Mail, ExternalLink, Copy, Check, Camera, Globe, Share2, Plus, X, FileText, QrCode, Download, Link2, Lock, Sun, Moon, Sparkles } from "lucide-react";
import QRCode from "qrcode";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SiFacebook, SiInstagram, SiX, SiLinkedin, SiYoutube, SiTiktok, SiPinterest, SiSnapchat, SiWhatsapp, SiThreads } from "react-icons/si";
import type { Business } from "@shared/schema";
import { businessCategories } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";
import { useDashboardTheme } from "@/components/DashboardThemeProvider";
import { useTier } from "@/hooks/useTier";
import { UpgradeModal } from "@/components/UpgradeModal";

const businessFormSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  slug: z
    .string()
    .min(3, "URL must be at least 3 characters")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  socialFacebook: z.string().optional(),
  socialInstagram: z.string().optional(),
  socialTwitter: z.string().optional(),
  socialLinkedin: z.string().optional(),
  socialYoutube: z.string().optional(),
  socialTiktok: z.string().optional(),
  socialPinterest: z.string().optional(),
  socialSnapchat: z.string().optional(),
  socialWhatsapp: z.string().optional(),
  socialThreads: z.string().optional(),
  termsAndConditions: z.string().optional(),
  showTermsInBooking: z.boolean().optional(),
  showTermsInEmail: z.boolean().optional(),
  showTeamPicturesInBooking: z.boolean().optional(),
});

type BusinessFormValues = z.infer<typeof businessFormSchema>;

type SocialPlatform = {
  key: keyof BusinessFormValues;
  name: string;
  icon: typeof SiFacebook;
  placeholder: string;
};

const socialPlatforms: SocialPlatform[] = [
  { key: "socialFacebook", name: "Facebook", icon: SiFacebook, placeholder: "social.username" },
  { key: "socialInstagram", name: "Instagram", icon: SiInstagram, placeholder: "social.username" },
  { key: "socialTwitter", name: "X (Twitter)", icon: SiX, placeholder: "social.username" },
  { key: "socialLinkedin", name: "LinkedIn", icon: SiLinkedin, placeholder: "social.username" },
  { key: "socialYoutube", name: "YouTube", icon: SiYoutube, placeholder: "social.channel" },
  { key: "socialTiktok", name: "TikTok", icon: SiTiktok, placeholder: "social.username" },
  { key: "socialPinterest", name: "Pinterest", icon: SiPinterest, placeholder: "social.username" },
  { key: "socialSnapchat", name: "Snapchat", icon: SiSnapchat, placeholder: "social.username" },
  { key: "socialWhatsapp", name: "WhatsApp", icon: SiWhatsapp, placeholder: "+1234567890" },
  { key: "socialThreads", name: "Threads", icon: SiThreads, placeholder: "social.username" },
];

const countries = [
  "United States", "Canada", "Mexico", "United Kingdom", "Spain",
  "Argentina", "Colombia", "Peru", "Chile", "Australia",
  "Germany", "France", "Italy", "Brazil", "Portugal",
  "Netherlands", "Belgium", "Switzerland", "Austria", "Sweden",
  "Norway", "Denmark", "Finland", "Ireland", "New Zealand",
  "Japan", "South Korea", "Singapore", "Hong Kong", "India",
  "South Africa", "United Arab Emirates", "Saudi Arabia", "Israel", "Turkey",
  "Poland", "Czech Republic", "Greece", "Romania", "Hungary",
  "Philippines", "Malaysia", "Thailand", "Indonesia", "Vietnam",
  "Ecuador", "Venezuela", "Costa Rica", "Panama", "Puerto Rico",
  "Dominican Republic", "Guatemala", "Honduras", "El Salvador", "Nicaragua",
  "Bolivia", "Paraguay", "Uruguay", "Cuba"
].sort();

export default function Settings() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platformPickerOpen, setPlatformPickerOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const { t, language } = useI18n();
  const { theme, setTheme } = useDashboardTheme();
  const { isStarter, isPro, isTeams } = useTier();
  const canAccessBranding = isPro || isTeams;
  const [showBrandingUpgradeModal, setShowBrandingUpgradeModal] = useState(false);
  const [showQrUpgradeModal, setShowQrUpgradeModal] = useState(false);

  const getCategoryLabel = (cat: string): string => {
    return t(`categories.${cat}`);
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: t("common.unauthorized"),
        description: t("common.loggingIn"),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast, t]);

  const { data: business, isLoading } = useQuery<Business>({
    queryKey: ["/api/business"],
  });

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      category: "",
      address: "",
      city: "",
      country: "",
      phone: "",
      email: "",
      socialFacebook: "",
      socialInstagram: "",
      socialTwitter: "",
      socialLinkedin: "",
      socialYoutube: "",
      socialTiktok: "",
      socialPinterest: "",
      socialSnapchat: "",
      socialWhatsapp: "",
      socialThreads: "",
      termsAndConditions: "",
      showTermsInBooking: false,
      showTermsInEmail: false,
      showTeamPicturesInBooking: false,
    },
  });

  useEffect(() => {
    if (business) {
      form.reset({
        name: business.name,
        slug: business.slug,
        description: business.description || "",
        category: business.category,
        address: business.address || "",
        city: business.city || "",
        country: business.country || "",
        phone: business.phone || "",
        email: business.email || "",
        socialFacebook: business.socialFacebook || "",
        socialInstagram: business.socialInstagram || "",
        socialTwitter: business.socialTwitter || "",
        socialLinkedin: business.socialLinkedin || "",
        socialYoutube: business.socialYoutube || "",
        socialTiktok: business.socialTiktok || "",
        socialPinterest: business.socialPinterest || "",
        socialSnapchat: business.socialSnapchat || "",
        socialWhatsapp: business.socialWhatsapp || "",
        socialThreads: business.socialThreads || "",
        termsAndConditions: business.termsAndConditions || "",
        showTermsInBooking: business.showTermsInBooking || false,
        showTermsInEmail: business.showTermsInEmail || false,
        showTeamPicturesInBooking: business.showTeamPicturesInBooking || false,
      });

      const activePlatforms = socialPlatforms
        .filter(p => business[p.key as keyof Business])
        .map(p => p.key);
      setSelectedPlatforms(activePlatforms);
    }
  }, [business, form]);

  useEffect(() => {
    if (business?.slug) {
      const bookingUrl = `${window.location.origin}/book/${business.slug}`;
      QRCode.toDataURL(bookingUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error("QR code generation error:", err));
    }
  }, [business?.slug]);

  const saveMutation = useMutation({
    mutationFn: async (data: BusinessFormValues) => {
      if (business) {
        return await apiRequest("PATCH", "/api/business", data);
      } else {
        return await apiRequest("POST", "/api/business", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
      toast({ title: t("settings.profileSaved") });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: t("common.unauthorized"),
          description: t("common.loggingIn"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: t("common.failedToSave"), variant: "destructive" });
    },
  });

  const onSubmit = (data: BusinessFormValues) => {
    saveMutation.mutate(data);
  };

  const logoMutation = useMutation({
    mutationFn: async (logoURL: string) => {
      return await apiRequest("PUT", "/api/business/logo", { logoURL });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
      toast({ title: t("settings.logoUpdated") });
      setIsUploading(false);
    },
    onError: (error) => {
      console.error("Error updating logo:", error);
      toast({ title: t("common.failedToSave"), variant: "destructive" });
      setIsUploading(false);
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

  const handleUploadComplete = useCallback((result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      if (uploadURL) {
        setIsUploading(true);
        logoMutation.mutate(uploadURL);
      }
    }
  }, [logoMutation]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    form.setValue("name", name);
    if (!business && !form.getValues("slug")) {
      form.setValue("slug", generateSlug(name));
    }
  };

  const copyBookingUrl = () => {
    const url = `${window.location.origin}/book/${form.getValues("slug")}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: t("settings.urlCopied") });
  };

  const downloadQrCode = (format: "png" | "jpg") => {
    if (!qrCodeDataUrl || !business?.slug) return;

    const link = document.createElement("a");
    link.download = `${business.slug}-qr-code.${format}`;

    if (format === "jpg") {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          link.href = canvas.toDataURL("image/jpeg", 0.95);
          link.click();
          toast({ title: t("settings.qrCodeDownloaded") });
        }
      };
      img.src = qrCodeDataUrl;
    } else {
      link.href = qrCodeDataUrl;
      link.click();
      toast({ title: t("settings.qrCodeDownloaded") });
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-settings-title">
          {t("settings.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </div>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("settings.preferences")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Language */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t("settings.language")}</label>
              <p className="text-sm text-muted-foreground mb-3">
                {t("settings.languageDescription")}
              </p>
              <LanguageSwitcher />
            </div>

            {/* Theme Toggle */}
            <div className="border-t pt-6">
              <label className="text-sm font-medium mb-2 block">{t("settings.theme")}</label>
              <p className="text-sm text-muted-foreground mb-3">
                {t("settings.themeDescription")}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  data-testid="button-theme-light"
                  className="gap-2"
                >
                  <Sun className="h-4 w-4" />
                  {t("settings.themeLight")}
                </Button>
                <Button
                  type="button"
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  data-testid="button-theme-dark"
                  className="gap-2"
                >
                  <Moon className="h-4 w-4" />
                  {t("settings.themeDark")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Business Settings */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" data-testid="tab-profile">
                <Building2 className="h-4 w-4 mr-2" />
                {t("settings.tabProfile")}
              </TabsTrigger>
              <TabsTrigger value="booking" data-testid="tab-booking">
                <Link2 className="h-4 w-4 mr-2" />
                {t("settings.tabBookingPage")}
              </TabsTrigger>
              <TabsTrigger value="policies" data-testid="tab-policies">
                <FileText className="h-4 w-4 mr-2" />
                {t("settings.tabPolicies")}
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              {/* Profile Card with Logo Upload */}
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-16 w-16">
                          <AvatarImage
                            src={business?.logoUrl?.startsWith('/objects/')
                              ? business.logoUrl
                              : business?.logoUrl || undefined
                            }
                            className="object-cover"
                          />
                          <AvatarFallback className="text-xl">
                            {business?.name?.charAt(0) || user?.firstName?.charAt(0) || "B"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div>
                        <CardTitle>{business?.name || t("settings.yourBusiness")}</CardTitle>
                        <CardDescription>
                          {business
                            ? getCategoryLabel(business.category)
                            : t("dashboard.setupButton")}
                        </CardDescription>
                      </div>
                    </div>
                    {business && (
                      canAccessBranding ? (
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={5 * 1024 * 1024}
                          allowedFileTypes={["image/*"]}
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handleUploadComplete}
                          buttonVariant="outline"
                          buttonSize="default"
                        >
                          <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4" />
                            <span>{isUploading || logoMutation.isPending ? t("settings.uploading") : t("settings.changeLogo")}</span>
                          </div>
                        </ObjectUploader>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowBrandingUpgradeModal(true)}
                          data-testid="button-upgrade-logo"
                        >
                          <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4" />
                            <span>{t("settings.changeLogo")}</span>
                            <Badge variant="secondary" className="ml-1 text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Pro+
                            </Badge>
                          </div>
                        </Button>
                      )
                    )}
                  </div>
                </CardHeader>
              </Card>

              {/* Business Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {t("settings.businessInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("settings.businessName")} *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onChange={handleNameChange}
                              placeholder={t("settings.businessNamePlaceholder")}
                              data-testid="input-business-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("settings.category")} *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder={t("settings.selectCategory")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {businessCategories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {getCategoryLabel(cat)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("settings.description")}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={t("settings.descriptionPlaceholder")}
                            className="resize-none min-h-[100px]"
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Location */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      {t("settings.location")}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="md:col-span-3">
                            <FormLabel>{t("settings.address")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("settings.addressPlaceholder")}
                                data-testid="input-address"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("settings.city")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("settings.cityPlaceholder")}
                                data-testid="input-city"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("settings.country")}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-country">
                                  <SelectValue placeholder={t("settings.countryPlaceholder")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {countries.map((country) => (
                                  <SelectItem key={country} value={country}>
                                    {t(`countries.${country}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      {t("settings.contact")}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("settings.phone")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="tel"
                                placeholder={t("settings.phonePlaceholder")}
                                data-testid="input-phone"
                              />
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
                            <FormLabel>{t("settings.email")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder={t("settings.emailPlaceholder")}
                                data-testid="input-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Social Media */}
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Share2 className="h-5 w-5" />
                          {t("settings.socialMedia")}
                        </h3>
                        <p className="text-sm text-muted-foreground">{t("settings.socialMediaDescription")}</p>
                      </div>
                      <Popover open={platformPickerOpen} onOpenChange={setPlatformPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" data-testid="button-add-social-platform">
                            <Plus className="h-4 w-4 mr-2" />
                            {t("settings.addPlatform")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="end">
                          <div className="space-y-2">
                            <p className="text-sm font-medium mb-3">{t("settings.selectPlatforms")}</p>
                            {socialPlatforms.map((platform) => {
                              const Icon = platform.icon;
                              const isSelected = selectedPlatforms.includes(platform.key);
                              return (
                                <div
                                  key={platform.key}
                                  className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedPlatforms(prev => prev.filter(p => p !== platform.key));
                                      form.setValue(platform.key, "");
                                    } else {
                                      setSelectedPlatforms(prev => [...prev, platform.key]);
                                    }
                                  }}
                                  data-testid={`toggle-platform-${platform.key}`}
                                >
                                  <Checkbox checked={isSelected} />
                                  <Icon className="h-4 w-4" />
                                  <span className="text-sm">{platform.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {selectedPlatforms.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                        <Share2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t("settings.noPlatformsSelected")}</p>
                        <p className="text-xs">{t("settings.clickToAddPlatforms")}</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {socialPlatforms
                          .filter(platform => selectedPlatforms.includes(platform.key))
                          .map((platform) => {
                            const Icon = platform.icon;
                            return (
                              <FormField
                                key={platform.key}
                                control={form.control}
                                name={platform.key}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                      <Icon className="h-4 w-4" />
                                      {platform.name}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 ml-auto"
                                        onClick={() => {
                                          setSelectedPlatforms(prev => prev.filter(p => p !== platform.key));
                                          form.setValue(platform.key, "");
                                        }}
                                        data-testid={`button-remove-${platform.key}`}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        value={String(field.value || "")}
                                        placeholder={platform.placeholder.startsWith("social.") ? t(platform.placeholder) : platform.placeholder}
                                        data-testid={`input-${platform.key}`}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            );
                          })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Booking Page Tab */}
            <TabsContent value="booking" className="space-y-6">
              {/* Booking URL */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    {t("settings.bookingPageUrl")}
                  </CardTitle>
                  <CardDescription>
                    {t("settings.urlDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex gap-2">
                          <div className="flex-1 flex items-center">
                            <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-l-md border border-r-0">
                              {window.location.origin}/book/
                            </span>
                            <FormControl>
                              <Input
                                {...field}
                                className="rounded-l-none"
                                placeholder="your-business"
                                data-testid="input-slug"
                              />
                            </FormControl>
                          </div>
                          {business && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={copyBookingUrl}
                              data-testid="button-copy-url"
                            >
                              {copied ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {business && (
                    <div className="mt-4">
                      <a
                        href={`/book/${business.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button type="button" variant="outline" className="gap-2">
                          <ExternalLink className="h-4 w-4" />
                          {t("settings.previewBooking")}
                        </Button>
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* QR Code */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    {t("settings.qrCode")}
                    {!canAccessBranding && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Pro+
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {t("settings.qrCodeDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {canAccessBranding ? (
                    business && qrCodeDataUrl ? (
                      <div className="flex flex-col items-center space-y-4">
                        <div className="bg-white p-4 rounded-lg border" data-testid="qr-code-preview">
                          <img
                            src={qrCodeDataUrl}
                            alt="Booking page QR code"
                            className="w-48 h-48"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                          {`${window.location.origin}/book/${business.slug}`}
                        </p>
                        <div className="flex gap-2 flex-wrap justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => downloadQrCode("png")}
                            className="gap-2"
                            data-testid="button-download-png"
                          >
                            <Download className="h-4 w-4" />
                            {t("settings.downloadPng")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => downloadQrCode("jpg")}
                            className="gap-2"
                            data-testid="button-download-jpg"
                          >
                            <Download className="h-4 w-4" />
                            {t("settings.downloadJpg")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                        <QrCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">{t("settings.noBusinessYet")}</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 border rounded-lg border-dashed">
                      <QrCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground mb-4">{t("tier.availableInPro")}</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowQrUpgradeModal(true)}
                        data-testid="button-upgrade-qr"
                      >
                        {t("upgrade.unlockFeature")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Booking Page Options */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("settings.bookingPageOptions")}</CardTitle>
                  <CardDescription>
                    {t("settings.bookingPageOptionsDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="showTeamPicturesInBooking"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>{t("settings.showTeamPhotos")}</FormLabel>
                          <FormDescription>
                            {t("settings.showTeamPhotosDesc")}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-show-team-photos"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Pro+ Features Placeholders */}
                  <div className="space-y-4 opacity-60">
                    <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{t("settings.logoUpload")}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Pro+
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t("settings.logoUploadDesc")}
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" disabled>
                        {t("settings.upload")}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{t("settings.coverImage")}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Pro+
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t("settings.coverImageDesc")}
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" disabled>
                        {t("settings.upload")}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{t("settings.brandColors")}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Pro+
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t("settings.brandColorsDesc")}
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" disabled>
                        {t("settings.customize")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Policies Tab */}
            <TabsContent value="policies" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {t("settings.termsAndConditions")}
                  </CardTitle>
                  <CardDescription>
                    {t("settings.termsDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="termsAndConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("settings.termsLabel")}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={t("settings.termsPlaceholder")}
                            className="resize-none min-h-[200px]"
                            data-testid="input-terms"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="showTermsInBooking"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>{t("settings.showTermsInBooking")}</FormLabel>
                            <FormDescription>
                              {t("settings.showTermsInBookingDesc")}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-terms-booking"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="showTermsInEmail"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>{t("settings.showTermsInEmail")}</FormLabel>
                            <FormDescription>
                              {t("settings.showTermsInEmailDesc")}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-terms-email"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Save Button - visible on all tabs */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                data-testid="button-save-business"
              >
                {saveMutation.isPending ? t("settings.saving") : business ? t("settings.save") : t("settings.create")}
              </Button>
            </div>
          </Tabs>
        </form>
      </Form>

      <UpgradeModal
        open={showBrandingUpgradeModal}
        onOpenChange={setShowBrandingUpgradeModal}
        targetTier="pro"
        title={t("upgrade.branding.title")}
        benefits={[
          t("upgrade.branding.benefit1"),
          t("upgrade.branding.benefit2"),
          t("upgrade.branding.benefit3"),
          t("upgrade.branding.benefit4"),
        ]}
      />

      <UpgradeModal
        open={showQrUpgradeModal}
        onOpenChange={setShowQrUpgradeModal}
        targetTier="pro"
        title={t("upgrade.qrCode.title")}
        benefits={[
          t("upgrade.qrCode.benefit1"),
          t("upgrade.qrCode.benefit2"),
          t("upgrade.qrCode.benefit3"),
          t("upgrade.qrCode.benefit4"),
        ]}
      />
    </div>
  );
}
