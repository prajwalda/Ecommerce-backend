import { TryCatch } from "../middlewares/error";
import { Product } from "../models/product";
import {
  baseQueryType,
  NewProductReqBody,
  searchRequestQuery,
} from "../types/types";
import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/utility-class";
import { rm } from "fs";
import { myCache } from "../app";
import { invalidateCache } from "../utils/feature";

//Revalidate on new update or delete product and new order
export const getLatestProducts = TryCatch(async (req, res, next) => {
  let products = [];

  if (myCache.has("latest-products"))
    products = JSON.parse(myCache.get("latest-products") as string);
  else {
    products = await Product.find({}).sort({ createdAt: -1 }).limit(5);
    myCache.set("latest-products", JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    products,
  });
});

//Revalidate on new update or delete product and new order
export const getAllCategories = TryCatch(async (req, res, next) => {
  let categories;

  if (myCache.has("categories"))
    categories = JSON.parse(myCache.get("categories") as string);
  else {
    categories = await Product.distinct("category");
    myCache.set("categories", JSON.stringify(categories));
  }

  return res.status(200).json({
    success: true,
    categories,
  });
});

//Revalidate on new update or delete product and new order
export const getAdminProducts = TryCatch(async (req, res, next) => {
  let products;

  if (myCache.has("all-products"))
    products = JSON.parse(myCache.get("all-products") as string);
  else {
    products = await Product.find({});
    myCache.set("all-products", JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    products,
  });
});

//Revalidate on new update or delete product and new order
export const getSingleProducts = TryCatch(async (req, res, next) => {
  let product;
  const { id } = req.params;

  if (myCache.has(`product-${id}`)) {
    product = JSON.parse(myCache.get(`product-${id}`) as string);
  } else {
    product = await Product.findById(id);
    if (!product) return next(new ErrorHandler("Product Not Found", 404));

    myCache.set(`product-${id}`, JSON.stringify(product));
  }

  return res.status(200).json({
    success: true,
    product,
  });
});

export const newProduct = TryCatch(
  async (
    req: Request<{}, {}, NewProductReqBody>,
    res: Response,
    next: NextFunction
  ) => {
    const { name, price, stock, category } = req.body;
    const photo = req.file;

    if (!photo) return next(new ErrorHandler("please add photo", 400));

    if (!name || !price || !stock || !category) {
      rm(photo.path, () => {
        console.log("Deleted");
      });
      return next(new ErrorHandler("please enter all fields", 400));
    }

    const product = await Product.create({
      name,
      price,
      stock,
      category: category.toLowerCase(),
      photo: photo?.path,
    });

    invalidateCache({
      product: true,
      admin: true,
      productId: String(product._id),
    });

    return res.status(201).json({
      success: true,
      message: "Product created succesfully",
    });
  }
);

export const updateProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const { name, price, stock, category } = req.body;
  const photo = req.file;

  const product = await Product.findById(id);

  if (!product) return next(new ErrorHandler("Invalid Product Id", 404));

  if (!photo) return next(new ErrorHandler("please add photo", 400));

  if (photo) {
    rm(product.photo!, () => {
      console.log("Old photo Deleted");
    });
    product.photo = photo.path;
  }

  if (name) product.name = name;
  if (price) product.price = price;
  if (stock) product.stock = stock;
  if (category) product.category = category;

  await product.save();
  invalidateCache({
    product: true,
    admin: true,
    productId: String(product._id),
  });

  return res.status(200).json({
    success: true,
    message: "Product updated succesfully",
  });
});

export const deleteProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const product = await Product.findById(id);

  if (!product) return next(new ErrorHandler("Invalid Product Id", 404));

  rm(product.photo!, () => {
    console.log("Product photo Deleted");
  });

  await product.deleteOne();

  invalidateCache({
    product: true,
    admin: true,
    productId: String(product._id),
  });

  return res.status(200).json({
    success: true,
    message: "Product deleted succesfully",
  });
});

export const getAllProducts = TryCatch(
  async (req: Request<{}, {}, searchRequestQuery>, res, next) => {
    const { search, sort, category, price } = req.query;

    const page = Number(req.query.page) || 1;

    const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;

    const skip = (page - 1) * limit;

    const baseQuery: baseQueryType = {};

    if (search)
      baseQuery.name = {
        $regex: search,
        $options: "i",
      };

    if (price)
      baseQuery.price = {
        $lte: Number(price),
      };

    if (category) baseQuery.category = category;

    const productPromise = Product.find(baseQuery)
      .sort(sort && { price: sort === "asc" ? 1 : -1 })
      .limit(limit)
      .skip(skip);

    const [products, filteredOnlyProduct] = await Promise.all([
      productPromise,
      Product.find(baseQuery),
    ]);

    const totalPage = Math.ceil(products.length / limit);

    return res.status(200).json({
      success: true,
      products,
      totalPage,
    });
  }
);
