'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/lib/auth-context'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                📋
              </div>
              <span className="text-xl font-bold text-gray-900">CLM System</span>
            </div>
            <div className="flex gap-4">
              <Link href="/login" className="px-6 py-2.5 rounded-lg text-indigo-600 hover:bg-indigo-50 font-medium transition">
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:shadow-lg transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Contract <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Lifecycle</span> Management
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Streamline your contract management process with our comprehensive CLM system. Track, manage, and optimize your contracts from creation to closure.
            </p>
            <div className="flex gap-4">
              <Link
                href="/register"
                className="px-8 py-3.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-xl transition"
              >
                Start Free Trial
              </Link>
              <Link
                href="/login"
                className="px-8 py-3.5 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:border-indigo-600 hover:text-indigo-600 transition"
              >
                Sign In
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">No credit card required • 14-day free trial</p>
          </div>

          {/* Right Visual */}
          <div className="relative">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-white/20 backdrop-blur rounded-lg p-4">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                  <span className="text-sm font-medium">Contracts on track</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                    <p className="text-3xl font-bold">524</p>
                    <p className="text-white/70 text-sm">Total Contracts</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                    <p className="text-3xl font-bold">89%</p>
                    <p className="text-white/70 text-sm">Approval Rate</p>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <p className="text-white/70 text-xs mb-2">Recent Activity</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>NDA Agreement</span>
                      <span className="text-emerald-400">✓</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Service Contract</span>
                      <span className="text-amber-400">⏳</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white/50 backdrop-blur py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600">Everything you need to manage contracts effectively</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '📄',
                title: 'Smart Templates',
                description: 'Pre-built templates for common contract types with customization options'
              },
              {
                icon: '🔍',
                title: 'Advanced Search',
                description: 'Find contracts instantly with powerful search and filtering capabilities'
              },
              {
                icon: '✅',
                title: 'Approval Workflows',
                description: 'Streamlined approval processes with multiple stakeholder support'
              },
              {
                icon: '📊',
                title: 'Analytics Dashboard',
                description: 'Real-time insights into your contract portfolio and performance metrics'
              },
              {
                icon: '🔐',
                title: 'Secure Storage',
                description: 'Enterprise-grade security with encryption and compliance standards'
              },
              {
                icon: '⚡',
                title: 'Lightning Fast',
                description: 'High-performance platform optimized for speed and reliability'
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          {[
            { number: '10K+', label: 'Active Users' },
            { number: '2M+', label: 'Contracts Managed' },
            { number: '99.9%', label: 'Uptime' },
            { number: '500+', label: 'Enterprise Clients' }
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {stat.number}
              </div>
              <p className="text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold mb-4">Ready to transform your contract management?</h2>
          <p className="text-lg text-white/90 mb-8">Join thousands of organizations using CLM System</p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 bg-white text-indigo-600 font-semibold rounded-lg hover:shadow-xl transition"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-white font-bold mb-4">CLM System</div>
              <p className="text-sm">Modern contract lifecycle management platform</p>
            </div>
            <div>
              <div className="text-white font-semibold mb-4">Product</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
              </ul>
            </div>
            <div>
              <div className="text-white font-semibold mb-4">Company</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <div className="text-white font-semibold mb-4">Legal</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2026 CLM System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}







