import React, { useState, useEffect } from 'react';
import { Building2, Users, Calendar, CircleDollarSign, TrendingUp, Crown, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PlatformStats, CompanyWithStats } from '../types';
import { formatCurrency } from '../utils/currency';

export function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats>({
    total_companies: 0,
    total_users: 0,
    total_bookings: 0,
    total_revenue: 0,
    active_subscriptions: 0,
  });
  const [recentCompanies, setRecentCompanies] = useState<CompanyWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch platform statistics
      const [
        { count: totalCompanies },
        { count: totalUsers },
        { count: totalBookings },
        { data: revenueData },
        { count: activeSubscriptions },
        { data: companiesData }
      ] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('total_amount'),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase
          .from('companies')
          .select(`
            *,
            subscriptions(*)
          `)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const totalRevenue = revenueData?.reduce((sum, booking) => sum + Number(booking.total_amount), 0) || 0;

      setStats({
        total_companies: totalCompanies || 0,
        total_users: totalUsers || 0,
        total_bookings: totalBookings || 0,
        total_revenue: totalRevenue,
        active_subscriptions: activeSubscriptions || 0,
      });

      // Fetch recent companies with stats
      if (companiesData) {
        const companiesWithStats = await Promise.all(
          companiesData.map(async (company) => {
            const [
              { count: bookingCount },
              { data: bookingRevenue },
              { count: userCount }
            ] = await Promise.all([
              supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
              supabase.from('bookings').select('total_amount').eq('company_id', company.id),
              supabase.from('company_users').select('*', { count: 'exact', head: true }).eq('company_id', company.id)
            ]);

            const revenue = bookingRevenue?.reduce((sum, booking) => sum + Number(booking.total_amount), 0) || 0;

            return {
              ...company,
              total_bookings: bookingCount || 0,
              total_revenue: revenue,
              user_count: userCount || 0,
              subscription: company.subscriptions?.[0] || null
            };
          })
        );

        setRecentCompanies(companiesWithStats);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Companies',
      value: stats.total_companies.toString(),
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Users',
      value: stats.total_users.toString(),
      icon: Users,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Total Bookings',
      value: stats.total_bookings.toString(),
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Platform Revenue',
      value: formatCurrency(stats.total_revenue, 'USD'),
      icon: CircleDollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Active Subscriptions',
      value: stats.active_subscriptions.toString(),
      icon: Crown,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ];

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Platform Overview</h1>
            <p className="text-slate-600">Monitor and manage your entire FloatBook platform</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Companies */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-600" />
            Recent Companies
          </h2>
        </div>
        <div className="p-6">
          {recentCompanies.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-slate-500">No companies registered yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentCompanies.map((company) => (
                <div key={company.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <Building2 className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{company.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>{company.user_count} users</span>
                        <span>{company.total_bookings} bookings</span>
                        <span>{formatCurrency(company.total_revenue, company.currency || 'USD')} revenue</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      company.subscription?.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {company.subscription?.plan_name || 'free'} plan
                    </span>
                    <span className="text-sm text-slate-500">
                      {new Date(company.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}