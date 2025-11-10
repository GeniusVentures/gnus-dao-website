"use client";

import {
  Vote,
  Coins,
  Shield,
  Network,
  BarChart3,
  Users,
  Zap,
  Lock,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: Vote,
    title: "Democratic AI Governance",
    description:
      "Quadratic voting ensures fair governance of AI infrastructure, preventing centralization while enabling community-driven decisions on network upgrades and GPU provider incentives.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Zap,
    title: "Lightning-Fast Processing",
    description:
      "Microsecond transaction speeds on our hybrid blockchain enable real-time AI task execution and instant governance decisions without bottlenecks.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Network,
    title: "Cross-Platform AI Network",
    description:
      "Seamlessly distribute AI workloads across Windows, macOS, Linux, Android, iOS, Xbox, PlayStation, and IoT devices with unified governance.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Diamond pattern smart contracts with enterprise-grade security for AI workload distribution, encrypted data processing, and secure GPU provider validation.",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: Coins,
    title: "GNUS Token Economics",
    description:
      "Transparent token distribution with 80% to GPU providers and developers, 10% network maintenance, and 10% burned for scarcity.",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    icon: BarChart3,
    title: "AI Network Analytics",
    description:
      "Real-time insights into GPU utilization, AI task completion rates, network performance, and compute cost optimization across the global infrastructure.",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
  {
    icon: Users,
    title: "GPU Provider Rewards",
    description:
      "Every GPU provider earns GNUS tokens for contributing compute power. Democratic governance ensures fair reward distribution and network growth.",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    icon: Lock,
    title: "Secure AI Processing",
    description:
      "End-to-end encryption for AI workloads with SIWE authentication, ensuring data privacy while leveraging distributed computing power.",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    icon: Globe,
    title: "Mobile-First AI",
    description:
      "Revolutionary mobile AI processing that leverages smartphone GPUs for distributed computing, making AI accessible on any device, anywhere.",
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
  },
];

export function Features() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 sm:text-4xl">
            Decentralized AI Computing Features
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Harness the power of distributed GPUs worldwide with democratic
            governance and fair reward distribution
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative p-6 rounded-xl border bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <Icon className={`h-6 w-6 ${feature.color}`} />
                </div>

                <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>

                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-4">
            Ready to join the world's largest decentralized AI computing
            network?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors">
              Start Contributing GPU Power
            </button>
            <button className="inline-flex items-center px-6 py-3 border border-input text-base font-medium rounded-lg bg-background hover:bg-accent transition-colors">
              Learn About GNUS.AI
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
