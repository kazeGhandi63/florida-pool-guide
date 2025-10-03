import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import MainLayout from "@/components/MainLayout";

type Resort = Tables<"resorts">;

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResorts();
  }, []);

  const fetchResorts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("resorts").select("*").order("name");
    if (error) {
      toast({ title: "Error fetching resorts", description: error.message, variant: "destructive" });
    } else {
      setResorts(data || []);
    }
    setLoading(false);
  };

  const handleResortClick = (resort: Resort) => {
    if (resort.name === "Polynesian Bungalows") {
      navigate("/bungalows");
    } else {
      navigate(`/resort/${resort.id}`);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Pool Reads Dashboard">
        <div>Loading resorts...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Pool Reads Dashboard">
      <Card>
        <CardHeader>
          <CardTitle>Select Resort</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {resorts.map((resort) => (
            <Button
              key={resort.id}
              variant="outline"
              className="w-full justify-start h-14 text-lg"
              onClick={() => handleResortClick(resort)}
            >
              {resort.name}
            </Button>
          ))}
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default Dashboard;