import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp,
  DollarSign,
  UserPlus,
  PackagePlus
} from 'lucide-react';
import { 
  IconShoppingCart, 
  IconUsers
} from "@tabler/icons-react";
import { ordersAPI, usersAPI } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  todayOrders: number;
  todayRevenue: number;
  totalUsers: number;
  newThisMonth: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [orderStats, userStats] = await Promise.all([
          ordersAPI.getStats(),
          usersAPI.getStats(),
        ]);
        
        setStats({
          ...orderStats.stats,
          ...userStats.stats,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Revenue */}
        <div className="bg-[#2a3a4a]/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-xs text-[#fff4e9]/50">Total Revenue</span>
          </div>
          <p className="font-display text-3xl text-[#fff4e9]">
            {isLoading ? '-' : formatPrice(stats?.totalRevenue || 0)}
          </p>
          <p className="text-sm text-green-400 mt-2">
            +{formatPrice(stats?.todayRevenue || 0)} today
          </p>
        </div>

        {/* Orders */}
        <div className="bg-[#2a3a4a]/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <IconShoppingCart className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-xs text-[#fff4e9]/50">Total Orders</span>
          </div>
          <p className="font-display text-3xl text-[#fff4e9]">
            {isLoading ? '-' : stats?.totalOrders || 0}
          </p>
          <p className="text-sm text-blue-400 mt-2">
            {stats?.pendingOrders || 0} pending
          </p>
        </div>

        {/* Users */}
        <div className="bg-[#2a3a4a]/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <IconUsers className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-xs text-[#fff4e9]/50">Total Users</span>
          </div>
          <p className="font-display text-3xl text-[#fff4e9]">
            {isLoading ? '-' : stats?.totalUsers || 0}
          </p>
          <p className="text-sm text-purple-400 mt-2">
            +{stats?.newThisMonth || 0} this month
          </p>
        </div>

        {/* Growth */}
        <div className="bg-[#2a3a4a]/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-400" />
            </div>
            <span className="text-xs text-[#fff4e9]/50">Today's Orders</span>
          </div>
          <p className="font-display text-3xl text-[#fff4e9]">
            {isLoading ? '-' : stats?.todayOrders || 0}
          </p>
          <p className="text-sm text-orange-400 mt-2">
            Active today
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/admin/products/new"
          className="bg-[#2a3a4a]/50 rounded-lg p-6 flex items-center gap-4 hover:bg-[#2a3a4a]/80 transition-colors group"
        >
          <div className="w-14 h-14 rounded-lg bg-[#fff4e9]/10 flex items-center justify-center group-hover:bg-[#fff4e9]/20 transition-colors">
            <PackagePlus className="w-7 h-7 text-[#fff4e9]" />
          </div>
          <div>
            <h3 className="font-display text-xl text-[#fff4e9]">Add New Product</h3>
            <p className="text-sm text-[#fff4e9]/60">Create a new product listing</p>
          </div>
        </Link>

        <Link
          to="/admin/users"
          className="bg-[#2a3a4a]/50 rounded-lg p-6 flex items-center gap-4 hover:bg-[#2a3a4a]/80 transition-colors group"
        >
          <div className="w-14 h-14 rounded-lg bg-[#fff4e9]/10 flex items-center justify-center group-hover:bg-[#fff4e9]/20 transition-colors">
            <UserPlus className="w-7 h-7 text-[#fff4e9]" />
          </div>
          <div>
            <h3 className="font-display text-xl text-[#fff4e9]">Manage Users</h3>
            <p className="text-sm text-[#fff4e9]/60">View and manage user accounts</p>
          </div>
        </Link>
      </div>
    </AdminLayout>
  );
}
