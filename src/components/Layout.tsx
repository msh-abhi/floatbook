import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { 
  Building2, 
  Calendar, 
  Home, 
  DoorOpen, 
  CreditCard, 
  Settings, 
  LogOut,
  Menu,
  X,
  BarChart2,
  Zap
} from 'lucide-react';

export function Layout() {
  const { user, companyId, signOut } = useAuth();
  const { company } = useCompany(companyId);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Rooms', href: '/rooms', icon: DoorOpen },
    { name: 'Bookings', href: '/bookings', icon: CreditCard },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Reports', href: '/reports', icon: BarChart2 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  const CompanyLogo = () => {
    if (company?.logo_url) {
      return (
        <img 
          src={company.logo_url} 
          alt={`${company.name} logo`} 
          className="h-8 w-8 rounded-lg object-cover flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      );
    }
    return <Building2 className="h-8 w-8 text-blue-600 flex-shrink-0" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <CompanyLogo />
          <div className="overflow-hidden">
            <h1 className="text-xl font-bold text-gray-900 truncate">{company?.name || 'FloatBook'}</h1>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white shadow-lg border-b">
          <div className="px-4 py-2 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:bg-white lg:shadow-sm lg:border-r">
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-6 border-b">
              <CompanyLogo />
              <div className="overflow-hidden">
                <h1 className="text-xl font-bold text-gray-900 truncate">{company?.name}</h1>
                <p className="text-sm text-gray-400">by FloatBook</p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 flex flex-col justify-between">
              <nav className="px-4 py-6 space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive(item.href)
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* Upgrade Button */}
              <div className="px-6 mb-6">
                <Link
                  to="/settings"
                  state={{ tab: 'plans' }}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  <Zap className="h-5 w-5" />
                  UPGRADE
                </Link>
              </div>
            </div>


            {/* User section */}
            <div className="border-t px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 lg:pl-64">
          <main className="min-h-screen bg-gray-50">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}