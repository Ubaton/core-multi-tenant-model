
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Church, Users, Phone, Heart, DollarSign, BarChart3, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: Users,
    title: 'Member Management',
    description: 'Track and manage your congregation with detailed member profiles and engagement tracking.',
  },
  {
    icon: Phone,
    title: 'Call Center',
    description: 'Reach out to members and leads with integrated call logging and follow-up scheduling.',
  },
  {
    icon: Heart,
    title: 'Prayer Requests',
    description: 'Collect and manage prayer requests from members and visitors with status tracking.',
  },
  {
    icon: DollarSign,
    title: 'Offerings & Tithes',
    description: 'Record and track all financial contributions with detailed reporting.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Gain insights into church growth, engagement, and financial health.',
  },
  {
    icon: Shield,
    title: 'Multi-Tenant Security',
    description: 'Complete data isolation between churches with role-based access control.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Church className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Unity Fellowship Church</span>
          </div>
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
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
          Unity Fellowship Church
          <br />
          <span className="text-primary">Management System</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          A comprehensive multi-tenant platform for managing your church community, 
          from member engagement to financial stewardship.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" className="gap-2">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button size="lg" variant="outline">
            Learn More
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Powerful features designed specifically for church administration
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-gray-200 dark:border-gray-800">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
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
            <div className="flex items-center gap-2">
              <Church className="h-6 w-6 text-primary" />
              <span className="font-semibold">Unity Fellowship Church</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} Unity Fellowship Church. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}