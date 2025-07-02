import React, { useState, useEffect } from 'react';
import { BarChart2, Calendar, DollarSign, Users, TrendingUp, Download, DoorOpen, Percent } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { ReportDailyStat, ReportRoomStat, ReportFinancialSummary, ReportDiscount, ReportOccupancy } from '../types';

type DatePreset = '7' | '30' | 'custom';

export function Reports() {
  const { companyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<ReportDailyStat[]>([]);
  const [roomStats, setRoomStats] = useState<ReportRoomStat[]>([]);
  const [financialSummary, setFinancialSummary] = useState<ReportFinancialSummary | null>(null);
  const [discountReport, setDiscountReport] = useState<ReportDiscount[]>([]);
  const [occupancyReport, setOccupancyReport] = useState<ReportOccupancy | null>(null);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    newCustomers: 0,
    totalRoomsBooked: 0,
  });
  const [datePreset, setDatePreset] = useState<DatePreset>('30');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (companyId) {
      fetchReportData();
    }
  }, [companyId, dateRange]);
  
  useEffect(() => {
    const today = new Date();
    let startDate = new Date();
    if (datePreset === '7') {
      startDate.setDate(today.getDate() - 7);
    } else if (datePreset === '30') {
      startDate.setDate(today.getDate() - 30);
    }
    
    if (datePreset !== 'custom') {
      setDateRange({
        start: startDate.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      });
    }
  }, [datePreset]);

  const fetchReportData = async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      const rpcPromises = [
        supabase.rpc('get_daily_booking_stats', { company_id_param: companyId, start_date: dateRange.start, end_date: dateRange.end }),
        supabase.rpc('get_room_stats', { company_id_param: companyId, start_date: dateRange.start, end_date: dateRange.end }),
        supabase.rpc('get_financial_summary', { company_id_param: companyId, start_date: dateRange.start, end_date: dateRange.end }),
        supabase.rpc('get_discount_report', { company_id_param: companyId, start_date: dateRange.start, end_date: dateRange.end }),
        supabase.rpc('get_occupancy_report', { company_id_param: companyId, start_date: dateRange.start, end_date: dateRange.end }),
      ];
      
      const [
        dailyStatsResult,
        roomStatsResult,
        financialSummaryResult,
        discountReportResult,
        occupancyReportResult
      ] = await Promise.all(rpcPromises);
      
      if (dailyStatsResult.error) throw dailyStatsResult.error;
      if (roomStatsResult.error) throw roomStatsResult.error;
      if (financialSummaryResult.error) throw financialSummaryResult.error;
      if (discountReportResult.error) throw discountReportResult.error;
      if (occupancyReportResult.error) throw occupancyReportResult.error;

      setDailyStats(dailyStatsResult.data || []);
      setRoomStats(roomStatsResult.data || []);
      setFinancialSummary(financialSummaryResult.data?.[0] || null);
      setDiscountReport(discountReportResult.data || []);
      setOccupancyReport(occupancyReportResult.data?.[0] || null);

      calculateSummary(dailyStatsResult.data || [], roomStatsResult.data || []);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (dailyData: ReportDailyStat[], roomData: ReportRoomStat[]) => {
    const summaryData = dailyData.reduce(
      (acc, day) => {
        acc.totalRevenue += day.total_revenue;
        acc.totalBookings += day.total_bookings;
        acc.newCustomers += day.new_customers;
        return acc;
      },
      { totalRevenue: 0, totalBookings: 0, newCustomers: 0 }
    );
    setSummary({
      ...summaryData,
      totalRoomsBooked: roomData.length
    });
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
        title: 'Total Rooms Booked',
        value: summary.totalRoomsBooked.toString(),
        icon: DoorOpen,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
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
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setDatePreset('7')} className={`px-4 py-2 rounded-lg text-sm font-medium ${datePreset === '7' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Last 7 Days</button>
            <button onClick={() => setDatePreset('30')} className={`px-4 py-2 rounded-lg text-sm font-medium ${datePreset === '30' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Last 30 Days</button>
            <button onClick={() => setDatePreset('custom')} className={`px-4 py-2 rounded-lg text-sm font-medium ${datePreset === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Custom</button>
          </div>
          {datePreset === 'custom' && (
            <>
              <div>
                <label htmlFor="start" className="sr-only">Start Date</label>
                <input type="date" name="start" id="start" value={dateRange.start} onChange={handleDateChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"/>
              </div>
              <div>
                <label htmlFor="end" className="sr-only">End Date</label>
                <input type="date" name="end" id="end" value={dateRange.end} onChange={handleDateChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"/>
              </div>
            </>
          )}
        </div>
      </div>
      
      {loading ? (
        <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-xl shadow-sm border h-32"></div>
                ))}
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border h-64"></div>
        </div>
      ) : (
        <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Occupancy Rate</p>
                        <p className="text-2xl font-bold text-gray-900">{occupancyReport?.occupancy_rate.toFixed(2) ?? 0}%</p>
                      </div>
                      <div className="bg-yellow-50 text-yellow-600 p-3 rounded-lg">
                        <TrendingUp className="h-6 w-6" />
                      </div>
                  </div>
                </div>
            </div>

            {/* Financial & Discount Reports */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                    Financial Summary
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <p className="text-gray-600">Paid Revenue</p>
                      <p className="font-semibold text-emerald-600">{formatCurrency(financialSummary?.paid_revenue || 0)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-gray-600">Unpaid Revenue</p>
                      <p className="font-semibold text-red-600">{formatCurrency(financialSummary?.unpaid_revenue || 0)}</p>
                    </div>
                    <hr/>
                    <div className="flex justify-between">
                      <p className="text-gray-600">Advance Paid</p>
                      <p className="font-semibold text-blue-600">{formatCurrency(financialSummary?.total_advance || 0)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-gray-600">Due Amount</p>
                      <p className="font-semibold text-orange-600">{formatCurrency(financialSummary?.total_due || 0)}</p>
                    </div>
                  </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <Percent className="h-5 w-5 text-cyan-600" />
                    Discount Report
                  </h2>
                  <div className="space-y-4">
                    {discountReport.map(item => (
                      <div key={item.discount_type} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800 capitalize">{item.discount_type}</p>
                          <p className="text-sm text-gray-500">{item.booking_count} discounted bookings</p>
                        </div>
                        <p className="font-semibold text-cyan-600">{formatCurrency(item.total_discounted)}</p>
                      </div>
                    ))}
                    {discountReport.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No discounts applied in this period.</p>
                    )}
                  </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Chart */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <BarChart2 className="h-5 w-5 text-blue-600" />
                  Daily Bookings
                  </h2>
                  <div className="h-80 flex items-end gap-2 border-b border-gray-200 pb-4">
                    {dailyStats.map(stat => (
                      <div key={stat.report_date} className="flex-1 flex flex-col justify-end items-center gap-2 group relative">
                        <div className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                          {stat.total_bookings}
                        </div>
                        <div 
                          className="w-full bg-blue-100 hover:bg-blue-200 rounded-t-lg transition-colors" 
                          style={{ height: `${(stat.total_bookings / Math.max(...dailyStats.map(s => s.total_bookings), 1)) * 100}%` }}>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-xs text-gray-500">{new Date(dateRange.start).toLocaleDateString()}</span>
                    <span className="text-xs text-gray-500">{new Date(dateRange.end).toLocaleDateString()}</span>
                  </div>
              </div>

              {/* Room Performance Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <DoorOpen className="h-5 w-5 text-indigo-600" />
                  Room Performance
                  </h2>
                  <div className="space-y-4">
                    {roomStats.map(room => (
                      <div key={room.room_name}>
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <p className="font-medium text-gray-800">{room.room_name}</p>
                            <p className="text-sm text-gray-500">{room.total_bookings} bookings</p>
                          </div>
                          <p className="font-semibold text-emerald-600">{formatCurrency(room.total_revenue)}</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                           <div className="bg-indigo-600 h-2.5 rounded-full" style={{width: `${(room.total_bookings / Math.max(...roomStats.map(r => r.total_bookings), 1)) * 100}%`}}></div>
                        </div>
                      </div>
                    ))}
                     {roomStats.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No room bookings in this period.</p>
                    )}
                  </div>
              </div>
            </div>
        </>
      )}
    </div>
  );
}

export default Reports;