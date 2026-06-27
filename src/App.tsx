import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { RequireAuth, RedirectIfAuth } from "@/lib/guards";
import { AppShell } from "@/components/layout/AppShell";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import ResetPassword from "@/pages/auth/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import FlowsList from "@/pages/flows/FlowsList";
import FlowEditor from "@/pages/flows/FlowEditor";
import Keywords from "@/pages/automation/Keywords";
import Sequences from "@/pages/automation/Sequences";
import Webhooks from "@/pages/automation/Webhooks";
import InboxPage from "@/features/inbox/pages/InboxPage";
import ContactsPage from "@/features/contacts/pages/ContactsPage";
import TagsPage from "@/features/tags/pages/TagsPage";
import QuickRepliesPage from "@/features/quick-replies/pages/QuickRepliesPage";
import ConnectionsPage from "@/features/connections/pages/ConnectionsPage";
import Settings from "@/pages/Settings";
import DevNotes from "@/pages/DevNotes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={150}>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
            <Route path="/signup" element={<RedirectIfAuth><Signup /></RedirectIfAuth>} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<RequireAuth><AppShell /></RequireAuth>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/flows" element={<FlowsList />} />
              <Route path="/flows/:id" element={<FlowEditor />} />
              <Route path="/automation/keywords" element={<Keywords />} />
              <Route path="/automation/sequences" element={<Sequences />} />
              <Route path="/automation/webhooks" element={<Webhooks />} />
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/inbox/:conversationId" element={<InboxPage />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/tags" element={<TagsPage />} />
              <Route path="/quick-replies" element={<QuickRepliesPage />} />

              <Route path="/connections" element={<Connections />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/dev-notes" element={<DevNotes />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
