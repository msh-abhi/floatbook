import React, { useState, useEffect } from 'react';
import { BarChart2, Calendar, DollarSign, Users, TrendingUp, Download } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface DailyStat {
  report_date: string;
  total_bookings: number;
  total_revenue: number;
  new_customers: number;
}

export function Reports() {
  const { companyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<DailyStat[]>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    newCustomers: 0,
  });
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (companyId) {
      fetchReportData();
    }
  }, [companyId, dateRange]);

  const fetchReportData = async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('get_daily_booking_stats', {
        company_id_param: companyId,
        start_date: dateRange.start,
        end_date: dateRange.end,
      });

      if (error) throw error;

      setReportData(data || []);
      calculateSummary(data || []);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data: DailyStat[]) => {
    const summaryData = data.reduce(
      (acc, day) => {
        acc.totalRevenue += day.total_revenue;
        acc.totalBookings += day.total_bookings;
        acc.newCustomers += day.new_customers;
        return acc;
      },
      { totalRevenue: 0, totalBookings: 0, newCustomers: 0 }
    );
    setSummary(summaryData);
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  const summaryCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(summary.totalRevenue),
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Total Bookings',
      value: summary.totalBookings.toString(),
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'New Customers',
      value: summary.newCustomers.toString(),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
          <p className="text-gray-600">Analyze your booking data and performance.</p>
        </div>
        <button
          className="bg-gray-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 self-start"
        >
          <Download className="h-5 w-5" />
          Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-4">
          <div>
            <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" name="start" id="start" value={dateRange.start} onChange={handleDateChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"/>
          </div>
          <div>
            <label htmlFor="end" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input type="date" name="end" id="end" value={dateRange.end} onChange={handleDateChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"/>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border h-32"></div>
                ))}
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border h-64"></div>
        </div>
      ) : (
        <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                    <div key={card.title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                            <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                            </div>
                            <div className={`${card.bgColor} ${card.color} p-3 rounded-lg`}>
                            <Icon className="h-6 w-6" />
                            </div>
                        </div>
                    </div>
                );
                })}
            </div>
            
            {/* Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <BarChart2 className="h-5 w-5 text-blue-600" />
                Daily Bookings
                </h2>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">Chart will be displayed here</p>
                </div>
            </div>
        </>
      )}

    </div>
  );
}

export default Reports;