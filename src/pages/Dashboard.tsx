import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const navItems = [
    { path: "/resorts", label: "Daily/Weekly Reads" },
    { path: "/bungalows", label: "Bungalows" },
    { path: "/weekly-schedule", label: "Weekly Schedule" },
    { path: "/reports", label: "View Reports" },
    { path: "/treatment-dashboard", label: "Treatment Dashboard" },
    { path: "/water-balanced", label: "Water Balanced" },
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome!</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="outline"
                className="w-full justify-between h-12 text-lg"
                onClick={() => navigate(item.path)}
              >
                {item.label}
                <ArrowRight className="h-5 w-5" />
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;