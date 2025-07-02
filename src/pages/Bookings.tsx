import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit, Trash2, Calendar, Mail, Phone, CheckCircle, Clock, Percent, UserCheck, CircleDollarSign, Users, Ship } from 'lucide-react';
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

  const initialFormData = {
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
    guest_count: '1',
    booking_type: 'individual',
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId]);

  // Auto-calculate check_out_date and auto-fill price
  useEffect(() => {
    if (formData.check_in_date && !editingBooking) {
      const checkInDate = new Date(formData.check_in_date);
      checkInDate.setDate(checkInDate.getDate() + 1);
      const checkOutDate = checkInDate.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, check_out_date: checkOutDate }));
    }
    
    if (formData.room_id && !editingBooking) {
      const selectedRoom = rooms.find(room => room.id === formData.room_id);
      if (selectedRoom) {
        setFormData(prev => ({ ...prev, total_amount: selectedRoom.price.toString() }));
      }
    }
  }, [formData.check_in_date, formData.room_id, rooms, editingBooking]);

  const fetchData = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const { data: bookingsData, error: bookingsError } = await supabase.from('bookings').select(`*, room:rooms(*)`).eq('company_id', companyId).order('check_in_date', { ascending: false });
      if (bookingsError) throw bookingsError;
      const { data: roomsData, error: roomsError } = await supabase.from('rooms').select('*').eq('company_id', companyId).order('name');
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
    const discount = formData.discount_type === 'percentage' ? (total * discountValue) / 100 : discountValue;
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
        guest_count: parseInt(formData.guest_count),
        booking_type: formData.booking_type,
        is_paid: calculateDueAmount() <= 0,
      };

      if (editingBooking) {
        await supabase.from('bookings').update(bookingData).eq('id', (editingBooking as any).id);
      } else {
        await supabase.from('bookings').insert([bookingData]);
      }
      setShowModal(false);
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
      notes: (booking as any).notes || '',
      guest_count: (booking.guest_count || 1).toString(),
      booking_type: booking.booking_type || 'individual',
    });
    setShowModal(true);
  };

  const handleDelete = async (bookingId: string) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      await supabase.from('bookings').delete().eq('id', bookingId);
      fetchData();
    }
  };

  const togglePaymentStatus = async (booking: Booking) => {
    await supabase.from('bookings').update({ is_paid: !booking.is_paid }).eq('id', booking.id);
    fetchData();
  };

  const resetForm = () => setFormData(initialFormData);
  const openModal = () => { setEditingBooking(null); resetForm(); setShowModal(true); };
  const formatDateRange = (checkIn: string, checkOut: string) => `${new Date(checkIn + 'T00:00:00').toLocaleDateString()} - ${new Date(checkOut + 'T00:00:00').toLocaleDateString()}`;

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bookings</h1>
          <p className="text-gray-600">Manage your room bookings and customer information.</p>
        </div>
        <button onClick={openModal} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg flex items-center gap-2">
          <Plus className="h-5 w-5" /> New Booking
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first booking.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><Calendar className="h-6 w-6 text-blue-600" /></div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{booking.customer_name}</h3>
                    <p className="text-sm text-gray-600">{booking.room?.name}</p>
                    <p className="text-sm text-gray-500">{formatDateRange(booking.check_in_date, booking.check_out_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => togglePaymentStatus(booking)} className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${booking.is_paid ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {booking.is_paid ? <><CheckCircle className="h-3 w-3"/>Paid</> : <><Clock className="h-3 w-3"/>Pending</>}
                  </button>
                  <button onClick={() => handleEdit(booking)} className="p-2 text-gray-400 hover:text-blue-600"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(booking.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400"/><span>{booking.customer_email}</span></div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400"/><span>{booking.customer_phone}</span></div>
                <div className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-gray-400"/><span className="font-semibold">{formatCurrency(Number(booking.total_amount), company?.currency)}</span></div>
                {booking.advance_paid > 0 && <div className="flex items-center gap-2"><span className="text-xs">Advance:</span><span className="font-medium text-emerald-600">{formatCurrency(Number(booking.advance_paid), company?.currency)}</span></div>}
              </div>
              {(booking as any).notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                  <strong>Notes:</strong> {(booking as any).notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b"><h2 className="text-xl font-semibold">{editingBooking ? 'Edit Booking' : 'Create New Booking'}</h2></div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
                {/* --- Left Column --- */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label htmlFor="check_in_date" className="block text-sm font-medium text-gray-700 mb-1">Check-in Date *</label><input id="check_in_date" type="date" value={formData.check_in_date} onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 rounded-lg"/></div>
                    <div><label htmlFor="check_out_date" className="block text-sm font-medium text-gray-700 mb-1">Check-out Date *</label><input id="check_out_date" type="date" value={formData.check_out_date} onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 rounded-lg"/></div>
                  </div>
                  <div><label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label><input id="customer_name" type="text" value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Enter customer name"/></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label htmlFor="customer_email" className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label><input id="customer_email" type="email" value={formData.customer_email} onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="customer@email.com"/></div>
                    <div><label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label><input id="customer_phone" type="tel" value={formData.customer_phone} onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="+1 (555) 000-0000"/></div>
                  </div>
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input id="notes" type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Any additional notes..."/>
                  </div>
                </div>
                {/* --- Right Column --- */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label htmlFor="room_id" className="block text-sm font-medium text-gray-700 mb-1">Room *</label><select id="room_id" value={formData.room_id} onChange={(e) => setFormData({ ...formData, room_id: e.target.value })} required className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50"><option value="">Select a room</option>{rooms.map((room) => ( <option key={room.id} value={room.id}> {room.name} </option> ))}</select></div>
                    <div><label htmlFor="guest_count" className="block text-sm font-medium text-gray-700 mb-1">Guests *</label><input id="guest_count" type="number" min="1" value={formData.guest_count} onChange={(e) => setFormData({ ...formData, guest_count: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 rounded-lg"/></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Booking Type</label>
                    <div className="flex rounded-lg bg-gray-100 p-1"><button type="button" onClick={() => setFormData({...formData, booking_type: 'individual'})} className={`flex-1 py-2 px-4 text-sm rounded-md flex items-center justify-center gap-2 ${formData.booking_type === 'individual' ? 'bg-white shadow' : ''}`}><Users className="h-4 w-4"/> Individual</button><button type="button" onClick={() => setFormData({...formData, booking_type: 'full_boat'})} className={`flex-1 py-2 px-4 text-sm rounded-md flex items-center justify-center gap-2 ${formData.booking_type === 'full_boat' ? 'bg-white shadow' : ''}`}><Ship className="h-4 w-4"/> Full Boat</button></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label htmlFor="total_amount" className="block text-sm font-medium text-gray-700 mb-1">Total Price</label><input id="total_amount" type="number" step="0.01" min="0" value={formData.total_amount} onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"/></div>
                    <div><label htmlFor="advance_paid" className="block text-sm font-medium text-gray-700 mb-1">Advance Paid</label><input id="advance_paid" type="number" step="0.01" min="0" value={formData.advance_paid} onChange={(e) => setFormData({ ...formData, advance_paid: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg"/></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                        <div className="flex"><input type="number" step="0.01" min="0" value={formData.discount_value} onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-l-lg"/><button type="button" onClick={() => setFormData({ ...formData, discount_type: formData.discount_type === 'fixed' ? 'percentage' : 'fixed' })} className={`px-4 py-3 border-t border-b border-r border-gray-300 rounded-r-lg flex items-center gap-2 ${formData.discount_type === 'percentage' ? 'bg-blue-50' : 'bg-gray-50'}`}>{formData.discount_type === 'percentage' ? <Percent className="h-4 w-4"/> : <CircleDollarSign className="h-4 w-4" />}</button></div>
                      </div>
                      <div><label htmlFor="referred_by" className="block text-sm font-medium text-gray-700 mb-1">Referred By</label><input id="referred_by" type="text" value={formData.referred_by} onChange={(e) => setFormData({ ...formData, referred_by: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="e.g. John Doe"/></div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100"><div className="flex justify-between items-center"><span className="text-gray-600 font-medium">TOTAL DUE:</span><span className="text-2xl font-bold text-blue-700">{formatCurrency(calculateDueAmount(), company?.currency)}</span></div></div>
                </div>
              </div>
              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100"><button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border rounded-lg">Cancel</button><button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg">{editingBooking ? 'Update Booking' : 'Create Booking'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}