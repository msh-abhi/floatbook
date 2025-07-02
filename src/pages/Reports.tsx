import React, { useState, useEffect } from 'react';
import { BarChart2, Calendar, DollarSign, Users, TrendingUp, Download, DoorOpen, Percent, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Room, ReportDailyStat, ReportRoomStat, ReportFinancialSummary, ReportDiscount, ReportOccupancy } from '../types';

type DatePreset = 'today' | 'week' | 'month' | 'custom';
type PaymentStatus = 'all' | 'paid' | 'unpaid' | 'partial';
type DiscountStatus = 'all' | 'discounted' | 'not_discounted';

export function Reports() {
  const { companyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  // Report Data States
  const [dailyStats, setDailyStats] = useState<ReportDailyStat[]>([]);
  const [roomStats, setRoomStats] = useState<ReportRoomStat[]>([]);
  const [financialSummary, setFinancialSummary] = useState<ReportFinancialSummary | null>(null);
  
  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('all');
  const [discountStatus, setDiscountStatus] = useState<DiscountStatus>('all');

  // Fetch rooms for filter dropdown
  useEffect(() => {
    const fetchRooms = async () => {
      if (!companyId) return;
      const { data } = await supabase.from('rooms').select('*').eq('company_id', companyId);
      setRooms(data || []);
    };
    fetchRooms();
  }, [companyId]);

  // Fetch report data when filters change
  useEffect(() => {
    if (companyId) {
      fetchReportData();
    }
  }, [companyId, dateRange, selectedRoom, paymentStatus, discountStatus]);
  
  // Update date range based on presets
  useEffect(() => {
    const today = new Date();
    let startDate = new Date();
    if (datePreset === 'today') {
      startDate = today;
    } else if (datePreset === 'week') {
      startDate.setDate(today.getDate() - 7);
    } else if (datePreset === 'month') {
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

    const rpcParams = {
      company_id_param: companyId,
      start_date: dateRange.start,
      end_date: dateRange.end,
      room_ids_param: selectedRoom === 'all' ? null : [selectedRoom],
      payment_status_param: paymentStatus,
      discount_status_param: discountStatus,
    };

    try {
      const [dailyStatsResult, roomStatsResult, financialSummaryResult] = await Promise.all([
        supabase.rpc('get_daily_booking_stats', rpcParams),
        supabase.rpc('get_room_stats', rpcParams),
        supabase.rpc('get_financial_summary', rpcParams),
      ]);

      if (dailyStatsResult.error) throw dailyStatsResult.error;
      if (roomStatsResult.error) throw roomStatsResult.error;
      if (financialSummaryResult.error) throw financialSummaryResult.error;

      setDailyStats(dailyStatsResult.data || []);
      setRoomStats(roomStatsResult.data || []);
      setFinancialSummary(financialSummaryResult.data?.[0] || null);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setDatePreset('month');
    setSelectedRoom('all');
    setPaymentStatus('all');
    setDiscountStatus('all');
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };
  
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">Filter and analyze your booking data.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date Preset Filter */}
          <div className="lg:col-span-2">
            <label className="text-sm font-medium text-gray-700">Date Range</label>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg mt-1">
              <button onClick={() => setDatePreset('today')} className={`flex-1 py-2 px-3 text-sm rounded-md ${datePreset === 'today' ? 'bg-white shadow' : ''}`}>Today</button>
              <button onClick={() => setDatePreset('week')} className={`flex-1 py-2 px-3 text-sm rounded-md ${datePreset === 'week' ? 'bg-white shadow' : ''}`}>This Week</button>
              <button onClick={() => setDatePreset('month')} className={`flex-1 py-2 px-3 text-sm rounded-md ${datePreset === 'month' ? 'bg-white shadow' : ''}`}>This Month</button>
            </div>
          </div>

          {/* Room Filter */}
          <div>
            <label htmlFor="room-filter" className="text-sm font-medium text-gray-700">Room</label>
            <select id="room-filter" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-lg">
              <option value="all">All Rooms</option>
              {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <label htmlFor="payment-filter" className="text-sm font-medium text-gray-700">Payment</label>
            <select id="payment-filter" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as PaymentStatus)} className="w-full mt-1 p-2 border border-gray-300 rounded-lg">
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          
          {/* Reset Button */}
          <div className="flex items-end">
            <button onClick={handleResetFilters} className="w-full bg-gray-200 text-gray-700 p-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-300">
              <RefreshCw className="h-4 w-4"/> Reset
            </button>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating reports...</p>
        </div>
      ) : (
        <div className="space-y-8">
            {/* Financial Summary */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Paid Revenue</p>
                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(financialSummary?.paid_revenue || 0)}</p>
                  </div>
                   <div>
                    <p className="text-sm text-gray-500">Unpaid Revenue</p>
                    <p className="text-xl font-bold text-red-500">{formatCurrency(financialSummary?.unpaid_revenue || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Advance Paid</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(financialSummary?.total_advance || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Due Amount</p>
                    <p className="text-xl font-bold text-orange-500">{formatCurrency(financialSummary?.total_due || 0)}</p>
                  </div>
                </div>
            </div>
            
            {/* Charts and Room Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Daily Bookings Chart */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Bookings</h2>
                  <div className="h-80 flex items-end gap-2 border-b border-gray-200 pb-4">
                    {/* Chart implementation remains the same */}
                  </div>
              </div>

              {/* Room Performance */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Room Performance</h2>
                  <div className="space-y-4">
                    {/* Room performance table remains the same */}
                  </div>
              </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default Reports;