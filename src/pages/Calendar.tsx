import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Eye, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Booking, Room } from '../types';

export function Calendar() {
  const { companyId } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState<(Booking & { room: Room })[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    room_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    total_amount: '',
    discount_type: 'fixed' as 'fixed' | 'percentage',
    discount_value: '0',
    advance_paid: '0',
    referred_by: '',
    notes: '',
  });

  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId, currentMonth]);

  const fetchData = async () => {
    if (!companyId) return;

    try {
      setLoading(true);

      // Get start and end of current month view (including surrounding dates)
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const startDate = new Date(startOfMonth);
      startDate.setDate(startDate.getDate() - 7); // Include previous week
      const endDate = new Date(endOfMonth);
      endDate.setDate(endDate.getDate() + 7); // Include next week

      // Fetch bookings for the month
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          room:rooms(*)
        `)
        .eq('company_id', companyId)
        .gte('check_in_date', startDate.toISOString().split('T')[0])
        .lte('check_in_date', endDate.toISOString().split('T')[0]);

      if (bookingsError) throw bookingsError;

      // Fetch rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (roomsError) throw roomsError;

      setBookings(bookingsData || []);
      setRooms(roomsData || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push({
        date: prevDate.getDate(),
        isCurrentMonth: false,
        fullDate: prevDate.toISOString().split('T')[0],
      });
    }

    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date: day,
        isCurrentMonth: true,
        fullDate: date.toISOString().split('T')[0],
      });
    }

    // Add empty cells for days after the last day of the month
    const remainingCells = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingCells; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({
        date: day,
        isCurrentMonth: false,
        fullDate: nextDate.toISOString().split('T')[0],
      });
    }

    return days;
  };

  const getBookingsForDate = (dateString: string) => {
    return bookings.filter(booking => booking.check_in_date === dateString);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (dateString: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    setSelectedDate(dateString);
    setShowDateModal(true);
  };

  const handleCreateBooking = () => {
    if (!selectedDate) return;
    
    // Set check-out date to next day
    const checkInDate = new Date(selectedDate);
    checkInDate.setDate(checkInDate.getDate() + 1);
    const checkOutDate = checkInDate.toISOString().split('T')[0];
    
    setFormData({
      room_id: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      total_amount: '',
      discount_type: 'fixed',
      discount_value: '0',
      advance_paid: '0',
      referred_by: '',
      notes: '',
    });
    setShowDateModal(false);
    setShowBookingModal(true);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !selectedDate) return;

    try {
      const checkInDate = new Date(selectedDate);
      checkInDate.setDate(checkInDate.getDate() + 1);
      const checkOutDate = checkInDate.toISOString().split('T')[0];

      const bookingData = {
        company_id: companyId,
        room_id: formData.room_id,
        check_in_date: selectedDate,
        check_out_date: checkOutDate,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email || null,
        customer_phone: formData.customer_phone || null,
        total_amount: parseFloat(formData.total_amount),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        advance_paid: parseFloat(formData.advance_paid),
        referred_by: formData.referred_by || null,
        notes: formData.notes || null,
        is_paid: false,
      };

      const { error } = await supabase
        .from('bookings')
        .insert([bookingData]);

      if (error) throw error;

      setShowBookingModal(false);
      setSelectedDate(null);
      fetchData();
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Error creating booking. Please try again.');
    }
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const isToday = (dateString: string) => {
    return dateString === new Date().toISOString().split('T')[0];
  };

  const getBookingColorClass = (booking: Booking) => {
    if (booking.is_paid) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    } else {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const days = getDaysInMonth();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="grid grid-cols-7 gap-4 h-96">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="bg-gray-100 rounded h-20"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Calendar</h1>
          <p className="text-gray-600">View and manage your bookings by date.</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Calendar Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {formatMonthYear(currentMonth)}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-3 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-all shadow-sm"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-3 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-all shadow-sm"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 py-3 bg-gray-50 rounded-lg">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              const dayBookings = getBookingsForDate(day.fullDate);
              const availableRooms = rooms.length - dayBookings.length;
              
              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(day.fullDate, day.isCurrentMonth)}
                  className={`min-h-[120px] p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                    day.isCurrentMonth
                      ? 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      : 'bg-gray-50 border-gray-100 text-gray-400'
                  } ${
                    isToday(day.fullDate)
                      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-lg font-semibold ${
                      isToday(day.fullDate) ? 'text-blue-700' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {day.date}
                    </span>
                    {day.isCurrentMonth && availableRooms > 0 && (
                      <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full font-medium">
                        {availableRooms} free
                      </span>
                    )}
                  </div>
                  
                  {day.isCurrentMonth && (
                    <div className="space-y-1">
                      {dayBookings.slice(0, 2).map((booking) => (
                        <div
                          key={booking.id}
                          className={`text-xs p-2 rounded-lg truncate font-medium border ${getBookingColorClass(booking)}`}
                        >
                          {booking.customer_name}
                        </div>
                      ))}
                      {dayBookings.length > 2 && (
                        <div className="text-xs text-gray-500 font-medium">
                          +{dayBookings.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Date Details Modal */}
      {showDateModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
                <button
                  onClick={() => setShowDateModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {getBookingsForDate(selectedDate).length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No bookings for this date</h4>
                  <p className="text-gray-600 mb-6">Would you like to create a new booking?</p>
                  <button
                    onClick={handleCreateBooking}
                    disabled={rooms.length === 0}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                  >
                    <Plus className="h-5 w-5" />
                    Create Booking
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">
                      {getBookingsForDate(selectedDate).length} Booking{getBookingsForDate(selectedDate).length !== 1 ? 's' : ''}
                    </h4>
                    <button
                      onClick={handleCreateBooking}
                      disabled={rooms.length === 0}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                      Add Booking
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {getBookingsForDate(selectedDate).map((booking) => (
                      <div key={booking.id} className={`flex items-center justify-between p-4 rounded-lg border ${getBookingColorClass(booking)}`}>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{booking.customer_name}</p>
                          <p className="text-sm text-gray-600">{booking.room?.name}</p>
                          {booking.customer_email && (
                            <p className="text-sm text-gray-500">{booking.customer_email}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            {formatCurrency(Number(booking.total_amount))}
                          </p>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            booking.is_paid 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {booking.is_paid ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Booking Creation Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                Create Booking for {new Date(selectedDate!).toLocaleDateString()}
              </h2>
            </div>

            <form onSubmit={handleSubmitBooking} className="p-6 space-y-4">
              <div>
                <label htmlFor="room_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Room *
                </label>
                <select
                  id="room_id"
                  value={formData.room_id}
                  onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Select a room</option>
                  {rooms
                    .filter(room => !getBookingsForDate(selectedDate!).some(b => b.room_id === room.id))
                    .map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} - ${room.price}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  id="customer_name"
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label htmlFor="customer_email" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Email
                </label>
                <input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="customer@email.com"
                />
              </div>

              <div>
                <label htmlFor="referred_by" className="block text-sm font-medium text-gray-700 mb-1">
                  Referred By
                </label>
                <input
                  id="referred_by"
                  type="text"
                  value={formData.referred_by}
                  onChange={(e) => setFormData({ ...formData, referred_by: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Who referred this customer?"
                />
              </div>

              <div>
                <label htmlFor="total_amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Total Price *
                </label>
                <input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_amount}
                  onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(false);
                    setSelectedDate(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Create Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}