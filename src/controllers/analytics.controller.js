import { Purchase } from '../models/purchase.model.js';
import { Product } from '../models/product.model.js';
import { Inventory } from '../models/inventory.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getAnalyticsOverview = async (req, res) => {
  try {
    // Filter by logged-in user if present
    const userId = req.user?._id;
    const orderQuery = userId ? { user: userId } : {};
    // Fetch orders for this user (or all if admin/global)
    const orders = await Purchase.find(orderQuery).populate('item.product');
    // Fetch all users
    // For user-specific analytics, count unique customers from orders (by phoneNumber)
    const customers = userId
      ? new Set(orders.map(o => o.phoneNumber)).size
      : await User.countDocuments();
    // Fetch all products
    const products = await Product.find();

    // Revenue: sum of totalPrice for completed orders
    const revenue = orders.filter(o => o.status === 'complete').reduce((sum, o) => sum + (o.totalPrice || 0), 0);

    // Orders count
    const ordersCount = orders.length;

    // Top Product (by quantity sold)
    const productSales = {};
    orders.forEach(order => {
      if (order.status === 'complete') {
        order.item.forEach(i => {
          if (i.product && i.product.productname) {
            const key = i.product.productname;
            productSales[key] = productSales[key] || { name: key, sold: 0, revenue: 0 };
            productSales[key].sold += i.quantity;
            productSales[key].revenue += (i.salePrice || i.price) * i.quantity;
          }
        });
      }
    });
    const topProductsArr = Object.values(productSales).sort((a, b) => b.sold - a.sold);
    const topProduct = topProductsArr[0] || { name: 'N/A', sold: 0, revenue: 0 };

    // Sales Trend (monthly revenue for last 12 months)
    const now = new Date();
    // Prepare month labels (Jan, Feb, ...)
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Get the last 12 months, oldest first, current month last
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        label: monthLabels[d.getMonth()]
      });
    }
    // Initialize salesTrend with correct months
    const salesTrend = months.map(m => ({ month: m.label, sales: 0 }));
    orders.forEach(order => {
      if (order.status === 'complete' && order.createdAt) {
        const d = new Date(order.createdAt);
        // Find the matching month/year slot
        for (let i = 0; i < months.length; i++) {
          if (d.getFullYear() === months[i].year && d.getMonth() === months[i].monthIndex) {
            salesTrend[i].sales += order.totalPrice || 0;
            break;
          }
        }
      }
    });

    // Revenue Breakdown by category (for completed orders)
    const revenueBreakdownMap = {};
    orders.forEach(order => {
      if (order.status === 'complete') {
        order.item.forEach(i => {
          const cat = i.product?.category || 'Other';
          revenueBreakdownMap[cat] = (revenueBreakdownMap[cat] || 0) + ((i.salePrice || i.price) * i.quantity);
        });
      }
    });
    const revenueBreakdown = Object.entries(revenueBreakdownMap).map(([name, value]) => ({ name, value }));

    // Order Trends (weekly orders for last 4 weeks)
    const orderTrends = Array(4).fill(0).map((_, i) => ({ week: `Week ${i + 1}`, orders: 0 }));
    orders.forEach(order => {
      if (order.createdAt) {
        const d = new Date(order.createdAt);
        const weekAgo = Math.floor((now - d) / (7 * 24 * 60 * 60 * 1000));
        if (weekAgo >= 0 && weekAgo < 4) {
          orderTrends[3 - weekAgo].orders += 1;
        }
      }
    });

    // Top 4 products
    const topProducts = topProductsArr.slice(0, 4);

    // Customer Engagement: unique customers per week for last 7 weeks
    const engagementWeeks = 7;
    const engagementNow = new Date();
    const customerEngagement = [];
    for (let i = engagementWeeks - 1; i >= 0; i--) {
      const weekStart = new Date(engagementNow);
      weekStart.setDate(weekStart.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekOrders = orders.filter(order =>
        order.createdAt >= weekStart && order.createdAt < weekEnd
      );
      const uniqueCustomers = new Set(weekOrders.map(o => o.phoneNumber));
      customerEngagement.push(uniqueCustomers.size);
    }

    // Customer Retention: percent of last week's customers who returned this week
    const customerRetention = [];
    for (let i = 1; i < customerEngagement.length; i++) {
      const prevWeekStart = new Date(engagementNow);
      prevWeekStart.setDate(prevWeekStart.getDate() - (engagementWeeks - i) * 7);
      prevWeekStart.setHours(0, 0, 0, 0);
      const prevWeekEnd = new Date(prevWeekStart);
      prevWeekEnd.setDate(prevWeekEnd.getDate() + 7);

      const currWeekStart = new Date(engagementNow);
      currWeekStart.setDate(currWeekStart.getDate() - (engagementWeeks - i - 1) * 7);
      currWeekStart.setHours(0, 0, 0, 0);
      const currWeekEnd = new Date(currWeekStart);
      currWeekEnd.setDate(currWeekEnd.getDate() + 7);

      const prevWeekOrders = orders.filter(order =>
        order.createdAt >= prevWeekStart && order.createdAt < prevWeekEnd
      );
      const currWeekOrders = orders.filter(order =>
        order.createdAt >= currWeekStart && order.createdAt < currWeekEnd
      );
      const prevCustomers = new Set(prevWeekOrders.map(o => o.phoneNumber));
      const currCustomers = new Set(currWeekOrders.map(o => o.phoneNumber));
      const retained = [...prevCustomers].filter(c => currCustomers.has(c));
      const retentionRate = prevCustomers.size === 0 ? 0 : Math.round((retained.length / prevCustomers.size) * 100);
      customerRetention.push(retentionRate);
    }
    customerRetention.unshift(0);

    res.json({
      revenue,
      orders: ordersCount,
      customers,
      topProduct,
      salesTrend,
      revenueBreakdown,
      orderTrends,
      topProducts,
      customerRetention,
      customerEngagement
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching analytics', error: err.message });
  }
};

const getMonthRange = (offset = 0) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return [start, end];
};

