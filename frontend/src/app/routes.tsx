import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { About } from "./pages/About";
import { Programs } from "./pages/Programs";
import { Projects } from "./pages/Projects";
import { Contact } from "./pages/Contact";
import { GetInvolved } from "./pages/GetInvolved";
import { Products } from "./pages/Products";
import { NewArrivals } from "./pages/NewArrivals";
import { EducationProgramDetail } from "./pages/EducationProgramDetail";
import { BlogStoryDetail } from "./pages/BlogStoryDetail";
import { Checkout } from "./pages/Checkout";
import { Careers } from "./pages/Careers";
import { Appointment } from "./pages/Appointment";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "about", Component: About },
      { path: "programs", Component: Programs },
      { path: "projects", Component: Projects },
      { path: "products", Component: Products },
      { path: "new-arrivals", Component: NewArrivals },
      { path: "checkout", Component: Checkout },
      { path: "careers", Component: Careers },
      { path: "appointment", Component: Appointment },
      { path: "education/:slug", Component: EducationProgramDetail },
      { path: "stories/:id", Component: BlogStoryDetail },
      { path: "get-involved", Component: GetInvolved },
      { path: "contact", Component: Contact },
    ],
  },
]);
