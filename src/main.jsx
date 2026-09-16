import PortalPagos from "./PortalPagos";
import MonitorPedidos from './MonitorPedidos';
import { StrictMode } from "react"; import { createRoot } from "react-dom/client"; import "./index.css"; import App from "./App.jsx"; import Supervisor from "./Supervisor.jsx"; import AdminClientes from "./AdminClientes.jsx"; import WebComercial from "./WebComercial.jsx";

const ruta = window.location.pathname;

let Componente = App; if (ruta.startsWith("/pagos")) { Componente = PortalPagos; } else if (ruta.startsWith("/supervisor")) { Componente = Supervisor; } else if (ruta.startsWith("/admin")) { Componente = AdminClientes; } else if (ruta.startsWith("/web")) { Componente = WebComercial; } else if (ruta.startsWith("/pedidos")) { Componente = MonitorPedidos; }

createRoot(document.getElementById("root")).render(

<StrictMode>
<Componente />
</StrictMode>
); 