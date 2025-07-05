import React, { useState, useEffect } from 'react';
import { Building2, Users, Calendar, CircleDollarSign, Search, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CompanyWithStats } from '../types';
import { formatCurrency } from '../utils/currency';

export function SuperAdminCompanies() {
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithStats | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);

      const { data: companiesData, error } = await supabase
        .from('companies')
        .select(`
          *,
          subscriptions(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch stats for each company
      const companiesWithStats = await Promise.all(
        (companiesData || []).map(async (company) => {
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

      setCompanies(companiesWithStats);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewDetails = (company: CompanyWithStats) => {
    setSelectedCompany(company);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Company Management</h1>
          <p className="text-slate-600">Monitor and manage all companies on the platform.</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 p-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Companies List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-600" />
            Companies ({filteredCompanies.length})
          </h2>
        </div>
        <div className="p-6">
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-slate-500">No companies found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCompanies.map((company) => (
                <div key={company.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border hover:shadow-md transition-shadow">
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
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{company.user_count} users</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{company.total_bookings} bookings</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CircleDollarSign className="h-3 w-3" />
                          <span>{formatCurrency(company.total_revenue, company.currency || 'USD')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      company.subscription?.status === 'active'
                        ? company.subscription.plan_name === 'pro'
                          ? 'bg-purple-100 text-purple-800'
                          : company.subscription.plan_name === 'basic'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {company.subscription?.plan_name || 'free'}
                    </span>
                    <span className="text-sm text-slate-500">
                      {new Date(company.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleViewDetails(company)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Company Detail Modal */}
      {showDetailModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    {selectedCompany.logo_url ? (
                      <img src={selectedCompany.logo_url} alt={selectedCompany.name} className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <Building2 className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{selectedCompany.name}</h2>
                    <p className="text-slate-600">Company Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Company ID</p>
                  <p className="text-slate-900 font-mono text-sm">{selectedCompany.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Created</p>
                  <p className="text-slate-900">{new Date(selectedCompany.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Currency</p>
                  <p className="text-slate-900">{selectedCompany.currency || 'USD'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Address</p>
                  <p className="text-slate-900">{selectedCompany.address || 'Not provided'}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Users</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{selectedCompany.user_count}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">Bookings</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-900">{selectedCompany.total_bookings}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CircleDollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Revenue</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(selectedCompany.total_revenue, selectedCompany.currency || 'USD')}
                  </p>
                </div>
              </div>

              {/* Subscription */}
              {selectedCompany.subscription && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Subscription</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">Plan</p>
                      <p className="text-slate-900 capitalize font-semibold">{selectedCompany.subscription.plan_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">Status</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedCompany.subscription.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedCompany.subscription.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}