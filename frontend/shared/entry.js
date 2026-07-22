import { renderPage } from "./pages.js";

const { page = "login", title = "EIS Balangan" } = document.body.dataset;

renderPage(page, title);
