import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { IkigaiSidebar, IkigaiMobileBar } from "@/components/ikigai-sidebar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <IkigaiSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <IkigaiMobileBar />
        <main className="flex-1 p-4 sm:p-6 md:p-10 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}