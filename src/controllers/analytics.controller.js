import { Purchase } from '../models/purchase.model.js';
import { User } from '../models/user.model.js';
import { Product } from '../models/product.model.js';

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

    // Customer Retention & Engagement (mocked for now)
    const customerRetention = [80, 82, 85, 87, 90, 92, 95];
    const customerEngagement = [60, 65, 70, 75, 80, 85, 90];

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