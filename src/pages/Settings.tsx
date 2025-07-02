import React, { useState, useEffect } from 'react';
import { Building2, Users, LogOut, Mail, Trash2, UserPlus, Settings as SettingsIcon, CreditCard, Crown, MapPin, Key, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { CompanyUser } from '../types';
import { useNavigate } from 'react-router-dom';

export function Settings() {
  const { user, companyId, signOut } = useAuth();
  const { company, updateCompany } = useCompany(companyId);
  const navigate = useNavigate();
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'company' | 'team' | 'email' | 'payment' | 'plans'>('company');
  const [companyForm, setCompanyForm] = useState({
    name: '',
    logo_url: '',
    address: '',
  });
  const [emailSettings, setEmailSettings] = useState({
    brevo_api_key: '',
  });
  const [paymentSettings, setPaymentSettings] = useState({
    stripe_secret_key: '',
    paypal_client_id: '',
    bkash_merchant_id: '',
  });
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    if (company) {
      setCompanyForm({
        name: company.name || '',
        logo_url: company.logo_url || '',
        address: company.address || '', // Correctly populate address
      });
    }
  }, [company]);

  useEffect(() => {
    if (companyId) {
      fetchCompanyUsers();
    }
  }, [companyId]);

  const fetchCompanyUsers = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from('company_users')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;
      setCompanyUsers(data || []);
    } catch (error) {
      console.error('Error fetching company users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Correctly include all fields in the update
      const { error } = await updateCompany({
        name: companyForm.name,
        logo_url: companyForm.logo_url || null,
        address: companyForm.address || null,
      });

      if (error) {
        alert('Error updating company. Please try again.');
      } else {
        alert('Company information updated successfully!');
        window.location.reload(); // Force a full refresh to reflect changes everywhere
      }
    } catch (error) {
      console.error('Error updating company:', error);
      alert('Error updating company. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !inviteEmail.trim()) return;

    try {
      alert(`Invitation would be sent to ${inviteEmail}. This feature requires email service integration.`);
      setInviteEmail('');
      setShowInviteModal(false);
    } catch (error) {
      console.error('Error inviting user:', error);
      alert('Error sending invitation. Please try again.');
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
      navigate('/auth');
    }
  };

  const tabs = [
    { id: 'company', name: 'Company Info', icon: Building2 },
    { id: 'team', name: 'Team Members', icon: Users },
    { id: 'email', name: 'Email Settings', icon: Mail },
    { id: 'payment', name: 'Payment Methods', icon: CreditCard },
    { id: 'plans', name: 'Subscription Plans', icon: Crown },
  ];

  const plans = [
    { name: 'Free Plan', price: '$0', period: '/month', features: ['2 rooms', '10 bookings/month', 'Basic support'], current: true, color: 'gray' },
    { name: 'Basic Plan', price: '$29', period: '/month', features: ['10 rooms', '50 bookings/month', 'Email support', 'Analytics'], current: false, color: 'blue' },
    { name: 'Pro Plan', price: '$99', period: '/month', features: ['Unlimited rooms', 'Unlimited bookings', 'Priority support', 'Advanced analytics', 'API access'], current: false, color: 'purple' },
  ];

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border h-48"></div>
            <div className="bg-white p-6 rounded-xl shadow-sm border h-48"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your company settings and preferences.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:w-64">
          <nav className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {activeTab === 'company' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Company Information
                </h2>
              </div>
              <div className="p-6">
                <form onSubmit={handleUpdateCompany} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name *
                      </label>
                      <input
                        id="company_name"
                        type="text"
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <input
                        id="address"
                        type="text"
                        value={companyForm.address}
                        onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Company address"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-2">
                      Logo URL
                    </label>
                    <div className="flex gap-3">
                      <input
                        id="logo_url"
                        type="url"
                        value={companyForm.logo_url}
                        onChange={(e) => setCompanyForm({ ...companyForm, logo_url: e.target.value })}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="https://example.com/logo.png"
                      />
                      {companyForm.logo_url && (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          <img
                            src={companyForm.logo_url}
                            alt="Logo preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Team Members
                  </h2>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite User
                  </button>
                </div>
              </div>
              <div className="p-6">
                {companyUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
                    <p className="text-gray-600">Invite your first team member to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {companyUsers.map((companyUser) => (
                      <div key={companyUser.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-lg font-semibold">
                              {companyUser.user_email?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {companyUser.user_email || 'Unknown User'}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 capitalize">{companyUser.role}</span>
                              {companyUser.user_id === user?.id && (
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full font-medium">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {companyUser.user_id !== user?.id && (
                          <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'email' && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-emerald-600" />
                  Email Settings
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="brevo_api_key" className="block text-sm font-medium text-gray-700 mb-2">
                      Brevo API Key
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="brevo_api_key"
                        type="password"
                        value={emailSettings.brevo_api_key}
                        onChange={(e) => setEmailSettings({ ...emailSettings, brevo_api_key: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        placeholder="Enter your Brevo API key"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Used for sending booking confirmations and notifications.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> Email settings are stored securely and used for automated notifications.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'plans' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-600" />
                    Subscription Plans
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                      <div
                        key={plan.name}
                        className={`relative rounded-xl border-2 p-6 ${
                          plan.current
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        } transition-all`}
                      >
                        {plan.current && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                              Current Plan
                            </span>
                          </div>
                        )}
                        
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h3>
                          <div className="mb-4">
                            <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                            <span className="text-gray-600">{plan.period}</span>
                          </div>
                          
                          <ul className="space-y-2 mb-6 text-sm text-gray-600">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-emerald-500" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                          
                          {!plan.current && (
                            <button
                              className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                                plan.color === 'blue'
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : plan.color === 'purple'
                                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                                  : 'bg-gray-600 text-white hover:bg-gray-700'
                              }`}
                            >
                              Upgrade
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Account Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Account</h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">Signed in as</h3>
                      <p className="text-sm text-gray-600">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Invite Team Member</h2>
            </div>

            <form onSubmit={handleInviteUser} className="p-6 space-y-4">
              <div>
                <label htmlFor="invite_email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="invite_email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="colleague@company.com"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> This is a demo feature. In a production environment,
                  this would send an invitation email to the user.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}