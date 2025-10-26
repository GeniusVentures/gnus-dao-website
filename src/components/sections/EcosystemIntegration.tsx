'use client'

import { 
  Cpu, 
  Smartphone, 
  Monitor, 
  Gamepad2, 
  Wifi, 
  DollarSign,
  Users,
  Code,
  ArrowRight,
  Zap
} from 'lucide-react'

const ecosystemComponents = [
  {
    icon: Cpu,
    title: 'GPU Providers',
    description: 'Desktop and server GPU owners contributing compute power',
    stats: '12,847 active nodes',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Smartphone,
    title: 'Mobile Devices',
    description: 'Smartphones and tablets running AI workloads on-the-go',
    stats: '45,231 mobile GPUs',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: Gamepad2,
    title: 'Gaming Consoles',
    description: 'Xbox, PlayStation, and gaming PCs during idle time',
    stats: '8,934 gaming devices',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: Wifi,
    title: 'IoT Devices',
    description: 'Edge computing devices and smart home systems',
    stats: '23,156 IoT nodes',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: Code,
    title: 'AI Developers',
    description: 'Developers building and deploying AI applications',
    stats: '2,847 active developers',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  {
    icon: Users,
    title: 'Token Holders',
    description: 'GNUS token holders participating in governance',
    stats: '156.7M tokens distributed',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
]

const workflowSteps = [
  {
    step: 1,
    title: 'AI Task Request',
    description: 'Developers submit AI/ML workloads to the GNUS network',
    icon: Code,
  },
  {
    step: 2,
    title: 'Network Distribution',
    description: 'Tasks are distributed across available GPU nodes globally',
    icon: Wifi,
  },
  {
    step: 3,
    title: 'Compute Processing',
    description: 'Idle GPUs process AI workloads in parallel',
    icon: Cpu,
  },
  {
    step: 4,
    title: 'Validation & Rewards',
    description: 'Results are validated and GNUS tokens are distributed',
    icon: DollarSign,
  },
]

export function EcosystemIntegration() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 sm:text-4xl">
            The GNUS.AI Ecosystem
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            A global network of devices, developers, and token holders working together to democratize AI computing 
            through decentralized governance and fair reward distribution
          </p>
        </div>

        {/* Ecosystem Components */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {ecosystemComponents.map((component, index) => {
            const Icon = component.icon
            return (
              <div
                key={index}
                className="group relative p-6 rounded-xl border bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 ${component.bgColor} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-6 w-6 ${component.color}`} />
                </div>
                
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  {component.title}
                </h3>
                
                <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
                  {component.description}
                </p>

                <div className={`text-sm font-medium ${component.color}`}>
                  {component.stats}
                </div>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            )
          })}
        </div>

        {/* Workflow Section */}
        <div className="bg-muted/30 rounded-2xl p-8 mb-16">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold mb-4">How GNUS.AI Works</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From AI task submission to reward distribution, see how our decentralized network 
              processes workloads and compensates contributors
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={index} className="text-center relative">
                  {/* Step number */}
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                    {step.step}
                  </div>
                  
                  {/* Icon */}
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  
                  {/* Content */}
                  <h4 className="text-lg font-semibold mb-2">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  
                  {/* Arrow */}
                  {index < workflowSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-6 -right-4 text-muted-foreground">
                      <ArrowRight className="h-6 w-6" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Governance Integration */}
        <div className="text-center bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl p-8">
          <div className="max-w-3xl mx-auto">
            <div className="w-16 h-16 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-6">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            
            <h3 className="text-2xl font-bold mb-4">Democratic Governance</h3>
            <p className="text-lg text-muted-foreground mb-6">
              Every participant in the GNUS.AI ecosystem has a voice in shaping the network's future. 
              From GPU providers to AI developers, all stakeholders can propose and vote on network improvements, 
              reward structures, and technical upgrades using quadratic voting for fair representation.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors">
                Join the Network
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <button className="inline-flex items-center px-6 py-3 border border-input text-base font-medium rounded-lg bg-background hover:bg-accent transition-colors">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
