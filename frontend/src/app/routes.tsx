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
import { CorporateGifting } from "./pages/CorporateGifting";
import { EducationProgramDetail } from "./pages/EducationProgramDetail";
import { BlogStoryDetail } from "./pages/BlogStoryDetail";
import { Checkout } from "./pages/Checkout";
import { Cart } from "./pages/Cart";
import { Careers } from "./pages/Careers";
import { Appointment } from "./pages/Appointment";
import { AuthPage } from "./pages/AuthPage";
import { AccountOrders } from "./pages/AccountOrders";
import { DonationSuccess } from "./pages/DonationSuccess";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsOfService } from "./pages/TermsOfService";
import { ProjectDetail } from "./pages/ProjectDetail";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "about", Component: About },
      { path: "programs", Component: Programs },
      { path: "projects", Component: Projects },
      { path: "projects/:slug", Component: ProjectDetail },
      { path: "products", Component: Products },
      { path: "new-arrivals", Component: NewArrivals },
      { path: "corporate-gifting", Component: CorporateGifting },
      { path: "cart", Component: Cart },
      { path: "checkout", Component: Checkout },
      { path: "careers", Component: Careers },
      { path: "appointment", Component: Appointment },
      { path: "education/:slug", Component: EducationProgramDetail },
      { path: "stories/:id", Component: BlogStoryDetail },
      { path: "get-involved", Component: GetInvolved },
      { path: "contact", Component: Contact },
      { path: "auth", Component: AuthPage },
      { path: "account/orders", Component: AccountOrders },
      { path: "donation-success", Component: DonationSuccess },
      { path: "privacy-policy", Component: PrivacyPolicy },
      { path: "terms-of-service", Component: TermsOfService },
      { path: "terms", Component: TermsOfService },
    ],
  },
], {
  basename: import.meta.env.BASE_URL,
});
