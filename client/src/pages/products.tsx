import { useI18n } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

export default function Products() {
    const { t } = useI18n();

    const tiers = [
        {
            name: t("settings.tier.starter"),
            price: t("tier.starter.price"),
            features: [
                t("tier.starter.feature1"),
                t("tier.starter.feature2"),
                t("tier.starter.feature3"),
                t("tier.starter.feature4"),
            ],
        },
        {
            name: t("settings.tier.pro"),
            price: t("tier.pro.price"),
            features: [
                t("tier.pro.feature1"),
                t("tier.pro.feature2"),
                t("tier.pro.feature3"),
                t("tier.pro.feature4"),
            ],
            popular: true,
        },
        {
            name: t("settings.tier.teams"),
            price: t("tier.teams.price"),
            features: [
                t("tier.teams.feature1"),
                t("tier.teams.feature2"),
                t("tier.teams.feature3"),
                t("tier.teams.feature4"),
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-white">
            <div className="container mx-auto px-4 py-16 md:py-24">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">
                        {t("products.title")}
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        {t("products.subtitle")}
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {tiers.map((tier, index) => (
                        <Card
                            key={index}
                            className={`relative ${tier.popular ? "border-primary border-2 shadow-lg" : ""
                                }`}
                        >
                            {tier.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                                        {t("tier.popular")}
                                    </span>
                                </div>
                            )}
                            <CardContent className="pt-8 pb-8">
                                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                                <div className="mb-6">
                                    <span className="text-4xl font-bold">{tier.price}</span>
                                    {tier.price !== t("tier.starter.price") && (
                                        <span className="text-muted-foreground">
                                            /{t("tier.perMonth")}
                                        </span>
                                    )}
                                </div>
                                <ul className="space-y-3 mb-8">
                                    {tier.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                            <span className="text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <a href="/signup">
                                    <Button
                                        className="w-full gap-2"
                                        variant={tier.popular ? "default" : "outline"}
                                    >
                                        {t("landing.startFree")}
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </a>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
