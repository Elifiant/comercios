import React, { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./supabase";
import App from "./App";
import Supervisor from "./Supervisor";
import AdminClientes from "./AdminClientes";
import AdminPromotores from "./AdminPromotores";
import PortalPagos from "./PortalPagos";
import MonitorPedidos from "./MonitorPedidos";
import WebComercial from "./WebComercial";

function EnrutadorSeguro() {
  const ruta = (window.location.pathname || "").toLowerCase();

  // 1. Rutas directas de gestión en Mac
  if (ruta.startsWith("/admin")) {
    return <AdminClientes />;
  }

  if (ruta.startsWith("/promotores")) {
    return <AdminPromotores />;
  }

  if (ruta.startsWith("/supervisor")) {
    return <Supervisor />;
  }

  if (ruta.startsWith("/pagos")) {
    return <PortalPagos />;
  }

  if (ruta.startsWith("/pedidos")) {
    return <MonitorPedidos />;
  }

  if (ruta.startsWith("/web")) {
    return <WebComercial />;
  }

  // 2. Ruta raíz o celular: App Móvil Preventa
  return <App />;
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <EnrutadorSeguro />
    </StrictMode>
  );
}
