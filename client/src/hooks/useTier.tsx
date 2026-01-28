import { createContext, useContext, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Business, SubscriptionTier } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type { SubscriptionTier };

interface TierContextValue {
  tier: SubscriptionTier;
  isStarter: boolean;
  isPro: boolean;
  isTeams: boolean;
  canAccessFeature: (requiredTier: SubscriptionTier) => boolean;
  isLoading: boolean;
  setTier: (newTier: SubscriptionTier) => void;
  isUpdating: boolean;
}

const TierContext = createContext<TierContextValue | null>(null);

const tierOrder: Record<SubscriptionTier, number> = {
  starter: 0,
  pro: 1,
  teams: 2,
};

export function TierProvider({ children }: { children: React.ReactNode }) {
  const { data: business, isLoading } = useQuery<Business>({
    queryKey: ["/api/business"],
    retry: false,
  });

  const updateTierMutation = useMutation({
    mutationFn: async (newTier: SubscriptionTier) => {
      return apiRequest("PATCH", "/api/business", { subscriptionTier: newTier });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
    },
  });

  const setTier = useCallback((newTier: SubscriptionTier) => {
    updateTierMutation.mutate(newTier);
  }, [updateTierMutation]);

  const value = useMemo<TierContextValue>(() => {
    const tier = (business?.subscriptionTier as SubscriptionTier) || "starter";
    
    return {
      tier,
      isStarter: tier === "starter",
      isPro: tier === "pro",
      isTeams: tier === "teams",
      canAccessFeature: (requiredTier: SubscriptionTier) => {
        return tierOrder[tier] >= tierOrder[requiredTier];
      },
      isLoading,
      setTier,
      isUpdating: updateTierMutation.isPending,
    };
  }, [business?.subscriptionTier, isLoading, setTier, updateTierMutation.isPending]);

  return <TierContext.Provider value={value}>{children}</TierContext.Provider>;
}

export function useTier(): TierContextValue {
  const context = useContext(TierContext);
  if (!context) {
    return {
      tier: "starter",
      isStarter: true,
      isPro: false,
      isTeams: false,
      canAccessFeature: () => true,
      isLoading: false,
      setTier: () => {},
      isUpdating: false,
    };
  }
  return context;
}

export function getTierLabel(tier: SubscriptionTier): string {
  switch (tier) {
    case "starter":
      return "Starter";
    case "pro":
      return "Pro+";
    case "teams":
      return "Teams";
  }
}

export function getUpgradeTierLabel(currentTier: SubscriptionTier): string {
  switch (currentTier) {
    case "starter":
      return "Pro+";
    case "pro":
      return "Teams";
    case "teams":
      return "Teams";
  }
}
