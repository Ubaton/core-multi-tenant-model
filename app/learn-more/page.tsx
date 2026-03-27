'use client';

import Link from 'next/link';
import { Church, Users, Phone, Heart, DollarSign, BarChart3, Shield, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: Users,
    title: 'Member Management',
    description: 'Track and manage your congregation with detailed member profiles and engagement tracking.',
    highlights: [
      'Comprehensive member profiles with contact info and family relationships',
      'Track membership status, join dates, and engagement levels',
      'Custom fields for church-specific data',
      'Member search and filtering capabilities',
    ],
  },
  {
    icon: Phone,
    title: 'Call Center',
    description: 'Reach out to members and leads with integrated call logging and follow-up scheduling.',
    highlights: [
      'Log calls with detailed notes and outcomes',
      'Schedule follow-up calls and reminders',
      'Track lead conversion from first contact to membership',
      'Assign leads to team members for accountability',
    ],
  },
  {
    icon: Heart,
    title: 'Prayer Requests',
    description: 'Collect and manage prayer requests from members and visitors with status tracking.',
    highlights: [
      'Accept requests from members and anonymous visitors',
      'Mark requests as urgent for immediate attention',
      'Track prayer status: pending, in progress, answered',
      'Maintain confidentiality with access controls',
    ],
  },
  {
    icon: DollarSign,
    title: 'Offerings & Tithes',
    description: 'Record and track all financial contributions with detailed reporting.',
    highlights: [
      'Multiple giving types: tithe, offering, first fruit, special seed',
      'Support for various payment methods',
      'Member giving history and statements',
      'Financial summary and trend analysis',
    ],
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Gain insights into church growth, engagement, and financial health.',
    highlights: [
      'Real-time statistics on members, services, and giving',
      'Visual charts and graphs for trend analysis',
      'Exportable reports for leadership meetings',
      'Track growth metrics over time',
    ],
  },
  {
    icon: Shield,
    title: 'Multi-Tenant Security',
    description: 'Complete data isolation between churches with role-based access control.',
    highlights: [
      'Each church has completely isolated data',
      'Role-based permissions for staff and volunteers',
      'Granular module-level access control',
      'Audit trail for sensitive operations',
    ],
  },
];

const useCases = [
  {
    icon: Users,
    color: 'blue',
    title: 'Member Engagement & Retention',
    description: 'Track member attendance, follow up with absent members automatically, and maintain detailed profiles to build stronger relationships. Identify at-risk members and take proactive steps to keep your congregation engaged.',
  },
  {
    icon: Phone,
    color: 'green',
    title: 'Visitor Follow-Up & Outreach',
    description: 'Convert first-time visitors into active members with structured follow-up workflows. Log calls, schedule callbacks, and track the journey from visitor to fully integrated member of your church family.',
  },
  {
    icon: Heart,
    color: 'purple',
    title: 'Pastoral Care & Prayer Ministry',
    description: 'Manage prayer requests from members and visitors with confidentiality. Track prayer warriors, assign requests to prayer teams, and follow up when prayers are answered. Build a culture of care and spiritual support.',
  },
  {
    icon: DollarSign,
    color: 'yellow',
    title: 'Financial Stewardship & Reporting',
    description: 'Record tithes, offerings, and special contributions with ease. Generate giving statements, track trends over time, and maintain transparent financial records. Support multiple payment methods and categorize giving by type.',
  },
  {
    icon: BarChart3,
    color: 'orange',
    title: 'Data-Driven Decision Making',
    description: 'Access real-time analytics on church growth, attendance patterns, and financial health. Make informed decisions with visual dashboards and exportable reports. Identify trends and opportunities for ministry expansion.',
  },
  {
    icon: Shield,
    color: 'red',
    title: 'Multi-Church Network Management',
    description: 'Perfect for church networks and denominations. Each congregation operates independently with complete data isolation, while denominational leaders can access aggregate insights. Role-based permissions ensure the right access for every user.',
  },
];

const colorClasses: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-600 dark:text-blue-400' },
  green: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-600 dark:text-green-400' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-600 dark:text-purple-400' },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-600 dark:text-yellow-400' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-600 dark:text-orange-400' },
  red: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-600 dark:text-red-400' },
};

export default function LearnMorePage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Church className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Unity Fellowship Church</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
          Discover What Makes Us Different
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl">
          Unity Fellowship Church Management System is built specifically for churches, 
          by people who understand ministry. Explore our features and see how we can help 
          your church grow and thrive.
        </p>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Powerful Features
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Everything you need to manage your church effectively
          </p>
        </div>
        
        <div className="space-y-8">
          {features.map((feature, index) => (
            <Card key={feature.title} className="border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className={`grid md:grid-cols-2 gap-6 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                <CardHeader className="pb-0 md:pb-6">
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-2xl mb-2">{feature.title}</CardTitle>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 md:pt-6 md:border-l md:border-gray-100 md:dark:border-gray-800">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-4">
                    Key Highlights
                  </h4>
                  <ul className="space-y-3">
                    {feature.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="bg-gray-100 dark:bg-gray-900 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Real-World Use Cases
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              See how churches are using Unity Fellowship Church to streamline their operations and grow their ministry
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2">
            {useCases.map((useCase) => (
              <Card key={useCase.title} className="border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`h-10 w-10 rounded-full ${colorClasses[useCase.color].bg} flex items-center justify-center`}>
                      <useCase.icon className={`h-5 w-5 ${colorClasses[useCase.color].text}`} />
                    </div>
                    <CardTitle className="text-lg">{useCase.title}</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    {useCase.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Why Choose Unity Fellowship Church?
          </h2>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="text-center border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-5xl font-bold text-primary mb-2">100%</CardTitle>
              <CardDescription className="text-base">
                Built for Churches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Every feature is designed with church ministry in mind. No generic business tools adapted for churches.
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-5xl font-bold text-primary mb-2">24/7</CardTitle>
              <CardDescription className="text-base">
                Always Available
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Access your church data anytime, anywhere. Cloud-based system means no server maintenance for you.
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-5xl font-bold text-primary mb-2">∞</CardTitle>
              <CardDescription className="text-base">
                Unlimited Growth
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                From small congregations to mega churches, our system scales with your ministry.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Transform Your Church Management?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
              Join hundreds of churches already using Unity Fellowship Church to grow their ministry.
            </p>
            <Link href="/login">
              <Button size="lg" variant="secondary" className="gap-2">
                Get Started Today
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Church className="h-6 w-6 text-primary" />
              <span className="font-semibold">Unity Fellowship Church</span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} Unity Fellowship Church. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
