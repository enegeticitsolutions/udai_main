import { Router } from "express";
import {
  addProduct,
  getBlogStoryById,
  getBlogStories,
  getBlogPosts,
  getCareers,
  getEducationProgramBySlug,
  getEducationPrograms,
  getEvents,
  getProducts,
  getTestimonials,
  getTherapists,
  updateProduct,
  deleteProduct,
} from "../services/contentService.js";
import { productSchema } from "../schemas.js";

export const contentRouter = Router();

contentRouter.get("/blog", async (_req, res, next) => {
  try {
    const posts = await getBlogPosts();
    res.json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/education-programs", async (_req, res, next) => {
  try {
    const programs = await getEducationPrograms();
    res.json({ success: true, data: programs });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/careers", async (_req, res, next) => {
  try {
    const careers = await getCareers();
    res.json({ success: true, data: careers });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/education-programs/:slug", async (req, res, next) => {
  try {
    const program = await getEducationProgramBySlug(req.params.slug);

    if (!program) {
      res.status(404).json({ success: false, message: "Education program not found" });
      return;
    }

    res.json({ success: true, data: program });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/blog-stories", async (_req, res, next) => {
  try {
    const stories = await getBlogStories();
    res.json({ success: true, data: stories });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/blog-stories/:id", async (req, res, next) => {
  try {
    const storyId = Number(req.params.id);
    const story = await getBlogStoryById(storyId);

    if (!story) {
      res.status(404).json({ success: false, message: "Story not found" });
      return;
    }

    res.json({ success: true, data: story });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/events", async (_req, res, next) => {
  try {
    const events = await getEvents();
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/products", async (req, res, next) => {
  try {
    const all = await getProducts();
    const typeFilter = req.query.type as string | undefined;
    const products =
      typeFilter === "gift"
        ? all.filter((p) => (p as any).isCorporateGift === true)
        : typeFilter === "product"
        ? all.filter((p) => !(p as any).isCorporateGift)
        : all;
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

contentRouter.post("/products", async (req, res, next) => {
  try {
    const payload = productSchema.parse(req.body);
    const product = await addProduct(payload);
    res.status(201).json({ success: true, data: product, message: "Product added successfully" });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/testimonials", async (_req, res, next) => {
  try {
    const testimonials = await getTestimonials();
    res.json({ success: true, data: testimonials });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/therapists", async (_req, res, next) => {
  try {
    const therapists = await getTherapists();
    res.json({ success: true, data: therapists });
  } catch (error) {
    next(error);
  }
});
