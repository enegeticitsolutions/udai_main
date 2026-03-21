import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { About } from "./pages/About";
import { Programs } from "./pages/Programs";
import { Contact } from "./pages/Contact";
import { GetInvolved } from "./pages/GetInvolved";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "about", Component: About },
      { path: "programs", Component: Programs },
      { path: "get-involved", Component: GetInvolved },
      { path: "contact", Component: Contact },
    ],
  },
]);
