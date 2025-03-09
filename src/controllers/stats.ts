import { myCache } from "../app";
import { TryCatch } from "../middlewares/error";
import { Order } from "../models/order";
import { Product } from "../models/product";
import { User } from "../models/user";
import {
  calculatePercentage,
  getChartData,
  getInvetories,
} from "../utils/feature";

export const getDashboardStats = TryCatch(async (req, res, next) => {
  let stats = {};
  const key = "admin-stats";

  if (myCache.has(key)) {
    stats = JSON.parse(myCache.get(key) as string);
  } else {
    const today = new Date();
    const sixMonthAgo = new Date();
    sixMonthAgo.setMonth(sixMonthAgo.getMonth() - 6);

    const thisMonth = {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: today,
    };

    const lastMonth = {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    };

    const thisMonthProductsPromise = Product.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });

    const lastMonthProductsPromise = Product.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });

    const thisMonthUsersPromise = User.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });

    const lastMonthUsersPromise = User.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });

    const thisMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });

    const lastMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });

    const lastSixMonthPromise = Order.find({
      createdAt: {
        $gte: sixMonthAgo,
        $lte: today,
      },
    });

    const latestTransactionPromise = Order.find({})
      .select(["orderItems", "discount", "total", "status"])
      .limit(4);

    const [
      thisMonthUsers,
      thisMonthOrders,
      thisMonthProducts,
      lastMonthUsers,
      lastMonthOrders,
      lastMonthProducts,
      productsCount,
      usersCount,
      allOrders,
      lastSixMonthOrder,
      categories,
      femaleUserCount,
      latestTransaction,
    ] = await Promise.all([
      thisMonthUsersPromise,
      thisMonthOrdersPromise,
      thisMonthProductsPromise,
      lastMonthUsersPromise,
      lastMonthOrdersPromise,
      lastMonthProductsPromise,
      Product.countDocuments(),
      User.countDocuments(),
      Order.find({}).select("total"),
      lastSixMonthPromise,
      Product.distinct("category"),
      User.countDocuments({ gender: "female" }),
      latestTransactionPromise,
    ]);

    const thisMonthRevenue = thisMonthOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    const lastMonthRevenue = lastMonthOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    const changePercent = {
      revenue: calculatePercentage(thisMonthRevenue, lastMonthRevenue),
      user: calculatePercentage(thisMonthUsers.length, lastMonthUsers.length),
      product: calculatePercentage(
        thisMonthProducts.length,
        lastMonthProducts.length
      ),
      order: calculatePercentage(
        thisMonthOrders.length,
        lastMonthOrders.length
      ),
    };

    const revenue = allOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    const count = {
      revenue,
      users: usersCount,
      product: productsCount,
      order: allOrders.length,
    };

    // line charts
    const orderMonthCounts = new Array(6).fill(0);
    const orderMonthlyRevenue = new Array(6).fill(0);

    lastSixMonthOrder.forEach((order) => {
      const creationDate = new Date(order.createdAt);
      const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;

      if (monthDiff >= 0 && monthDiff < 6) {
        orderMonthCounts[5 - monthDiff] += 1;
        orderMonthlyRevenue[5 - monthDiff] += order.total;
      }
    });

    //categories
    const categoriesCountPromise = categories.map((category) =>
      Product.countDocuments({ category })
    );

    const categoriesCount = await Promise.all(categoriesCountPromise);

    const categoryCount: Record<string, number>[] = [];

    categories.forEach((item, idx) => {
      return categoryCount.push({
        [item]: Math.round((categoriesCount[idx] / productsCount) * 100),
      });
    });

    const userRatio = {
      male: usersCount - femaleUserCount,
      female: femaleUserCount,
    };

    const modifyTransaction = latestTransaction.map((item) => ({
      _id: item._id,
      discount: item.discount,
      amount: item.total,
      quantity: item.orderItems.length,
      status: item.status,
    }));

    stats = {
      categoryCount,
      changePercent,
      count,
      chart: {
        orderMonthCounts,
        orderMonthlyRevenue,
      },
      userRatio,
      latestTransaction: modifyTransaction,
    };

    myCache.set(key, JSON.stringify(stats));
  }

  return res.status(200).json({
    success: true,
    stats,
  });
});

