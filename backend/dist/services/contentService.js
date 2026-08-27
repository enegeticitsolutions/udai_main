import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { readJsonFile, writeJsonFile } from "../lib/fileStore.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
function contentPath(fileName) {
    return path.join(config.frontendDataDir, fileName);
}
function backendContentPath(fileName) {
    return path.join(config.backendDataDir, fileName);
}
export async function getBlogPosts() {
    return readJsonFile(contentPath("blog.json"));
}
export async function getEvents() {
    return readJsonFile(contentPath("events.json"));
}
export async function getProducts() {
    return readStoredProducts();
}
export async function getTestimonials() {
    return readJsonFile(contentPath("testimonials.json"));
}
export async function getTherapists() {
    return readStoredTherapists({ includeInactive: false });
}
export async function getAllTherapists() {
    return readStoredTherapists({ includeInactive: true });
}
export async function getEducationPrograms() {
    return readJsonFile(contentPath("education-programs.json"));
}
export async function getCareers() {
    return readStoredCareers();
}
export async function getEducationProgramBySlug(slug) {
    const programs = await getEducationPrograms();
    return programs.find((program) => program.slug === slug);
}
export async function getBlogStories() {
    return readJsonFile(contentPath("blog-stories.json"));
}
export async function getBlogStoryById(id) {
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
    return readJsonFile(contentPath("therapists.json"));
}
function normalizeTherapistDocument(doc) {
    const { _id, ...therapist } = doc;
    return {
        ...therapist,
        id: therapist.id ?? _id?.toString(),
        image: normalizeUploadUrl(therapist.image, "/images/doctor2.png"),
        active: therapist.active ?? therapist.isActive ?? true,
    };
}
async function readSeedCareers() {
    return readJsonFile(backendContentPath("careers.json"));
}
async function readStoredTherapists({ includeInactive = false } = {}) {
    const filterTherapists = (therapists) => includeInactive ? therapists : therapists.filter((therapist) => therapist.active !== false && therapist.isActive !== false);
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
                const storedTherapists = await readJsonFile(jsonPath);
                if (storedTherapists.length > 0) {
                    console.log(`--> readStoredTherapists: Seeding ${storedTherapists.length} therapists from JSON into MongoDB.`);
                    const now = new Date().toISOString();
                    await collection.insertMany(storedTherapists.map((item) => ({
                        ...item,
                        createdAt: item.createdAt ?? now,
                        updatedAt: item.updatedAt ?? now,
                    })));
                    const processed = filterTherapists(storedTherapists.map((therapist) => normalizeTherapistDocument(therapist)));
                    return processed;
                }
            }
            catch (jsonErr) {
                console.warn("--> readStoredTherapists: Could not read fallback json file:", jsonErr?.message);
            }
        }
        catch (dbError) {
            console.error("--> readStoredTherapists: Error querying 'therapists' collection in MongoDB:", dbError.message);
        }
    }
    // Fallback to local storage JSON
    const jsonPath = storedTherapistsPath();
    console.log(`--> readStoredTherapists: Falling back to local JSON file: ${jsonPath}`);
    try {
        const storedTherapists = await readJsonFile(jsonPath);
        console.log(`--> readStoredTherapists: Loaded ${storedTherapists.length} therapists from JSON file.`);
        const processed = filterTherapists(storedTherapists.map((therapist) => normalizeTherapistDocument(therapist)));
        console.log(`--> readStoredTherapists: Returning ${processed.length} active therapists from JSON after filtering.`);
        return processed;
    }
    catch (error) {
        const err = error;
        console.error("--> readStoredTherapists: Error reading JSON fallback:", err.message);
        if (err.code !== "ENOENT") {
            throw error;
        }
        return [];
    }
}
function normalizeCareerDocument(doc) {
    const { _id, ...career } = doc;
    return {
        ...career,
        id: career.id ?? _id.toString(),
    };
}
function normalizeUploadUrl(url, defaultFallback = "/images/bag.png") {
    const value = String(url ?? "").trim();
    if (!value) {
        return defaultFallback;
    }
    // If the image points to dead/unreachable Supabase storage, map to valid local product images
    if (value.includes("smosbngvdtnzlsnnihwy.supabase.co")) {
        if (value.includes("264289046"))
            return "/images/bag.png";
        if (value.includes("580561876"))
            return "/images/item1.png";
        if (value.includes("31699126"))
            return "/images/candle.png";
        if (value.includes("488949944"))
            return "/images/item2.png";
        if (value.includes("832515811"))
            return "/images/foot.png";
        return "/images/shirt.png";
    }
    let uploadPath = "";
    if (value.startsWith("/uploads/")) {
        uploadPath = value;
    }
    else {
        try {
            const parsed = new URL(value);
            if ((parsed.hostname === "localhost" ||
                parsed.hostname === "127.0.0.1" ||
                parsed.hostname === "0.0.0.0") &&
                parsed.pathname.startsWith("/uploads/")) {
                uploadPath = parsed.pathname;
            }
        }
        catch {
            // Keep non-URL values such as /images/foo.png or valid external URLs unchanged.
        }
    }
    if (uploadPath) {
        return `${config.publicUploadBaseUrl}${uploadPath}`;
    }
    return value;
}
function normalizeProductDocument(doc) {
    const { _id, ...product } = doc;
    const gallery = Array.isArray(product.gallery) ? product.gallery.map((url) => normalizeUploadUrl(url)) : [];
    return {
        ...product,
        id: product.id ?? _id?.toString(),
        image: normalizeUploadUrl(product.image),
        gallery,
    };
}
function careerMongoFilter(id) {
    const stringId = String(id);
    const numericId = Number(stringId);
    const filters = [{ id: stringId }];
    if (!Number.isNaN(numericId)) {
        filters.push({ id: numericId });
    }
    if (ObjectId.isValid(stringId)) {
        filters.unshift({ _id: new ObjectId(stringId) });
    }
    return { $or: filters };
}
async function readStoredCareers() {
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
        return await readJsonFile(storedCareersPath());
    }
    catch (error) {
        const err = error;
        if (err.code !== "ENOENT") {
            throw error;
        }
        await fs.mkdir(config.storageDir, { recursive: true });
        const initialCareers = seedCareers.map((career) => ({ ...career, status: career.status ?? "open" }));
        await writeJsonFile(storedCareersPath(), initialCareers);
        return initialCareers;
    }
}
async function readStoredProducts() {
    await connectMongoDb();
    if (isMongoConnected()) {
        const db = getMongoDb();
        const docs = await db.collection("products").find({}).sort({ createdAt: -1 }).toArray();
        return docs.map((doc) => normalizeProductDocument(doc));
    }
    try {
        const products = await readJsonFile(storedProductsPath());
        return products.map((product) => normalizeProductDocument(product));
    }
    catch (error) {
        const err = error;
        if (err.code === "ENOENT") {
            return [];
        }
        throw error;
    }
}
function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w ]+/g, "")
        .replace(/ +/g, "-");
}
export async function addProduct(product) {
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
        };
    }
    await fs.mkdir(config.storageDir, { recursive: true });
    const existingProducts = await getProducts();
    const storedProducts = await readStoredProducts();
    const nextId = existingProducts.reduce((maxId, item) => {
        const numId = typeof item.id === "number" ? item.id : parseInt(String(item.id), 10);
        return isNaN(numId) ? maxId : Math.max(maxId, numId);
    }, 0) + 1;
    const nextProduct = {
        id: nextId,
        ...product,
        slug,
    };
    storedProducts.push(nextProduct);
    await writeJsonFile(storedProductsPath(), storedProducts);
    return nextProduct;
}
export async function updateProduct(id, updates) {
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
        if (!updated)
            return null;
        return {
            ...updated,
            id: updated._id.toString(),
        };
    }
    const storedProducts = await readStoredProducts();
    const productIndex = storedProducts.findIndex((p) => String(p.id) === String(id));
    if (productIndex === -1) {
        // If not in stored, try to find in seed products and duplicate into stored as override
        const seedProducts = await readJsonFile(contentPath("products.json"));
        const seedProduct = seedProducts.find((p) => String(p.id) === String(id));
        if (!seedProduct)
            return null;
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
export async function deleteProduct(id) {
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
export async function addCareer(career) {
    const careers = await readStoredCareers();
    await connectMongoDb();
    const now = new Date().toISOString();
    const nextCareer = { ...career, status: career.status ?? "open", createdAt: now, updatedAt: now };
    if (isMongoConnected()) {
        const result = await getMongoDb().collection("careers").insertOne(nextCareer);
        return { id: result.insertedId.toString(), ...nextCareer };
    }
    const record = { id: `CAR-${Date.now()}`, ...nextCareer };
    await writeJsonFile(storedCareersPath(), [record, ...careers]);
    return record;
}
export async function updateCareer(id, updates) {
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
    if (index === -1)
        return null;
    careers[index] = { ...careers[index], ...nextUpdates };
    await writeJsonFile(storedCareersPath(), careers);
    return careers[index];
}
export async function deleteCareer(id) {
    await connectMongoDb();
    if (isMongoConnected()) {
        const result = await getMongoDb().collection("careers").deleteOne(careerMongoFilter(id));
        return result.deletedCount > 0;
    }
    const careers = await readStoredCareers();
    const nextCareers = careers.filter((career) => String(career.id) !== String(id));
    if (careers.length === nextCareers.length)
        return false;
    await writeJsonFile(storedCareersPath(), nextCareers);
    return true;
}
