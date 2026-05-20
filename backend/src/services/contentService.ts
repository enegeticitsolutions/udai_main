import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { readJsonFile, writeJsonFile } from "../lib/fileStore.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import type {
  BlogPost,
  BlogStory,
  CareerOpportunity,
  EducationProgram,
  EventItem,
  Product,
  Testimonial,
  Therapist,
} from "../types.js";

function contentPath(fileName: string) {
  return path.join(config.frontendDataDir, fileName);
}

function backendContentPath(fileName: string) {
  return path.join(config.backendDataDir, fileName);
}

export async function getBlogPosts() {
  return readJsonFile<BlogPost[]>(contentPath("blog.json"));
}

export async function getEvents() {
  return readJsonFile<EventItem[]>(contentPath("events.json"));
}

export async function getProducts() {
  return readStoredProducts();
}

export async function getTestimonials() {
  return readJsonFile<Testimonial[]>(contentPath("testimonials.json"));
}

export async function getTherapists() {
  return readJsonFile<Therapist[]>(contentPath("therapists.json"));
}

export async function getEducationPrograms() {
  return readJsonFile<EducationProgram[]>(contentPath("education-programs.json"));
}

export async function getCareers() {
  return readJsonFile<CareerOpportunity[]>(backendContentPath("careers.json"));
}

export async function getEducationProgramBySlug(slug: string) {
  const programs = await getEducationPrograms();
  return programs.find((program) => program.slug === slug);
}

export async function getBlogStories() {
  return readJsonFile<BlogStory[]>(contentPath("blog-stories.json"));
}

export async function getBlogStoryById(id: number) {
  const stories = await getBlogStories();
  return stories.find((story) => story.id === id);
}

function storedProductsPath() {
  return path.join(config.storageDir, "products.json");
}

async function readStoredProducts(): Promise<Product[]> {
  await connectMongoDb();
  if (isMongoConnected()) {
    const db = getMongoDb();
    const docs = await db.collection("products").find({}).toArray();
    return docs.map((doc) => ({
      ...doc,
      id: doc._id.toString(),
    })) as unknown as Product[];
  }

  try {
    return await readJsonFile<Product[]>(storedProductsPath());
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

export async function addProduct(product: Omit<Product, "id">) {
  await connectMongoDb();
  const slug = product.slug || slugify(product.title);
  if (isMongoConnected()) {
    const db = getMongoDb();
    const now = new Date().toISOString();
    const doc = {
      ...product,
      slug,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection("products").insertOne(doc);
    return {
      id: result.insertedId.toString(),
      ...doc,
    } as unknown as Product;
  }

  await fs.mkdir(config.storageDir, { recursive: true });

  const existingProducts = await getProducts();
  const storedProducts = await readStoredProducts();
  const nextId = existingProducts.reduce((maxId, item) => {
    const numId = typeof item.id === "number" ? item.id : parseInt(String(item.id), 10);
    return isNaN(numId) ? maxId : Math.max(maxId, numId);
  }, 0) + 1;

  const nextProduct: Product = {
    id: nextId,
    ...product,
    slug,
  };

  storedProducts.push(nextProduct);
  await writeJsonFile(storedProductsPath(), storedProducts);

  return nextProduct;
}

export async function updateProduct(id: string | number, updates: Partial<Product>) {
  await connectMongoDb();
  if (updates.title && !updates.slug) {
    updates.slug = slugify(updates.title);
  }
  if (isMongoConnected()) {
    const db = getMongoDb();
    const filter = ObjectId.isValid(String(id)) ? { _id: new ObjectId(String(id)) } : { id };
    const now = new Date().toISOString();
    await db.collection("products").updateOne(filter, {
      $set: {
        ...updates,
        updatedAt: now,
      },
    });
    const updated = await db.collection("products").findOne(filter);
    if (!updated) return null;
    return {
      ...updated,
      id: updated._id.toString(),
    } as unknown as Product;
  }

  const storedProducts = await readStoredProducts();
  const productIndex = storedProducts.findIndex((p) => String(p.id) === String(id));
  if (productIndex === -1) {
    // If not in stored, try to find in seed products and duplicate into stored as override
    const seedProducts = await readJsonFile<Product[]>(contentPath("products.json"));
    const seedProduct = seedProducts.find((p) => String(p.id) === String(id));
    if (!seedProduct) return null;

    const nextProduct = {
      ...seedProduct,
      ...updates,
    };
    storedProducts.push(nextProduct);
    await writeJsonFile(storedProductsPath(), storedProducts);
    return nextProduct;
  }

  storedProducts[productIndex] = {
    ...storedProducts[productIndex],
    ...updates,
  };
  await writeJsonFile(storedProductsPath(), storedProducts);
  return storedProducts[productIndex];
}

export async function deleteProduct(id: string | number): Promise<boolean> {
  await connectMongoDb();
  if (isMongoConnected()) {
    const db = getMongoDb();
    const filter = ObjectId.isValid(String(id)) ? { _id: new ObjectId(String(id)) } : { id };
    const result = await db.collection("products").deleteOne(filter);
    return result.deletedCount > 0;
  }

  const storedProducts = await readStoredProducts();
  const nextProducts = storedProducts.filter((p) => String(p.id) !== String(id));
  if (storedProducts.length === nextProducts.length) {
    return false;
  }
  await writeJsonFile(storedProductsPath(), nextProducts);
  return true;
}