export const getPieCharts = TryCatch(async (req, res, next) => {
  let charts;
  const key = "admin-pie-charts";
  if (myCache.has(key)) charts = JSON.parse(myCache.get(key) as string);
  else {
    const allOrderPromise = [
      "total",
      "discount",
      "subtotal",
      "tax",
      "shippingCharges",
    ];
    const [
      processingOrder,
      shippedOrder,
      deliveredOrder,
      categories,
      productsCount,
      productsOutOfStock,
      allOrders,
      allUsers,
      adminUsers,
      customerUsers,
    ] = await Promise.all([
      Order.countDocuments({ status: "Processing" }),
      Order.countDocuments({ status: "Shipped" }),
      Order.countDocuments({ status: "Delivered" }),
      Product.distinct("category"),
      Product.countDocuments(),
      Product.countDocuments({ stock: 0 }),
      Order.find({}).select(allOrderPromise),
      User.find({}).select(["dob"]),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "user" }),
    ]);

    const orderFullFillment = {
      processing: processingOrder,
      shipped: shippedOrder,
      delivered: deliveredOrder,
    };

    const productCategories: Record<string, number>[] = await getInvetories({
      categories,
      productsCount,
    });

    const stockAvailability = {
      inStock: productsCount - productsOutOfStock,
      outOfStock: productsOutOfStock,
    };

    const grossIncome = allOrders.reduce(
      (prev, order) => prev + (order.total || 0),
      0
    );

    const discount = allOrders.reduce(
      (prev, order) => prev + (order.discount || 0),
      0
    );

    const productionCost = allOrders.reduce(
      (prev, order) => prev + (order.shippingCharges || 0),
      0
    );

    const burnt = allOrders.reduce((prev, order) => prev + (order.tax || 0), 0);

    const marketingCost = Math.round(grossIncome * (30 / 100));

    const netMargin =
      grossIncome - discount - productionCost - burnt - marketingCost;

    const revenueDistribution = {
      netMargin,
      discount,
      productionCost,
      burnt,
      marketingCost,
    };

    const usersAgeGroup = {
      teen: allUsers.filter((i) => i.age < 20).length,
      adult: allUsers.filter((i) => i.age > 20).length,
      old: allUsers.filter((i) => i.age > 40).length,
    };

    const adminCustomer = {
      admin: adminUsers,
      customer: customerUsers,
    };

    charts = {
      orderFullFillment,
      productCategories,
      stockAvailability,
      revenueDistribution,
      adminCustomer,
      usersAgeGroup,
    };

    myCache.set(key, JSON.stringify(charts));
  }

  return res.status(200).json({
    success: true,
    charts,
  });
});
export const getBarCharts = TryCatch(async (req, res, next) => {
  let charts;
  const key = "admin-bar-charts";

  if (myCache.has(key)) charts = JSON.parse(myCache.get(key) as string);
  else {
    const today = new Date();
    const sixMonthAgo = new Date();
    sixMonthAgo.setMonth(sixMonthAgo.getMonth() - 6);

    const twelveMonthAgo = new Date();
    twelveMonthAgo.setMonth(twelveMonthAgo.getMonth() - 12);

    const sixMonthProductPromise = Product.find({
      createdAt: {
        $gte: sixMonthAgo,
        $lte: today,
      },
    }).select("createdAt");

    const sixMonthUsersPromise = User.find({
      createdAt: {
        $gte: sixMonthAgo,
        $lte: today,
      },
    }).select("createdAt");

    const twelveMonthOrderPromise = Order.find({
      createdAt: {
        $gte: twelveMonthAgo,
        $lte: today,
      },
    }).select("createdAt");

    const [products, users, orders] = await Promise.all([
      sixMonthProductPromise,
      sixMonthUsersPromise,
      twelveMonthOrderPromise,
    ]);

    const productsCounts = getChartData({ length: 6, docArr: products });
    const usersCounts = getChartData({ length: 6, docArr: users });
    const ordersCounts = getChartData({ length: 12, docArr: orders });

    charts = {
      users: usersCounts,
      products: productsCounts,
      orders: ordersCounts,
    };
    myCache.set(key, JSON.stringify(charts));
  }
  return res.status(200).json({
    success: true,
    charts,
  });
});
export const getLineCharts = TryCatch(async (req, res, next) => {});
