import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "leaflet/dist/leaflet.css";
import App from "./App.jsx";
import Supervisor from "./Supervisor.jsx";
import AdminClientes from "./AdminClientes.jsx";

const pathname = window.location.pathname;

function Root() {
  if (pathname === "/admin") {
    return <AdminClientes />;
  }
  if (pathname === "/supervisor") {
    return <Supervisor />;
  }
  return <App />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
