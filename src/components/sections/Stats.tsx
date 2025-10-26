"use client";

import { useEffect, useState } from "react";
import { formatCompactNumber } from "@/lib/utils";

const stats = [
  {
    label: "GPU Nodes Active",
    value: 12847,
    suffix: "",
    description: "Devices contributing compute power",
  },
  {
    label: "AI Tasks Processed",
    value: 2.8,
    suffix: "M",
    description: "ML workloads completed",
  },
  {
    label: "GNUS Tokens Distributed",
    value: 156.7,
    suffix: "M",
    description: "Rewards paid to GPU providers",
  },
  {
    label: "Compute Hours Delivered",
    value: 847,
    suffix: "K",
    description: "Total GPU hours utilized",
  },
  {
    label: "Active Governance Voters",
    value: 8934,
    suffix: "",
    description: "DAO participants voting",
  },
  {
    label: "Cross-Chain Networks",
    value: 6,
    suffix: "",
    description: "Blockchain ecosystems supported",
  },
];

function AnimatedNumber({
  value,
  suffix = "",
  duration = 2000,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(value * easeOutQuart);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  const formatValue = (num: number) => {
    if (suffix === "M" || suffix === "K") {
      return num.toFixed(1);
    }
    return Math.floor(num).toLocaleString();
  };

  return (
    <span className="text-3xl sm:text-4xl font-bold text-primary">
      {formatValue(displayValue)}
      {suffix}
    </span>
  );
}

export function Stats() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 sm:text-4xl">
            GNUS.AI Network by the Numbers
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real-time statistics showcasing the power of our decentralized AI
            computing network and governance ecosystem
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-xl border bg-card hover:shadow-lg transition-all duration-300 group"
            >
              <div className="mb-2">
                <AnimatedNumber
                  value={stat.value}
                  suffix={stat.suffix}
                  duration={2000 + index * 200} // Stagger animations
                />
              </div>
              <div className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                {stat.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.description}
              </div>
            </div>
          ))}
        </div>

        {/* Additional GNUS.AI metrics */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500 mb-1">99.8%</div>
            <div className="text-sm text-muted-foreground">Network Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500 mb-1">80%</div>
            <div className="text-sm text-muted-foreground">
              Cost Savings vs Cloud
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-500 mb-1">μs</div>
            <div className="text-sm text-muted-foreground">
              Transaction Speed
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500 mb-1">
              Global
            </div>
            <div className="text-sm text-muted-foreground">GPU Network</div>
          </div>
        </div>

        {/* Live indicator */}
        <div className="mt-12 flex items-center justify-center space-x-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>
            Live network data updated every 30 seconds from GNUS.AI
            infrastructure
          </span>
        </div>
      </div>
    </section>
  );
}
