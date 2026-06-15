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
  return readStoredTherapists({ includeInactive: false });
}

export async function getAllTherapists() {
  return readStoredTherapists({ includeInactive: true });
}

export async function getEducationPrograms() {
  return readJsonFile<EducationProgram[]>(contentPath("education-programs.json"));
}

export async function getCareers() {
  return readStoredCareers();
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

function storedCareersPath() {
  return path.join(config.storageDir, "careers.json");
}

function storedTherapistsPath() {
  return path.join(config.storageDir, "therapists.json");
}

async function readSeedTherapists() {
  return readJsonFile<Therapist[]>(contentPath("therapists.json"));
}

function normalizeTherapistDocument(doc: Record<string, any>): Therapist {
  const { _id, ...therapist } = doc;
  return {
    ...therapist,
    id: therapist.id ?? _id?.toString(),
    image: therapist.image || "/images/doctor2.png",
    active: therapist.active ?? therapist.isActive ?? true,
  } as Therapist;
}

async function readSeedCareers() {
  return readJsonFile<CareerOpportunity[]>(backendContentPath("careers.json"));
}

async function readStoredTherapists({ includeInactive = false } = {}): Promise<Therapist[]> {
  const filterTherapists = (therapists: Therapist[]) =>
    includeInactive ? therapists : therapists.filter((therapist) => therapist.active !== false && therapist.isActive !== false);
  const seedTherapists = await readSeedTherapists();
  await connectMongoDb();

  if (isMongoConnected()) {
    const db = getMongoDb();
    const collection = db.collection("therapists");
    const existingCount = await collection.countDocuments();
    if (existingCount === 0 && seedTherapists.length > 0) {
      const now = new Date().toISOString();
      await collection.insertMany(seedTherapists.map((therapist) => ({
        ...therapist,
        active: therapist.active ?? true,
        createdAt: now,
        updatedAt: now,
      })));
    }

    const docs = await collection.find({}).sort({ createdAt: -1 }).toArray();
    return filterTherapists(docs.map((doc) => normalizeTherapistDocument(doc)));
  }

  try {
    const storedTherapists = await readJsonFile<Therapist[]>(storedTherapistsPath());
    const therapistMap = new Map<string, Therapist>();
    seedTherapists.forEach((therapist) => {
      const normalized = normalizeTherapistDocument(therapist as Record<string, any>);
      therapistMap.set(String(normalized.id), normalized);
    });
    storedTherapists.forEach((therapist) => {
      const normalized = normalizeTherapistDocument(therapist as Record<string, any>);
      therapistMap.set(String(normalized.id), { ...(therapistMap.get(String(normalized.id)) ?? {}), ...normalized });
    });
    return filterTherapists(Array.from(therapistMap.values()));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") {
      throw error;
    }

    await fs.mkdir(config.storageDir, { recursive: true });
    const initialTherapists = seedTherapists.map((therapist) => ({ ...therapist, active: therapist.active ?? true }));
    await writeJsonFile(storedTherapistsPath(), initialTherapists);
    return filterTherapists(initialTherapists);
  }
}

function normalizeCareerDocument(doc: Record<string, any>): CareerOpportunity {
  const { _id, ...career } = doc;
  return {
    ...career,
    id: career.id ?? _id.toString(),
  } as CareerOpportunity;
}

function careerMongoFilter(id: string | number) {
  const stringId = String(id);
  const numericId = Number(stringId);
  const filters: Record<string, unknown>[] = [{ id: stringId }];

  if (!Number.isNaN(numericId)) {
    filters.push({ id: numericId });
  }

  if (ObjectId.isValid(stringId)) {
    filters.unshift({ _id: new ObjectId(stringId) });
  }

  return { $or: filters };
}

async function readStoredCareers(): Promise<CareerOpportunity[]> {
  const seedCareers = await readSeedCareers();
  await connectMongoDb();

  if (isMongoConnected()) {
    const db = getMongoDb();
    const collectionExists = await db.listCollections({ name: "careers" }, { nameOnly: true }).hasNext();
    const collection = db.collection("careers");
    if (!collectionExists && seedCareers.length > 0) {
      const now = new Date().toISOString();
      await collection.insertMany(seedCareers.map((career) => ({ ...career, status: career.status ?? "open", createdAt: now, updatedAt: now })));
    }

    const docs = await collection.find({}).sort({ createdAt: -1 }).toArray();
    return docs.map((doc) => normalizeCareerDocument(doc));
  }

  try {
    return await readJsonFile<CareerOpportunity[]>(storedCareersPath());
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") {
      throw error;
    }

    await fs.mkdir(config.storageDir, { recursive: true });
    const initialCareers = seedCareers.map((career) => ({ ...career, status: career.status ?? "open" }));
    await writeJsonFile(storedCareersPath(), initialCareers);
    return initialCareers;
  }
}

async function readStoredProducts(): Promise<Product[]> {
  await connectMongoDb();
  if (isMongoConnected()) {
    const db = getMongoDb();
    const docs = await db.collection("products").find({}).sort({ createdAt: -1 }).toArray();
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

export async function addCareer(career: Omit<CareerOpportunity, "id">) {
  const careers = await readStoredCareers();
  await connectMongoDb();
  const now = new Date().toISOString();
  const nextCareer = { ...career, status: career.status ?? "open", createdAt: now, updatedAt: now };

  if (isMongoConnected()) {
    const result = await getMongoDb().collection("careers").insertOne(nextCareer);
    return { id: result.insertedId.toString(), ...nextCareer } as CareerOpportunity;
  }

  const record = { id: `CAR-${Date.now()}`, ...nextCareer } as CareerOpportunity;
  await writeJsonFile(storedCareersPath(), [record, ...careers]);
  return record;
}

export async function updateCareer(id: string | number, updates: Partial<CareerOpportunity>) {
  await connectMongoDb();
  const nextUpdates = { ...updates, updatedAt: new Date().toISOString() };

  if (isMongoConnected()) {
    const collection = getMongoDb().collection("careers");
    const filter = careerMongoFilter(id);
    await collection.updateOne(filter, { $set: nextUpdates });
    const updated = await collection.findOne(filter);
    return updated ? normalizeCareerDocument(updated) : null;
  }

  const careers = await readStoredCareers();
  const index = careers.findIndex((career) => String(career.id) === String(id));
  if (index === -1) return null;
  careers[index] = { ...careers[index], ...nextUpdates };
  await writeJsonFile(storedCareersPath(), careers);
  return careers[index];
}

export async function deleteCareer(id: string | number): Promise<boolean> {
  await connectMongoDb();

  if (isMongoConnected()) {
    const result = await getMongoDb().collection("careers").deleteOne(careerMongoFilter(id));
    return result.deletedCount > 0;
  }

  const careers = await readStoredCareers();
  const nextCareers = careers.filter((career) => String(career.id) !== String(id));
  if (careers.length === nextCareers.length) return false;
  await writeJsonFile(storedCareersPath(), nextCareers);
  return true;
}
