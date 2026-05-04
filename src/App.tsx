import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Welcome from "@/pages/Welcome";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Partners from "@/pages/Partners";
import PartnerDetail from "@/pages/PartnerDetail";
import Campaigns from "@/pages/Campaigns";
import Visitors from "@/pages/Visitors";
import Users from "@/pages/Users";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/welcome" component={Welcome} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/">
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      </Route>
      <Route path="/partners">
        <RequireAuth>
          <Partners />
        </RequireAuth>
      </Route>
      <Route path="/partners/:partnerId">
        <RequireAuth>
          <PartnerDetail />
        </RequireAuth>
      </Route>
      <Route path="/campaigns">
        <RequireAuth>
          <Campaigns />
        </RequireAuth>
      </Route>
      <Route path="/visitors">
        <RequireAuth>
          <Visitors />
        </RequireAuth>
      </Route>
      <Route path="/users">
        <RequireAuth>
          <Users />
        </RequireAuth>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
