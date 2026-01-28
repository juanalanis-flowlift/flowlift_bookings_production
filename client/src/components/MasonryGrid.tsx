import { ReactNode, useEffect, useRef, useState } from "react";

interface MasonryGridProps {
    children: ReactNode[];
    columnCount?: {
        mobile?: number;
        tablet?: number;
        desktop?: number;
    };
    gap?: number;
    className?: string;
}

export function MasonryGrid({
    children,
    columnCount = { mobile: 2, tablet: 3, desktop: 4 },
    gap = 16,
    className = ""
}: MasonryGridProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [columns, setColumns] = useState<ReactNode[][]>([]);

    useEffect(() => {
        const updateColumns = () => {
            if (!containerRef.current) return;

            const width = containerRef.current.offsetWidth;
            let cols = columnCount.mobile || 2;

            if (width >= 1024) {
                cols = columnCount.desktop || 4;
            } else if (width >= 640) {
                cols = columnCount.tablet || 3;
            }

            const newColumns: ReactNode[][] = Array.from({ length: cols }, () => []);

            children.forEach((child, index) => {
                const columnIndex = index % cols;
                newColumns[columnIndex].push(child);
            });

            setColumns(newColumns);
        };

        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, [children, columnCount]);

    return (
        <div
            ref={containerRef}
            className={`flex ${className}`}
            style={{ gap: `${gap}px` }}
        >
            {columns.map((column, columnIndex) => (
                <div
                    key={columnIndex}
                    className="flex-1 flex flex-col"
                    style={{ gap: `${gap}px` }}
                >
                    {column}
                </div>
            ))}
        </div>
    );
}
