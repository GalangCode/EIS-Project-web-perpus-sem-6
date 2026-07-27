import { loginPage, renderDocument } from "../shared/components.js";
import { setupLoginForm } from "../shared/auth.js";

renderDocument("Login Kepala", loginPage("kepala"));
setupLoginForm("kepala");
