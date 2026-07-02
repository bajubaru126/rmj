
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/globals.css";
import "./styles/liquid.css";
import './styles/aggrid-utilities.css';
import './styles/shadcn-overrides.css';
import './styles/dashboard-map.css';

createRoot(document.getElementById("root")!).render(<App />);
