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

export async function getEvents(): Promise<EventItem[]> {
  return readStoredEvents();
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
    image: normalizeUploadUrl(therapist.image, "/images/doctor2.png"),
    active: therapist.active ?? therapist.isActive ?? true,
  } as Therapist;
}

async function readSeedCareers() {
  return readJsonFile<CareerOpportunity[]>(backendContentPath("careers.json"));
}

async function readStoredTherapists({ includeInactive = false } = {}): Promise<Therapist[]> {
  const filterTherapists = (therapists: Therapist[]) =>
    includeInactive ? therapists : therapists.filter((therapist) => therapist.active !== false && therapist.isActive !== false);

  console.log("--> readStoredTherapists: Starting fetch. Attempting to connect to MongoDB...");
  await connectMongoDb();

  if (isMongoConnected()) {
    console.log("--> readStoredTherapists: MongoDB is connected! Querying 'therapists' collection...");
    const db = getMongoDb();
    const collection = db.collection("therapists");

    try {
      const docs = await collection.find({}).sort({ createdAt: -1 }).toArray();
      console.log(`--> readStoredTherapists: Successfully fetched ${docs.length} documents from MongoDB.`);
      if (docs.length > 0) {
        const processed = filterTherapists(docs.map((doc) => normalizeTherapistDocument(doc)));
        console.log(`--> readStoredTherapists: Returning ${processed.length} active therapists from MongoDB after filtering.`);
        return processed;
      }

      // If MongoDB collection is empty, seed from local therapists.json
      const jsonPath = storedTherapistsPath();
      try {
        const storedTherapists = await readJsonFile<Therapist[]>(jsonPath);
        if (storedTherapists.length > 0) {
          console.log(`--> readStoredTherapists: Seeding ${storedTherapists.length} therapists from JSON into MongoDB.`);
          const now = new Date().toISOString();
          await collection.insertMany(
            storedTherapists.map((item) => ({
              ...item,
              createdAt: item.createdAt ?? now,
              updatedAt: item.updatedAt ?? now,
            }))
          );
          const processed = filterTherapists(
            storedTherapists.map((therapist) => normalizeTherapistDocument(therapist as Record<string, any>))
          );
          return processed;
        }
      } catch (jsonErr: any) {
        console.warn("--> readStoredTherapists: Could not read fallback json file:", jsonErr?.message);
      }
    } catch (dbError: any) {
      console.error("--> readStoredTherapists: Error querying 'therapists' collection in MongoDB:", dbError.message);
    }
  }

  // Fallback to local storage JSON
  const jsonPath = storedTherapistsPath();
  console.log(`--> readStoredTherapists: Falling back to local JSON file: ${jsonPath}`);

  try {
    const storedTherapists = await readJsonFile<Therapist[]>(jsonPath);
    console.log(`--> readStoredTherapists: Loaded ${storedTherapists.length} therapists from JSON file.`);
    const processed = filterTherapists(
      storedTherapists.map((therapist) => normalizeTherapistDocument(therapist as Record<string, any>))
    );
    console.log(`--> readStoredTherapists: Returning ${processed.length} active therapists from JSON after filtering.`);
    return processed;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    console.error("--> readStoredTherapists: Error reading JSON fallback:", err.message);
    if (err.code !== "ENOENT") {
      throw error;
    }
    return [];
  }
}

function normalizeCareerDocument(doc: Record<string, any>): CareerOpportunity {
  const { _id, ...career } = doc;
  return {
    ...career,
    id: career.id ?? _id.toString(),
  } as CareerOpportunity;
}

function normalizeUploadUrl(url: unknown, defaultFallback: string = "/images/bag.png") {
  const value = String(url ?? "").trim();
  if (!value) {
    return defaultFallback;
  }

  // If the image points to dead/unreachable Supabase storage, map to valid local product images
  if (value.includes("smosbngvdtnzlsnnihwy.supabase.co")) {
    if (value.includes("264289046")) return "/images/bag.png";
    if (value.includes("580561876")) return "/images/item1.png";
    if (value.includes("31699126")) return "/images/candle.png";
    if (value.includes("488949944")) return "/images/item2.png";
    if (value.includes("832515811")) return "/images/foot.png";
    return "/images/shirt.png";
  }

  let uploadPath = "";
  if (value.startsWith("/uploads/")) {
    uploadPath = value;
  } else {
    try {
      const parsed = new URL(value);
      if (
        (parsed.hostname === "localhost" ||
          parsed.hostname === "127.0.0.1" ||
          parsed.hostname === "0.0.0.0") &&
        parsed.pathname.startsWith("/uploads/")
      ) {
        uploadPath = parsed.pathname;
      }
    } catch {
      // Keep non-URL values such as /images/foo.png or valid external URLs unchanged.
    }
  }

  if (uploadPath) {
    return `${config.publicUploadBaseUrl}${uploadPath}`;
  }

  return value;
}

