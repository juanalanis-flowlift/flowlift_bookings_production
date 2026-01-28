import { ReactNode, useState } from "react";

interface PinCardProps {
    image: string;
    title: string;
    subtitle?: string;
    onClick?: () => void;
    className?: string;
    aspectRatio?: "auto" | "square" | "portrait" | "landscape";
}

export function PinCard({
    image,
    title,
    subtitle,
    onClick,
    className = "",
    aspectRatio = "auto"
}: PinCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const aspectRatioClass = {
        auto: "",
        square: "aspect-square",
        portrait: "aspect-[3/4]",
        landscape: "aspect-[4/3]"
    }[aspectRatio];

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-200 ease-out hover:scale-[1.02] ${className}`}
            style={{
                boxShadow: isHovered
                    ? "0 12px 24px rgba(0, 0, 0, 0.15)"
                    : "0 2px 8px rgba(0, 0, 0, 0.1)"
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            {/* Image */}
            <div className={`relative bg-muted ${aspectRatioClass}`}>
                <img
                    src={image}
                    alt={title}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"
                        }`}
                    onLoad={() => setImageLoaded(true)}
                    loading="lazy"
                />

                {/* Loading skeleton */}
                {!imageLoaded && (
                    <div className="absolute inset-0 bg-muted animate-pulse" />
                )}

                {/* Hover overlay */}
                <div
                    className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0"
                        }`}
                >
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white">
                        <h3 className="text-lg md:text-xl font-semibold text-center mb-1">
                            {title}
                        </h3>
                        {subtitle && (
                            <p className="text-sm text-white/90 text-center">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
