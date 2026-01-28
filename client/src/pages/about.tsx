import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function About() {
    const { t } = useI18n();

    return (
        <div className="min-h-screen bg-white">
            <div className="container mx-auto px-4 py-16 md:py-24">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">
                        {t("about.title")}
                    </h1>
                    <div className="prose prose-lg max-w-none">
                        <p className="text-xl text-muted-foreground mb-8">
                            {t("about.subtitle")}
                        </p>

                        <h2 className="text-2xl font-serif font-semibold mt-12 mb-4">
                            {t("about.mission.title")}
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            {t("about.mission.description")}
                        </p>

                        <h2 className="text-2xl font-serif font-semibold mt-12 mb-4">
                            {t("about.story.title")}
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            {t("about.story.description")}
                        </p>

                        <div className="mt-12">
                            <a href="/signup">
                                <Button size="lg" className="gap-2">
                                    {t("landing.startFree")}
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
