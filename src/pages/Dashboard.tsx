import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Resort = {
  id: string;
  name: string;
};

type Pool = {
  id: string;
  name: string;
  pool_type: string;
};

const Dashboard = () => {
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [selectedResort, setSelectedResort] = useState<string | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchResorts();
  }, []);

  useEffect(() => {
    if (selectedResort) {
      fetchPools(selectedResort);
    }
  }, [selectedResort]);

  const fetchResorts = async () => {
    const { data, error } = await supabase.from("resorts").select("*").order("name");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setResorts(data || []);
    }
  };

  const fetchPools = async (resortId: string) => {
    const { data, error } = await supabase
      .from("pools")
      .select("*, resorts(name)")
      .eq("resort_id", resortId)
      .order("name");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setPools(data || []);
      // Check if this is Polynesian Bungalows
      const resortName = (data?.[0] as any)?.resorts?.name;
      if (resortName === "Polynesian Bungalows") {
        navigate("/bungalows");
      }
    }
  };

  const handleResortSelect = (resortId: string, resortName: string) => {
    if (resortName === "Polynesian Bungalows") {
      navigate("/bungalows");
    } else {
      navigate(`/resort/${resortId}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Pool Reads Dashboard</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/water-balanced")}>
              Water Balance
            </Button>
            <Button variant="outline" onClick={() => navigate("/reports")}>
              View Reports
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Resort</CardTitle>
          </CardHeader>
            <CardContent className="space-y-2">
              {resorts.map((resort) => (
                <Button
                  key={resort.id}
                  variant="outline"
                  className="w-full"
                  onClick={() => handleResortSelect(resort.id, resort.name)}
                >
                  {resort.name}
                </Button>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;