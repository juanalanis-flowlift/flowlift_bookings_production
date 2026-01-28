
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, saveConfig } from './supabase';
import { translations } from './locales';
import { BookingStatus, SubscriptionPlan } from './types';

// Components
const Navbar = ({ user, onLogout, lang }: { user: any; onLogout: () => void; lang: 'en' | 'es-MX' }) => (
  <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-lg">f</span>
      </div>
      <span className="font-bold text-xl tracking-tight text-gray-900">{translations['app_name'][lang]}</span>
    </div>
    <div className="flex items-center gap-4">
      {user ? (
        <>
          <span className="text-sm text-gray-500 hidden sm:inline">{user.email}</span>
          <button 
            onClick={onLogout}
            className="text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
          >
            Logout
          </button>
        </>
      ) : (
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
          Login
        </button>
      )}
    </div>
  </nav>
);

const Sidebar = ({ activeTab, setActiveTab, lang }: { activeTab: string; setActiveTab: (t: string) => void; lang: 'en' | 'es-MX' }) => {
  const tabs = [
    { id: 'dashboard', icon: '📊', label: translations['dashboard'][lang] },
    { id: 'calendar', icon: '📅', label: translations['calendar'][lang] },
    { id: 'bookings', icon: '📝', label: translations['bookings'][lang] },
    { id: 'staff', icon: '👥', label: translations['staff'][lang] },
    { id: 'services', icon: '⚙️', label: translations['services'][lang] },
    { id: 'settings', icon: '🛠️', label: translations['settings'][lang] },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen hidden md:block">
      <div className="p-4 flex flex-col gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </aside>
  );
};

const SetupForm = () => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && key) {
      saveConfig(url.trim(), key.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-lg w-full">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🚀</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Connect Supabase</h2>
        <p className="text-gray-600 mb-8 text-center text-sm">
          To get started, enter your Supabase credentials. You can find these in your <a href="https://supabase.com/dashboard" target="_blank" className="text-blue-600 hover:underline">Supabase Dashboard</a> under <b>Settings > API</b>.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Supabase URL</label>
            <input 
              type="text" 
              placeholder="https://your-project.supabase.co"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Anon Key</label>
            <input 
              type="password" 
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all mt-4"
          >
            Save & Continue
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-100">
          <button 
            onClick={() => window.location.href = '?book=demo'}
            className="w-full text-gray-500 text-sm font-medium hover:text-gray-900 transition-colors"
          >
            Just want to see the Booking Flow? Click here.
          </button>
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ lang }: { lang: 'en' | 'es-MX' }) => {
  const stats = [
    { label: translations['bookings_today'][lang], value: '12', trend: '+2', icon: '📅', color: 'bg-blue-500' },
    { label: translations['upcoming_week'][lang], value: '48', trend: '+15%', icon: '📈', color: 'bg-green-500' },
    { label: 'Utilization', value: '82%', trend: '-2%', icon: '⏱️', color: 'bg-purple-500' },
    { label: 'Cancellations', value: '2', trend: 'Low', icon: '❌', color: 'bg-red-500' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back, Flowlift Team</h1>
        <p className="text-gray-500">Here is what's happening with your business today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 ${stat.color} bg-opacity-10 rounded-xl flex items-center justify-center`}>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {stat.trend}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">{stat.label}</h3>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-lg">Upcoming Appointments</h2>
          <button className="text-blue-600 text-sm font-semibold hover:underline">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Staff</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[1, 2, 3].map((item) => (
                <tr key={item} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">Alex Johnson</div>
                    <div className="text-sm text-gray-500">alex@example.com</div>
                  </td>
                  <td className="px-6 py-4 text-sm">Full Haircut & Styling</td>
                  <td className="px-6 py-4 text-sm">Marcus V.</td>
                  <td className="px-6 py-4 text-sm">10:30 AM (45m)</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Confirmed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lang, setLang] = useState<'en' | 'es-MX'>('en');
  const [isPublicView, setIsPublicView] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('book')) {
      setIsPublicView(true);
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Handle missing configuration gracefully
  if (!isSupabaseConfigured && !isPublicView) {
    return <SetupForm />;
  }

  // Public Booking Flow
  if (isPublicView) {
    return (
      <div className="min-h-screen bg-white">
        <header className="p-6 border-b border-gray-100 flex justify-between items-center max-w-4xl mx-auto">
          <div className="font-bold text-xl">flowlift</div>
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value as any)}
            className="text-sm border-gray-200 rounded-lg p-1"
          >
            <option value="en">English</option>
            <option value="es-MX">Español</option>
          </select>
        </header>
        <main className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-100 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-100 rounded-full"></div>
          </div>
          <h1 className="text-3xl font-bold mb-8">{translations['step_1_title'][lang]}</h1>
          <div className="grid gap-4">
             {['Premium Haircut', 'Beard Trim', 'Full Treatment'].map(service => (
               <div key={service} className="p-6 border-2 border-gray-100 rounded-2xl hover:border-blue-500 cursor-pointer transition-all flex justify-between items-center group">
                 <div>
                   <h3 className="font-bold text-lg group-hover:text-blue-600">{service}</h3>
                   <p className="text-gray-500 text-sm">45 minutes • $35.00</p>
                 </div>
                 <span className="text-gray-400 group-hover:text-blue-500">→</span>
               </div>
             ))}
          </div>
          <div className="mt-12 flex justify-between">
            <button onClick={() => setIsPublicView(false)} className="text-gray-500 font-medium">{translations['back'][lang]}</button>
            <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700">{translations['next'][lang]}</button>
          </div>
        </main>
      </div>
    );
  }

  // Business View
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={handleLogout} lang={lang} />
      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />
        <main className="flex-1 min-w-0">
          {user ? (
            <DashboardView lang={lang} />
          ) : (
            <div className="flex flex-col items-center justify-center p-20 text-center">
              <h2 className="text-3xl font-bold mb-4">Grow your business with smart bookings.</h2>
              <p className="text-gray-600 mb-8 max-w-md">Join thousands of organizations managing their time better with flowlift.</p>
              <div className="flex gap-4">
                <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200">Get Started</button>
                <button onClick={() => setIsPublicView(true)} className="bg-white border border-gray-200 px-8 py-3 rounded-xl font-bold hover:bg-gray-50">View Demo Booking</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
