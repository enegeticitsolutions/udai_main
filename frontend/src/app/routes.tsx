import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { About } from "./pages/About";
import { Programs } from "./pages/Programs";
import { Contact } from "./pages/Contact";
import { GetInvolved } from "./pages/GetInvolved";
import { Products } from "./pages/Products";
import { EducationProgramDetail } from "./pages/EducationProgramDetail";
import { BlogStoryDetail } from "./pages/BlogStoryDetail";
import { Checkout } from "./pages/Checkout";
import { Careers } from "./pages/Careers";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "about", Component: About },
      { path: "programs", Component: Programs },
      { path: "products", Component: Products },
      { path: "checkout", Component: Checkout },
      { path: "careers", Component: Careers },
      { path: "education/:slug", Component: EducationProgramDetail },
      { path: "stories/:id", Component: BlogStoryDetail },
      { path: "get-involved", Component: GetInvolved },
      { path: "contact", Component: Contact },
    ],
  },
]);
