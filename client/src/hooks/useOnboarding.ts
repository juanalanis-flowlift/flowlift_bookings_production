import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import type { Business } from "@shared/schema";

export function useOnboarding() {
  const [, navigate] = useLocation();
  
  const { data: business, isLoading } = useQuery<Business>({
    queryKey: ["/api/business"],
    retry: false,
  });

  const needsOnboarding = !isLoading && (!business || !business.onboardingComplete);
  const onboardingComplete = !isLoading && business?.onboardingComplete === true;

  return {
    business,
    isLoading,
    needsOnboarding,
    onboardingComplete,
    currentStep: business?.onboardingStep || 0,
  };
}

export function useRequireOnboarding() {
  const { needsOnboarding, isLoading } = useOnboarding();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && needsOnboarding) {
      navigate("/onboarding");
    }
  }, [isLoading, needsOnboarding, navigate]);

  return { isLoading, needsOnboarding };
}