function normalizeProductDocument(doc: Record<string, any>): Product {
  const { _id, ...product } = doc;
  const gallery = Array.isArray(product.gallery) ? product.gallery.map((url: unknown) => normalizeUploadUrl(url)) : [];

  return {
    ...product,
    id: product.id ?? _id?.toString(),
    image: normalizeUploadUrl(product.image),
    gallery,
  } as Product;
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
    return docs.map((doc) => normalizeProductDocument(doc));
  }

  try {
    const products = await readJsonFile<Product[]>(storedProductsPath());
    return products.map((product) => normalizeProductDocument(product as Record<string, any>));
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

function productMongoFilter(id: string | number) {
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

export async function updateProduct(id: string | number, updates: Partial<Product>) {
  await connectMongoDb();
  if (updates.title && !updates.slug) {
    updates.slug = slugify(updates.title);
  }
  const { _id, ...cleanUpdates } = updates as any;
  if (isMongoConnected()) {
    const db = getMongoDb();
    const filter = productMongoFilter(id);
    const now = new Date().toISOString();
    await db.collection("products").updateOne(filter, {
      $set: {
        ...cleanUpdates,
        updatedAt: now,
      },
    });
    const updated = await db.collection("products").findOne(filter);
    if (!updated) return null;
    return normalizeProductDocument(updated);
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
      ...cleanUpdates,
    };
    storedProducts.push(nextProduct);
    await writeJsonFile(storedProductsPath(), storedProducts);
    return nextProduct;
  }

  storedProducts[productIndex] = {
    ...storedProducts[productIndex],
    ...cleanUpdates,
  };
  await writeJsonFile(storedProductsPath(), storedProducts);
  return storedProducts[productIndex];
}

export async function deleteProduct(id: string | number): Promise<boolean> {
  await connectMongoDb();
  if (isMongoConnected()) {
    const db = getMongoDb();
    const filter = productMongoFilter(id);
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

function storedEventsPath() {
  return path.join(config.storageDir, "events.json");
}

function normalizeEventDocument(doc: Record<string, any>): EventItem {
  const { _id, ...event } = doc;
  return {
    ...event,
    id: event.id ?? _id?.toString(),
    image: normalizeUploadUrl(event.image, "/images/project2.png"),
    isRoadmap: Boolean(event.isRoadmap),
  } as EventItem;
}

function eventMongoFilter(id: string | number) {
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

export async function readStoredEvents(): Promise<EventItem[]> {
  await connectMongoDb();

  if (isMongoConnected()) {
    const db = getMongoDb();
    const collection = db.collection("events");

    try {
      const docs = await collection.find({}).sort({ date: 1, createdAt: -1 }).toArray();
      if (docs.length > 0) {
        return docs.map((doc) => normalizeEventDocument(doc));
      }

      // If MongoDB collection is empty, seed from contentPath("events.json")
      try {
        const seedEvents = await readJsonFile<EventItem[]>(contentPath("events.json"));
        if (seedEvents.length > 0) {
          const now = new Date().toISOString();
          await collection.insertMany(
            seedEvents.map((item) => ({
              ...item,
              isRoadmap: Boolean(item.isRoadmap),
              createdAt: item.createdAt ?? now,
              updatedAt: item.updatedAt ?? now,
            }))
          );
          return seedEvents.map((ev) => normalizeEventDocument(ev as Record<string, any>));
        }
      } catch {}
    } catch (e) {
      console.warn("Failed to query MongoDB events collection, falling back:", e);
    }
  }

  try {
    const stored = await readJsonFile<EventItem[]>(storedEventsPath());
    if (stored && stored.length > 0) {
      return stored.map((e) => normalizeEventDocument(e as Record<string, any>));
    }
  } catch {}

  try {
    const seed = await readJsonFile<EventItem[]>(contentPath("events.json"));
    return (seed || []).map((e) => normalizeEventDocument(e as Record<string, any>));
  } catch {
    return [];
  }
}

export async function addEvent(event: Omit<EventItem, "id">): Promise<EventItem> {
  const events = await readStoredEvents();
  await connectMongoDb();
  const now = new Date().toISOString();
  const nextEvent = {
    ...event,
    isRoadmap: Boolean(event.isRoadmap),
    createdAt: now,
    updatedAt: now,
  };

  if (isMongoConnected()) {
    const result = await getMongoDb().collection("events").insertOne(nextEvent);
    return { id: result.insertedId.toString(), ...nextEvent } as EventItem;
  }

  const record = { id: `EVT-${Date.now()}`, ...nextEvent } as EventItem;
  await writeJsonFile(storedEventsPath(), [record, ...events]);
  return record;
}

export async function updateEvent(id: string | number, updates: Partial<EventItem>): Promise<EventItem | null> {
  await connectMongoDb();
  const nextUpdates = { ...updates, updatedAt: new Date().toISOString() };

  if (isMongoConnected()) {
    const collection = getMongoDb().collection("events");
    const filter = eventMongoFilter(id);
    await collection.updateOne(filter, { $set: nextUpdates });
    const updated = await collection.findOne(filter);
    return updated ? normalizeEventDocument(updated) : null;
  }

  const events = await readStoredEvents();
  const index = events.findIndex((e) => String(e.id) === String(id));
  if (index === -1) return null;
  events[index] = { ...events[index], ...nextUpdates };
  await writeJsonFile(storedEventsPath(), events);
  return events[index];
}

export async function deleteEvent(id: string | number): Promise<boolean> {
  await connectMongoDb();

  if (isMongoConnected()) {
    const result = await getMongoDb().collection("events").deleteOne(eventMongoFilter(id));
    return result.deletedCount > 0;
  }

  const events = await readStoredEvents();
  const nextEvents = events.filter((e) => String(e.id) !== String(id));
  if (events.length === nextEvents.length) return false;
  await writeJsonFile(storedEventsPath(), nextEvents);
  return true;
}

