import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const MainLayout = ({ children, title }: { children: React.ReactNode; title: string }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const navItems = [
    { path: "/weekly-schedule", label: "Weekly Schedule" },
    { path: "/water-balanced", label: "Water Balanced" },
    { path: "/treatment-dashboard", label: "Treatment Dashboard" },
    { path: "/reports", label: "View Reports" },
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{title}</h1>
          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <Button key={item.path} variant="outline" onClick={() => navigate(item.path)}>
                {item.label}
              </Button>
            ))}
            <Button variant="outline" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;