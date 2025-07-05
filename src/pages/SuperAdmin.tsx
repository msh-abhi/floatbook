import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Company } from '../types';
import { Building2, ShieldCheck, Clock, Mail } from 'lucide-react';

export function SuperAdmin() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading tenants...</div>;
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-emerald-600" />
          Super Admin Panel
        </h1>
        <p className="text-slate-600">
          Manage all tenant companies on the platform.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">
          All Companies ({companies.length})
        </h2>
        <div className="space-y-4">
          {companies.map((company) => (
            <div key={company.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{company.name}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Joined on {new Date(company.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div>
                {/* You can add management buttons here, e.g., Edit, Delete, View Details */}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SuperAdmin;