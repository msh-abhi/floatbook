import React, { useState, useEffect } from 'react';
import { BarChart2, Calendar, DollarSign, Users, TrendingUp, Download, DoorOpen, Percent, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

// ... (interfaces remain the same)

interface FinancialSummary {
  paid_revenue: number;
  unpaid_revenue: number;
  total_advance: number;
  total_due: number;
}

interface DiscountReport {
  discount_type: 'fixed' | 'percentage';
  booking_count: number;
  total_discounted: number;
}

interface OccupancyReport {
  occupancy_rate: number;
}

// ... (Reports component setup remains the same)

export function Reports() {
  const { companyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [roomStats, setRoomStats] = useState<RoomStat[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [discountReport, setDiscountReport] = useState<DiscountReport[]>([]);
  const [occupancyReport, setOccupancyReport] = useState<OccupancyReport | null>(null);
  
  // ... (date state management remains the same)

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

  // ... (calculateSummary and other helpers remain the same)
  
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header and Filters remain the same */}
      
      {loading ? (
        // ... (loading state remains the same)
      ) : (
        <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* ... (summary cards) ... */}
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
              {/* Daily Bookings Chart remains the same */}

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
                  </div>
              </div>
            </div>
        </>
      )}

    </div>
  );
}

export default Reports;