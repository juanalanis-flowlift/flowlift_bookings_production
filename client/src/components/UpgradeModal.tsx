import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { SubscriptionTier } from "@shared/schema";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetTier: "pro" | "teams";
  title: string;
  description?: string;
  benefits: string[];
}

export function UpgradeModal({
  open,
  onOpenChange,
  targetTier,
  title,
  description,
  benefits,
}: UpgradeModalProps) {
  const { t } = useI18n();

  const tierLabel = targetTier === "pro" ? "Pro+" : "Teams";

  const handleUpgrade = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </div>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3 py-4">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm">{benefit}</span>
            </div>
          ))}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="sm:order-1"
            data-testid="button-upgrade-not-now"
          >
            {t("upgrade.notNow")}
          </Button>
          <Button
            onClick={handleUpgrade}
            className="sm:order-2"
            data-testid="button-upgrade-confirm"
          >
            {t("upgrade.upgradeTo")} {tierLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TierBadgeProps {
  tier: "pro" | "teams";
  className?: string;
}

export function TierBadge({ tier, className = "" }: TierBadgeProps) {
  const { t } = useI18n();
  const label = tier === "pro" ? t("tier.availableInPro") : t("tier.availableInTeams");
  
  return (
    <span className={`text-xs text-muted-foreground ${className}`}>
      {label}
    </span>
  );
}

interface TierGatedProps {
  requiredTier: "pro" | "teams";
  children: React.ReactNode;
  fallback?: React.ReactNode;
  currentTier: SubscriptionTier;
}

export function TierGated({ requiredTier, children, fallback, currentTier }: TierGatedProps) {
  const tierOrder: Record<SubscriptionTier, number> = {
    starter: 0,
    pro: 1,
    teams: 2,
  };

  const hasAccess = tierOrder[currentTier] >= tierOrder[requiredTier];

  if (hasAccess) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}
