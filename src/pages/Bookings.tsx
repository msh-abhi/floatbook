import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit, Trash2, Calendar, User, Mail, Phone, CheckCircle, Clock, DollarSign, Percent, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { Booking, Room } from '../types';
import { formatCurrency } from '../utils/currency';

export function Bookings() {
  const { companyId } = useAuth();
  const { company } = useCompany(companyId);
  const [bookings, setBookings] = useState<(Booking & { room: Room })[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [formData, setFormData] = useState({
    room_id: '',
    check_in_date: '',
    check_out_date: '',
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
  }, [companyId]);

  // Auto-calculate check_out_date when check_in_date changes
  useEffect(() => {
    if (formData.check_in_date && !editingBooking) {
      const checkInDate = new Date(formData.check_in_date);
      checkInDate.setDate(checkInDate.getDate() + 1);
      const checkOutDate = checkInDate.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, check_out_date: checkOutDate }));
    }
  }, [formData.check_in_date, editingBooking]);

  const fetchData = async () => {
    if (!companyId) return;

    try {
      // Fetch bookings with room data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`*, room:rooms(*)`)
        .eq('company_id', companyId)
        .order('check_in_date', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Fetch rooms for the form
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (roomsError) throw roomsError;

      setBookings(bookingsData || []);
      setRooms(roomsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDueAmount = () => {
    const total = parseFloat(formData.total_amount) || 0;
    const discountValue = parseFloat(formData.discount_value) || 0;
    const advancePaid = parseFloat(formData.advance_paid) || 0;
    
    let discount = 0;
    if (formData.discount_type === 'percentage') {
      discount = (total * discountValue) / 100;
    } else {
      discount = discountValue;
    }
    
    return Math.max(0, total - discount - advancePaid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      const bookingData = {
        company_id: companyId,
        room_id: formData.room_id,
        check_in_date: formData.check_in_date,
        check_out_date: formData.check_out_date,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email || null,
        customer_phone: formData.customer_phone || null,
        total_amount: parseFloat(formData.total_amount),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        advance_paid: parseFloat(formData.advance_paid),
        referred_by: formData.referred_by || null,
        notes: formData.notes || null,
        is_paid: false, // Default to unpaid
      };

      if (editingBooking) {
        const { error } = await supabase
          .from('bookings')
          .update(bookingData)
          .eq('id', editingBooking.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bookings')
          .insert([bookingData]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingBooking(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving booking:', error);
      alert('Error saving booking. Please try again.');
    }
  };

  const handleEdit = (booking: Booking & { room: Room }) => {
    setEditingBooking(booking);
    setFormData({
      room_id: booking.room_id,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email || '',
      customer_phone: booking.customer_phone || '',
      total_amount: booking.total_amount.toString(),
      discount_type: booking.discount_type || 'fixed',
      discount_value: booking.discount_value?.toString() || '0',
      advance_paid: booking.advance_paid?.toString() || '0',
      referred_by: booking.referred_by || '',
      notes: booking.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting booking:', error);
    }
  };

  const togglePaymentStatus = async (booking: Booking) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ is_paid: !booking.is_paid })
        .eq('id', booking.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      room_id: '',
      check_in_date: '',
      check_out_date: '',
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
  };

  const openModal = () => {
    setEditingBooking(null);
    resetForm();
    setShowModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateRange = (checkIn: string, checkOut: string) => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (checkInDate.toDateString() === checkOutDate.toDateString()) {
      return formatDate(checkIn);
    }
    
    return `${formatDate(checkIn)} - ${formatDate(checkOut)}`;
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="space-y-4">
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bookings</h1>
          <p className="text-gray-600">Manage your room bookings and customer information.</p>
        </div>
        <button
          onClick={openModal}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          New Booking
        </button>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first booking.</p>
          <button
            onClick={openModal}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Create Your First Booking
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{booking.customer_name}</h3>
                      <p className="text-sm text-gray-600">{booking.room?.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatDateRange(booking.check_in_date, booking.check_out_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePaymentStatus(booking)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        booking.is_paid
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      }`}
                    >
                      {booking.is_paid ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Paid
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </div>
                      )}
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(booking)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(booking.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  {booking.customer_email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>{booking.customer_email}</span>
                    </div>
                  )}
                  {booking.customer_phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{booking.customer_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(Number(booking.total_amount), company?.currency)}
                    </span>
                  </div>
                  {booking.advance_paid > 0 && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="text-xs">Advance:</span>
                      <span className="font-medium text-emerald-600">
                        {formatCurrency(Number(booking.advance_paid), company?.currency)}
                      </span>
                    </div>
                  )}
                </div>

                {booking.referred_by && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                    <UserCheck className="h-4 w-4" />
                    <span>Referred by: <span className="font-medium">{booking.referred_by}</span></span>
                  </div>
                )}

                {booking.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{booking.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingBooking ? 'Edit Booking' : 'Create New Booking'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
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
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name} - {formatCurrency(room.price, company?.currency)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="check_in_date" className="block text-sm font-medium text-gray-700 mb-1">
                        Check-in Date *
                      </label>
                      <input
                        id="check_in_date"
                        type="date"
                        value={formData.check_in_date}
                        onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="check_out_date" className="block text-sm font-medium text-gray-700 mb-1">
                        Check-out Date *
                      </label>
                      <input
                        id="check_out_date"
                        type="date"
                        value={formData.check_out_date}
                        onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
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
                    <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Phone
                    </label>
                    <input
                      id="customer_phone"
                      type="tel"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="+1 (555) 000-0000"
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
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="total_amount" className="block text-sm font-medium text-gray-700 mb-1">
                      Total Price ({company?.currency}) *
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.discount_value}
                          onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="0"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ 
                          ...formData, 
                          discount_type: formData.discount_type === 'fixed' ? 'percentage' : 'fixed' 
                        })}
                        className={`px-4 py-3 border rounded-lg transition-all flex items-center gap-2 ${
                          formData.discount_type === 'percentage'
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-gray-50 border-gray-300 text-gray-700'
                        }`}
                      >
                        {formData.discount_type === 'percentage' ? (
                          <Percent className="h-4 w-4" />
                        ) : (
                          <DollarSign className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="advance_paid" className="block text-sm font-medium text-gray-700 mb-1">
                      Advance Paid
                    </label>
                    <input
                      id="advance_paid"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.advance_paid}
                      onChange={(e) => setFormData({ ...formData, advance_paid: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Due Amount Display */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Due Amount:</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {formatCurrency(calculateDueAmount(), company?.currency)}
                      </span>
                    </div>
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
                      placeholder="Any additional notes about the booking..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {editingBooking ? 'Update Booking' : 'Create Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}