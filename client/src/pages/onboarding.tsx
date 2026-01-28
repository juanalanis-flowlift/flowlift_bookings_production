import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { ArrowLeft, ArrowRight, Check, Sun, Moon, Camera, Building2 } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { businessCategories, type Business } from "@shared/schema";

import step0Image from "@assets/flowlift_onboarding_step0_1768793034455.png";
import step1Image from "@assets/flowlift_onboarding_step1_1768793034456.png";
import step2Image from "@assets/flowlift_onboarding_step2_1768793034458.png";
import step3Image from "@assets/flowlift_onboarding_step3_1768793034457.png";
import step4Image from "@assets/flowlift_onboarding_step4_1768793034457.png";
import flowliftLogo from "@assets/flowlift_logo_full_small_white_1769033094305.png";
import flowliftLogoNew from "@assets/flowlift_logo_new.png";

const TOTAL_STEPS = 4;

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

const step1Schema = z.object({
  name: z.string().min(1, "Business name is required"),
  category: z.string().min(1, "Category is required"),
});

const step2Schema = z.object({
  description: z.string().min(1, "Description is required"),
});

const step3Schema = z.object({
  address: z.string().nullable().optional(),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").min(1, "Email is required"),
});

const step4Schema = z.object({
  preferredLanguage: z.enum(["en", "es"]),
  theme: z.enum(["light", "dark"]).optional(),
});

type OnboardingData = {
  name: string;
  category: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  preferredLanguage: "en" | "es";
  theme: "light" | "dark";
  logoUrl: string | null;
};

function ProgressIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const percentage = Math.round((currentStep / (totalSteps - 1)) * 100);
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-12 h-12">
      <svg className="w-12 h-12 transform -rotate-90">
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/30"
        />
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-primary transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-foreground">
          {currentStep}/{totalSteps - 1}
        </span>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const { t, language, setLanguage } = useI18n();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [loadedBusinessId, setLoadedBusinessId] = useState<string | null>(null);

  const [formData, setFormData] = useState<OnboardingData>({
    name: "",
    category: "",
    description: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    email: "",
    preferredLanguage: language,
    theme: "light",
    logoUrl: null,
  });

  const { data: business, isLoading: businessLoading } = useQuery<Business>({
    queryKey: ["/api/business"],
    retry: false,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/signin");
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Sync form data and reset forms once when business is loaded
  useEffect(() => {
    if (business && business.id !== loadedBusinessId) {
      const initialData: OnboardingData = {
        name: business.name || "",
        category: business.category || "",
        description: business.description || "",
        address: business.address || "",
        city: business.city || "",
        country: business.country || "",
        phone: business.phone || "",
        email: business.email || "",
        preferredLanguage: (business.preferredLanguage as "en" | "es") || (language as "en" | "es"),
        theme: "light",
        logoUrl: business.logoUrl || null,
      };

      setFormData(initialData);
      setCurrentStep(business.onboardingStep || 0);

      // Reset individual forms
      step1Form.reset({ name: initialData.name, category: initialData.category });
      step2Form.reset({ description: initialData.description });
      step3Form.reset({
        address: initialData.address,
        city: initialData.city,
        country: initialData.country,
        phone: initialData.phone,
        email: initialData.email,
      });
      step4Form.reset({
        preferredLanguage: initialData.preferredLanguage,
        theme: "light",
      });

      setLoadedBusinessId(business.id);

      if (business.onboardingComplete) {
        navigate("/services");
      }
    }
  }, [business, navigate, loadedBusinessId, language]);

  useEffect(() => {
    const browserLang = navigator.language.startsWith("es") ? "es" : "en";
    if (!formData.preferredLanguage) {
      setFormData(prev => ({ ...prev, preferredLanguage: browserLang }));
    }
  }, []);

  const createBusinessMutation = useMutation({
    mutationFn: async (data: Partial<OnboardingData> & { onboardingStep: number; slug?: string }) => {
      return await apiRequest("POST", "/api/business", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save",
        variant: "destructive",
      });
    },
  });

  const updateBusinessMutation = useMutation({
    mutationFn: async (data: Partial<OnboardingData> & { onboardingStep?: number; onboardingComplete?: boolean; slug?: string; logoUrl?: string; subscriptionTier?: string }) => {
      return await apiRequest("PATCH", "/api/business", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save",
        variant: "destructive",
      });
    },
  });

  const step1Form = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: formData.name,
      category: formData.category,
    },
  });

  const step2Form = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      description: formData.description,
    },
  });

  const step3Form = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      address: formData.address,
      city: formData.city,
      country: formData.country,
      phone: formData.phone,
      email: formData.email,
    },
  });

  const step4Form = useForm({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      preferredLanguage: formData.preferredLanguage,
      theme: formData.theme,
    },
  });



  const getCategoryLabel = (cat: string): string => {
    return t(`categories.${cat}`);
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 50);
  };

  const handleGetUploadParameters = useCallback(async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  }, []);

  const logoMutation = useMutation({
    mutationFn: async (logoURL: string) => {
      const response = await apiRequest("PUT", "/api/business/logo", { logoURL });
      return response.json();
    },
    onSuccess: (data) => {
      // Only update the logoUrl in formData, don't refetch and reset forms
      setFormData(prev => ({ ...prev, logoUrl: data.logoUrl }));
      toast({ title: t("settings.logoUpdated") });
      setIsUploading(false);
    },
    onError: (error) => {
      console.error("Error updating logo:", error);
      toast({ title: t("common.failedToSave"), variant: "destructive" });
      setIsUploading(false);
    },
  });

  const handleLogoUploadComplete = useCallback((result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      if (uploadURL) {
        setIsUploading(true);
        logoMutation.mutate(uploadURL);
      }
    }
  }, [logoMutation]);

  const handleNext = async () => {
    if (currentStep === 0) {
      setCurrentStep(1);
      if (!business) {
        const tempSlug = `temp-${Date.now()}`;
        await createBusinessMutation.mutateAsync({
          name: "My Business",
          category: "other",
          slug: tempSlug,
          onboardingStep: 1,
        });
      } else {
        await updateBusinessMutation.mutateAsync({ onboardingStep: 1 });
      }
      return;
    }

    if (currentStep === 1) {
      const valid = await step1Form.trigger();
      if (!valid) return;
      const values = step1Form.getValues();
      setFormData(prev => ({ ...prev, ...values }));
      const slug = generateSlug(values.name);
      await updateBusinessMutation.mutateAsync({
        name: values.name,
        category: values.category,
        slug,
        onboardingStep: 2,
      });
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      const valid = await step2Form.trigger();
      if (!valid) return;
      const values = step2Form.getValues();
      setFormData(prev => ({ ...prev, ...values }));
      await updateBusinessMutation.mutateAsync({
        description: values.description,
        onboardingStep: 3,
      });
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      const valid = await step3Form.trigger();
      if (!valid) return;
      const values = step3Form.getValues();
      setFormData(prev => ({ ...prev, ...values }));

      const languageVal = step4Form.getValues("preferredLanguage");

      // Use updateBusinessMutation directly with a dedicated onSuccess for this final step
      updateBusinessMutation.mutate({
        address: values.address || "",
        city: values.city,
        country: values.country,
        phone: values.phone,
        email: values.email,
        preferredLanguage: languageVal,
        onboardingStep: 3, // Keep it at 3 (the final step)
        onboardingComplete: true,
        subscriptionTier: "teams",
      }, {
        onSuccess: () => {
          navigate("/services");
        }
      });
      return;
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isSaving = createBusinessMutation.isPending || updateBusinessMutation.isPending;

  const stepImages = [step0Image, step1Image, step2Image, step3Image, step4Image];

  if (authLoading || businessLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div key="step-0" className="space-y-4 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
              {t("onboarding.step0.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("onboarding.step0.subtitle")}
            </p>

            <Form {...step4Form}>
              <form className="space-y-4 pt-2">
                <FormField
                  control={step4Form.control}
                  name="preferredLanguage"
                  render={({ field }) => (
                    <FormItem className="text-left">
                      <FormLabel>{t("onboarding.step4.language")}</FormLabel>
                      <FormDescription>{t("onboarding.step4.languageDesc")}</FormDescription>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          setLanguage(val as "en" | "es");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-language">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 pt-2">
                  <Button
                    size="lg"
                    type="button"
                    className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={handleNext}
                    disabled={isSaving}
                    data-testid="button-start-setup"
                  >
                    {isSaving ? t("onboarding.saving") : t("onboarding.step0.cta")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        );

      case 1:
        return (
          <div key="step-1" className="space-y-4">
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                {t("onboarding.step1.title")}
              </h1>
              <p className="text-muted-foreground mt-2">
                {t("onboarding.step1.subtitle")}
              </p>
            </div>

            <Form {...step1Form}>
              <form className="space-y-4" autoComplete="off">
                <FormField
                  control={step1Form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("onboarding.step1.businessName")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          id="onboarding-business-name"
                          autoComplete="off"
                          placeholder={t("onboarding.step1.businessNamePlaceholder")}
                          data-testid="input-business-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={step1Form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("onboarding.step1.category")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder={t("onboarding.step1.categoryPlaceholder")} />
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


              </form>
            </Form>
          </div>
        );

      case 2:
        return (
          <div key="step-2" className="space-y-4">
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                {t("onboarding.step2.title")}
              </h1>
              <p className="text-muted-foreground mt-2">
                {t("onboarding.step2.subtitle")}
              </p>
            </div>

            <Form {...step2Form}>
              <form className="space-y-4" autoComplete="off">
                <FormField
                  control={step2Form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("onboarding.step2.description")}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          key="description-field"
                          id="onboarding-description"
                          autoComplete="off"
                          placeholder={t("onboarding.step2.descriptionPlaceholder")}
                          rows={5}
                          className="resize-none"
                          data-testid="textarea-description"
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        );

      case 3:
        return (
          <div key="step-3" className="space-y-3">
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                {t("onboarding.step3.title")}
              </h1>
              <p className="text-muted-foreground mt-2">
                {t("onboarding.step3.subtitle")}
              </p>
            </div>

            <Form {...step3Form}>
              <form className="space-y-2" autoComplete="off">
                <FormField
                  control={step3Form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("onboarding.step3.address")} ({t("common.optional")})</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          id="onboarding-address"
                          autoComplete="off"
                          placeholder={t("onboarding.step3.addressPlaceholder")}
                          data-testid="input-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={step3Form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.step3.city")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            id="onboarding-city"
                            autoComplete="off"
                            placeholder={t("onboarding.step3.cityPlaceholder")}
                            data-testid="input-city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step3Form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.step3.country")}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-country">
                              <SelectValue placeholder={t("onboarding.step3.countryPlaceholder")} />
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

                <FormField
                  control={step3Form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("onboarding.step3.phone")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          id="onboarding-phone"
                          autoComplete="off"
                          placeholder={t("onboarding.step3.phonePlaceholder")}
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={step3Form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("onboarding.step3.email")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          id="onboarding-email"
                          type="email"
                          autoComplete="off"
                          placeholder={t("onboarding.step3.emailPlaceholder")}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        );



      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-[85%] lg:max-w-5xl h-[500px] lg:h-[600px] bg-background rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left column - Green Panel */}
        <div className="w-full md:w-[45%] bg-primary p-8 md:p-12 text-primary-foreground flex flex-col justify-between relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          {/* Logo */}
          {/* Logo Removed */}

          {/* Main Text */}
          <div className="relative z-10 my-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold leading-tight mb-6">
              {currentStep === 0 ? t("onboarding.sidePanel.step0.title") :
                currentStep === 1 ? t("onboarding.sidePanel.step1.title") :
                  currentStep === 2 ? t("onboarding.sidePanel.step2.title") :
                    currentStep === 3 ? t("onboarding.sidePanel.step3.title") :
                      t("onboarding.sidePanel.title")}
            </h1>
            <p className="text-primary-foreground/80 text-lg leading-relaxed max-w-md whitespace-pre-line">
              {currentStep === 0 ? t("onboarding.sidePanel.step0.subtitle") :
                currentStep === 1 ? t("onboarding.sidePanel.step1.subtitle") :
                  currentStep === 2 ? t("onboarding.sidePanel.step2.subtitle") :
                    currentStep === 3 ? t("onboarding.sidePanel.step3.subtitle") :
                      t("onboarding.sidePanel.subtitle")}
            </p>
          </div>

          {/* Progress Dots */}
          <div className="flex gap-2 relative z-10">
            {[0, 1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-1.5 rounded-full transition-all duration-300 ${currentStep === step ? "w-8 bg-white" : "w-2 bg-white/40"
                  }`}
              />
            ))}
          </div>
        </div>

        <div className="w-full md:w-[55%] bg-background p-6 md:p-10 flex flex-col relative overflow-hidden">
          {/* Logo - Fixed to top right of the section */}
          <div className="absolute top-6 md:top-8 right-6 md:right-10 z-10">
            <img src={flowliftLogoNew} alt="flowlift" className="h-7 w-auto" />
          </div>

          {/* Step content container - Fixed Header Position (shifted up 20px) */}
          <div className="max-w-md mx-auto w-full pt-7 md:pt-11 lg:pt-15">
            {renderStepContent()}
          </div>

          {/* Navigation buttons - Fixed to bottom */}
          {currentStep !== 0 && (
            <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 right-6 md:right-10 flex justify-center">
              <div className="max-w-md w-full flex gap-4">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={isSaving}
                    className="flex-1 h-12 rounded-xl text-lg font-medium"
                    data-testid="button-back"
                  >
                    {t("onboarding.back")}
                  </Button>
                )}

                <Button
                  onClick={handleNext}
                  disabled={isSaving}
                  size="lg"
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold h-12 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all"
                  data-testid="button-continue"
                >
                  {isSaving ? t("onboarding.saving") : currentStep === 3 ? t("onboarding.complete.cta") : t("onboarding.continue")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
