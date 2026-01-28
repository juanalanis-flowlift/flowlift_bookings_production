import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { SiGoogle } from "react-icons/si";
import { FaMicrosoft } from "react-icons/fa";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import flowliftLogoNew from "@assets/flowlift_logo_new.png";

export default function SignUp() {
    const { t } = useI18n();

    return (
        <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-0 md:p-4">
            <div className="max-w-4xl w-full flex flex-col md:flex-row bg-white md:rounded-[40px] overflow-hidden shadow-2xl min-h-screen md:min-h-[600px]">

                {/* Left Panel - Brand / Editorial */}
                <div className="w-full md:w-5/12 bg-primary p-10 md:p-14 flex flex-col justify-center text-white relative overflow-hidden min-h-[400px] md:min-h-auto">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10 space-y-8">
                        <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight max-w-[280px]">
                            {t("signin.rightPlace.title")}
                        </h1>
                        <p className="text-lg md:text-xl text-white/90 font-sans leading-relaxed max-w-[320px]">
                            {t("signin.rightPlace.subtitle")}
                        </p>
                    </div>

                    <div className="absolute bottom-10 md:bottom-14 left-10 md:left-14 z-10 transition-colors">
                        <Link href="/">
                            <div className="flex items-center gap-2 group cursor-pointer text-white/90 hover:text-white font-sans font-medium text-lg">
                                <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                                {t("common.back")}
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Right Panel - Action / Login */}
                <div className="md:w-7/12 p-8 md:p-14 flex flex-col items-center justify-between bg-white overflow-y-auto">
                    <div className="w-full max-w-sm flex flex-col items-center flex-grow justify-center">
                        {/* Logo */}
                        <div className="mb-12">
                            <img
                                src={flowliftLogoNew}
                                alt="flowlift"
                                className="h-10 w-auto"
                            />
                        </div>

                        {/* Greeting */}
                        <div className="text-center mb-10">
                            <h2 className="text-5xl md:text-6xl font-serif font-bold text-black mb-4 tracking-tight">
                                {t("signin.hello.title")}
                            </h2>
                            <p className="text-base text-gray-500 font-sans px-4 leading-relaxed">
                                {t("signin.hello.subtitle")}
                            </p>
                        </div>

                        {/* Registration Buttons */}
                        <div className="w-full space-y-4 mb-10">
                            <a href="/auth/google" className="block">
                                <Button
                                    className="w-full h-14 rounded-full bg-[#1A1A1A] hover:bg-black text-white font-sans font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-md"
                                    data-testid="button-signin-google"
                                >
                                    <SiGoogle className="h-5 w-5" />
                                    {t("signin.signUpGoogle")}
                                </Button>
                            </a>

                            <a href="/auth/microsoft" className="block">
                                <Button
                                    className="w-full h-14 rounded-full bg-[#5E5E5E] hover:bg-[#4A4A4A] text-white font-sans font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-md"
                                    data-testid="button-signin-microsoft"
                                >
                                    <FaMicrosoft className="h-5 w-5" />
                                    {t("signin.signUpMicrosoft")}
                                </Button>
                            </a>
                        </div>

                        {/* Footer / Terms */}
                        <div className="text-center space-y-6 w-full">
                            <p className="text-xs text-gray-400 font-sans leading-relaxed max-w-[320px] mx-auto opacity-80">
                                {t("signin.termsAgreement")}
                            </p>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-gray-100"></div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <p className="text-base text-gray-600 font-sans">
                                    {t("signin.alreadyHaveAccount")} {" "}
                                    <Link href="/signin">
                                        <span className="text-primary font-bold hover:underline cursor-pointer">
                                            {t("signin.logIn")}
                                        </span>
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Discreet Dev Login */}
                    <div className="mt-12">
                        <a href="/api/auth/dev" className="text-[10px] text-gray-300 hover:text-gray-400 transition-colors uppercase tracking-[0.2em] font-mono font-medium">
                            DEV LOGIN (BYPASS)
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
