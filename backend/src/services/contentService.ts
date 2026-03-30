import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { readJsonFile, writeJsonFile } from "../lib/fileStore.js";
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
  const seedProducts = await readJsonFile<Product[]>(contentPath("products.json"));
  const storedProducts = await readStoredProducts();
  return [...seedProducts, ...storedProducts];
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

async function readStoredProducts() {
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

export async function addProduct(product: Omit<Product, "id">) {
  await fs.mkdir(config.storageDir, { recursive: true });

  const existingProducts = await getProducts();
  const storedProducts = await readStoredProducts();
  const nextId = existingProducts.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;

  const nextProduct: Product = {
    id: nextId,
    ...product,
  };

  storedProducts.push(nextProduct);
  await writeJsonFile(storedProductsPath(), storedProducts);

  return nextProduct;
}
