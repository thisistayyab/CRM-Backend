import { Purchase } from '../models/purchase.model.js';
import { User } from '../models/user.model.js';
import { Product } from '../models/product.model.js';

export const getAnalyticsOverview = async (req, res) => {
  try {
    // Fetch all orders
    const orders = await Purchase.find().populate('item.product');
    // Fetch all users
    const customers = await User.countDocuments();
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
    const salesTrend = Array(12).fill(0);
    orders.forEach(order => {
      if (order.status === 'complete' && order.createdAt) {
        const d = new Date(order.createdAt);
        const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        if (monthsAgo >= 0 && monthsAgo < 12) {
          salesTrend[11 - monthsAgo] += order.totalPrice || 0;
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