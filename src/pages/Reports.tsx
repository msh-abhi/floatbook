import React, { useState, useEffect } from 'react';
import { BarChart2, Calendar, DollarSign, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function Reports() {
  const { companyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    if (companyId) {
      // Fetch report data here
      setLoading(false);
    }
  }, [companyId]);

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="bg-white p-6 rounded-xl shadow-sm border h-64"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
          <p className="text-gray-600">Analyze your booking data and performance.</p>
        </div>
        {/* You can add a button to generate a new report */}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <BarChart2 className="h-5 w-5 text-blue-600" />
          Booking Insights
        </h2>
        {/* Add your reporting components here */}
        <p className="text-gray-500">
          Reporting features are under development. Soon, you will be able to see detailed analytics about your bookings, revenue, and more.
        </p>
      </div>
    </div>
  );
}

export default Reports;