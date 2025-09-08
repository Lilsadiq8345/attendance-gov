import React from "react";

interface CircularProgressProps {
    steps: number;
    currentStep: number; // 1-based
    completedSteps: number;
    labels?: string[];
    colors?: string[]; // e.g. ["#3b82f6", "#f59e42", "#a78bfa"]
    size?: number;
}

const defaultColors = ["#3b82f6", "#f59e42", "#a78bfa"];

export const CircularProgress: React.FC<CircularProgressProps> = ({
    steps,
    currentStep,
    completedSteps,
    labels = [],
    colors = defaultColors,
    size = 96,
}) => {
    const radius = size / 2 - 10;
    const stroke = 8;
    const center = size / 2;
    const stepAngle = 360 / steps;
    const circumference = 2 * Math.PI * radius;

    // Helper to get arc for each step
    const getArc = (step: number) => {
        const startAngle = -90 + step * stepAngle;
        const endAngle = startAngle + stepAngle;
        const start = polarToCartesian(center, center, radius, endAngle);
        const end = polarToCartesian(center, center, radius, startAngle);
        const largeArcFlag = stepAngle > 180 ? 1 : 0;
        return [
            "M", start.x, start.y,
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
        ].join(" ");
    };

    function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
        const a = (angle * Math.PI) / 180.0;
        return {
            x: cx + r * Math.cos(a),
            y: cy + r * Math.sin(a),
        };
    }

    return (
        <div
            className="relative flex items-center justify-center"
            style={{ width: size, height: size }}
            aria-label="Biometric scan progress"
            role="progressbar"
            aria-valuenow={completedSteps}
            aria-valuemin={0}
            aria-valuemax={steps}
        >
            <svg width={size} height={size}>
                {/* Background track */}
                {[...Array(steps)].map((_, i) => (
                    <path
                        key={i}
                        d={getArc(i)}
                        stroke="#e5e7eb"
                        strokeWidth={stroke}
                        fill="none"
                    />
                ))}
                {/* Progress segments */}
                {[...Array(steps)].map((_, i) => (
                    <path
                        key={i}
                        d={getArc(i)}
                        stroke={
                            i < completedSteps
                                ? colors[i % colors.length]
                                : i === currentStep - 1
                                    ? colors[i % colors.length]
                                    : "#e5e7eb"
                        }
                        strokeWidth={stroke}
                        fill="none"
                        strokeLinecap="round"
                        opacity={i < completedSteps ? 1 : i === currentStep - 1 ? 0.7 : 0.3}
                    />
                ))}
            </svg>
            {/* Step labels/icons */}
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                    {labels[currentStep - 1] || `Step ${currentStep}`}
                </span>
            </div>
            {/* Dots/labels around the circle */}
            {[...Array(steps)].map((_, i) => {
                const angle = (-90 + i * stepAngle + stepAngle / 2) * (Math.PI / 180);
                const dotRadius = radius + 18;
                const x = center + dotRadius * Math.cos(angle);
                const y = center + dotRadius * Math.sin(angle);
                return (
                    <span
                        key={i}
                        className={`absolute text-xs font-medium select-none ${i < completedSteps
                            ? "text-primary"
                            : i === currentStep - 1
                                ? "text-blue-600"
                                : "text-gray-400"
                            }`}
                        style={{
                            left: x - 12,
                            top: y - 10,
                            width: 24,
                            textAlign: "center",
                        }}
                        aria-current={i === currentStep - 1 ? "step" : undefined}
                    >
                        {labels[i] || i + 1}
                    </span>
                );
            })}
        </div>
    );
}; 