const calcOrderProfit = (order) => {
  if (!order.item?.length) return 0;
  const revenue = order.item.reduce((sum, i) => sum + ((i.salePrice || i.price) * i.quantity), 0);
  const cost = order.item.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const expenses = (order.shippingCharges || 0) + (order.otherExpenses || 0);
  return revenue - cost - expenses;
};

export const getDashboardInsights = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const orders = await Purchase.find({ user: userId }).populate('item.product');

  const [thisStart, thisEnd] = getMonthRange(0);
  const [lastStart, lastEnd] = getMonthRange(-1);

  const thisMonthOrders = orders.filter(o => o.createdAt >= thisStart && o.createdAt <= thisEnd);
  const lastMonthOrders = orders.filter(o => o.createdAt >= lastStart && o.createdAt <= lastEnd);

  const thisMonthComplete = thisMonthOrders.filter(o => o.status === 'complete');
  const lastMonthComplete = lastMonthOrders.filter(o => o.status === 'complete');

  const thisProfit = thisMonthComplete.reduce((sum, o) => sum + calcOrderProfit(o), 0);
  const lastProfit = lastMonthComplete.reduce((sum, o) => sum + calcOrderProfit(o), 0);

  const profitGrowth = lastProfit === 0
    ? (thisProfit > 0 ? 100 : 0)
    : ((thisProfit - lastProfit) / Math.abs(lastProfit)) * 100;

  const thisRevenue = thisMonthComplete.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const thisExpenses = thisMonthComplete.reduce(
    (sum, o) => sum + (o.shippingCharges || 0) + (o.otherExpenses || 0), 0
  );
  const expenseRatio = thisRevenue > 0 ? (thisExpenses / thisRevenue) * 100 : 0;

  const totalOrders = orders.length;
  const problemOrders = orders.filter(o => o.status === 'canceled' || o.status === 'returned').length;
  const cancelRate = totalOrders > 0 ? (problemOrders / totalOrders) * 100 : 0;

  const userProducts = await Product.find({ createdBy: userId }).select('_id');
  const productIds = userProducts.map(p => p._id);
  const inventory = await Inventory.find({ product: { $in: productIds } }).populate('product');
  const lowStockItems = inventory.filter(i => i.quantity <= (i.minStock || 5));

  let riskLevel = 'Low';
  if (cancelRate > 15 || lowStockItems.length > 5) riskLevel = 'High';
  else if (cancelRate > 8 || lowStockItems.length > 2) riskLevel = 'Medium';

  const now = new Date();
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const profitTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthOrders = orders.filter(o =>
      o.status === 'complete' && o.createdAt >= start && o.createdAt <= end
    );
    profitTrend.push({
      label: monthLabels[d.getMonth()],
      value: monthOrders.reduce((sum, o) => sum + calcOrderProfit(o), 0)
    });
  }

  return res.status(200).json(new ApiResponse(200, {
    profitGrowth: Math.round(profitGrowth * 100) / 100,
    expenseRatio: Math.round(expenseRatio * 100) / 100,
    riskLevel,
    cancelRate: Math.round(cancelRate * 100) / 100,
    lowStockCount: lowStockItems.length,
    lowStockItems: lowStockItems.slice(0, 5).map(i => ({
      productName: i.product?.productname || 'Unknown',
      quantity: i.quantity,
      minStock: i.minStock || 5
    })),
    profitTrend
  }, 'Dashboard insights fetched'));
});

export const getCustomers = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const orders = await Purchase.find({ user: userId }).sort({ createdAt: -1 });

  const customerMap = {};
  orders.forEach(order => {
    const key = order.phoneNumber;
    if (!key) return;
    if (!customerMap[key]) {
      customerMap[key] = {
        phoneNumber: key,
        customerName: order.customerName,
        customerAddress: order.customerAddress,
        totalOrders: 0,
        completedOrders: 0,
        totalSpent: 0,
        lastOrderDate: order.createdAt,
        firstOrderDate: order.createdAt,
        statuses: { active: 0, complete: 0, canceled: 0, returned: 0 }
      };
    }
    const c = customerMap[key];
    c.totalOrders += 1;
    c.statuses[order.status] = (c.statuses[order.status] || 0) + 1;
    if (order.status === 'complete') {
      c.completedOrders += 1;
      c.totalSpent += order.totalPrice || 0;
    }
    if (order.createdAt > c.lastOrderDate) {
      c.lastOrderDate = order.createdAt;
      c.customerName = order.customerName;
      c.customerAddress = order.customerAddress;
    }
    if (order.createdAt < c.firstOrderDate) c.firstOrderDate = order.createdAt;
  });

  const customers = Object.values(customerMap).map(c => {
    let segment = 'New';
    if (c.completedOrders >= 5 || c.totalSpent >= 50000) segment = 'VIP';
    else if (c.completedOrders >= 2) segment = 'Repeat';
    return { ...c, segment };
  }).sort((a, b) => b.totalSpent - a.totalSpent);

  const summary = {
    totalCustomers: customers.length,
    vipCustomers: customers.filter(c => c.segment === 'VIP').length,
    repeatCustomers: customers.filter(c => c.segment === 'Repeat').length,
    newCustomers: customers.filter(c => c.segment === 'New').length,
    totalRevenue: customers.reduce((sum, c) => sum + c.totalSpent, 0)
  };

  return res.status(200).json(new ApiResponse(200, { customers, summary }, 'Customers fetched'));
}); 