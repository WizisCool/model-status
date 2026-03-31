import { AdminPanel } from "./pages/AdminPanel";
import { PublicDashboard } from "./pages/PublicDashboard";
import { getAdminRoute } from "./preferences";

export function App() {
  return getAdminRoute() ? <AdminPanel /> : <PublicDashboard />;
}
