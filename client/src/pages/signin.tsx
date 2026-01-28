import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { SiGoogle } from "react-icons/si";
import { FaMicrosoft } from "react-icons/fa";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import flowliftLogoNew from "@assets/flowlift_logo_new.png";

export default function SignIn() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-0 md:p-4">
      <div className="max-w-3xl w-full flex flex-col md:flex-row bg-white md:rounded-[40px] overflow-hidden shadow-2xl min-h-screen md:min-h-[450px]">

        {/* Left Panel - Brand / Editorial */}
        <div className="w-full md:w-5/12 bg-primary p-8 md:p-12 flex flex-col justify-center text-white relative overflow-hidden min-h-[300px] md:min-h-auto">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-serif font-bold leading-[1.1] mb-6">
              {t("signin.rightPlace.title")}
            </h1>
            <p className="text-lg md:text-xl text-white/90 font-sans leading-relaxed">
              {t("signin.rightPlace.subtitle")}
            </p>
          </div>

          <div className="absolute bottom-8 md:bottom-12 left-8 md:left-12 z-10 transition-colors">
            <Link href="/">
              <div className="flex items-center gap-2 group cursor-pointer text-white/80 hover:text-white font-sans font-medium text-lg">
                <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                {t("common.back")}
              </div>
            </Link>
          </div>
        </div>

        {/* Right Panel - Action / Login */}
        <div className="md:w-7/12 p-8 md:p-12 flex flex-col items-center justify-center bg-white">
          <div className="w-full max-w-sm flex flex-col items-center">
            {/* Logo */}
            <img
              src={flowliftLogoNew}
              alt="flowlift"
              className="h-10 w-auto mb-12"
            />

            {/* Greeting */}
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-black mb-4">
              {t("signin.title")}
            </h2>
            <p className="text-base text-gray-500 text-center font-sans mb-12">
              {t("signin.subtitle")}
            </p>

            {/* Login Buttons */}
            <div className="w-full space-y-4">
              <a href="/auth/google" className="block">
                <Button
                  className="w-full h-14 rounded-full bg-[#1A1A1A] hover:bg-black text-white font-sans font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                  data-testid="button-signin-google"
                >
                  <SiGoogle className="h-5 w-5" />
                  {t("signin.google")}
                </Button>
              </a>

              <a href="/auth/microsoft" className="block">
                <Button
                  className="w-full h-14 rounded-full bg-[#5E5E5E] hover:bg-[#4A4A4A] text-white font-sans font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                  data-testid="button-signin-microsoft"
                >
                  <FaMicrosoft className="h-5 w-5" />
                  {t("signin.microsoft")}
                </Button>
              </a>
            </div>

            {/* Footer / Terms */}
            <div className="mt-12 text-center space-y-4">
              <p className="text-xs text-gray-400 font-sans leading-relaxed max-w-[280px]">
                {t("signin.termsAgreement")}
              </p>

              <div className="pt-4 border-t border-gray-100 w-full">
                <p className="text-sm text-gray-600 font-sans">
                  {t("signin.dontHaveAccount")}{" "}
                  <Link href="/signup">
                    <span className="text-primary font-bold hover:underline cursor-pointer">
                      {t("signin.signUp")}
                    </span>
                  </Link>
                </p>
              </div>
            </div>

            {/* Discreet Dev Login */}
            <div className="mt-8">
              <a href="/api/auth/dev" className="text-xs text-gray-300 hover:text-gray-400 transition-colors uppercase tracking-widest font-mono">
                {t("bookings.devLogin")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
