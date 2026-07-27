import { loginPage, renderDocument } from "./components.js";
import { setupLoginForm } from "./auth.js";

renderDocument("Login", loginPage());
setupLoginForm();
