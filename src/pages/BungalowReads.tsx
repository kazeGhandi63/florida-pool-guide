import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tables } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Droplet, GlassWater, CheckCircle } from "lucide-react";
import { format } from "date-fns";

type Bungalow = Tables<"bungalows">;
type Treatment = Tables<"treatments">;
type BungalowWithTreatment = Bungalow & { last_treatment: Treatment | null };

const BungalowReads = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bungalows, setBungalows] = useState<BungalowWithTreatment[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBungalow, setSelectedBungalow] = useState<Bungalow | null>(null);
  const [newReadings, setNewReadings] = useState({ alkalinity: "", calcium: "" });

  useEffect(() => {
    const init = async () => {
      await fetchUser();
      await fetchBungalowsAndTreatments();
    };
    init();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const fetchBungalowsAndTreatments = async () => {
    setLoading(true);
    const { data: bungalowsData, error: bungalowsError } = await supabase.from("bungalows").select("*").order("name");

    if (bungalowsError) {
      toast({ title: "Error fetching bungalows", description: bungalowsError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const bungalowsWithTreatments = await Promise.all(
      bungalowsData.map(async (bungalow) => {
        const { data: treatmentData, error: treatmentError } = await supabase
          .from("treatments")
          .select("*")
          .eq("bungalow_id", bungalow.id)
          .order("treatment_date", { ascending: false })
          .limit(1)
          .single();
        
        if (treatmentError && treatmentError.code !== 'PGRST116') { // Ignore 'not found' errors
          console.error(`Error fetching treatment for bungalow ${bungalow.id}:`, treatmentError.message);
        }

        return { ...bungalow, last_treatment: treatmentData };
      })
    );

    setBungalows(bungalowsWithTreatments);
    setLoading(false);
  };

  const calculateTreatment = (alkalinity: number | null, calcium: number | null) => {
    const suggestions = [];
    let isBalanced = true;

    const alk = alkalinity ?? 0;
    const calc = calcium ?? 0;

    if (alkalinity !== null && alk < 80) {
      const bicarbCups = Math.round((80 - alk) / 20);
      if (bicarbCups > 0) {
        suggestions.push({ chemical: "Bicarb", cups: bicarbCups, icon: Droplet });
        isBalanced = false;
      }
    }

    if (calcium !== null && calc < 200) {
      const calciumCups = Math.round((200 - calc) / 40);
      if (calciumCups > 0) {
        suggestions.push({ chemical: "Calcium", cups: calciumCups, icon: GlassWater });
        isBalanced = false;
      }
    }

    return { suggestions, isBalanced };
  };

  const handleOpenDialog = (bungalow: Bungalow) => {
    setSelectedBungalow(bungalow);
    setNewReadings({ alkalinity: "", calcium: "" });
    setIsDialogOpen(true);
  };

  const handleLogTreatment = async () => {
    if (!selectedBungalow || !userId) return;

    const alkalinity_reading = parseFloat(newReadings.alkalinity);
    const calcium_reading = parseFloat(newReadings.calcium);

    if (isNaN(alkalinity_reading) || isNaN(calcium_reading)) {
      toast({ title: "Invalid input", description: "Please enter valid numbers for readings.", variant: "destructive" });
      return;
    }

    const { suggestions } = calculateTreatment(alkalinity_reading, calcium_reading);
    const alkalinity_treatment_cups = suggestions.find(s => s.chemical === 'Bicarb')?.cups || 0;
    const calcium_treatment_cups = suggestions.find(s => s.chemical === 'Calcium')?.cups || 0;

    const { error } = await supabase.from("treatments").insert({
      bungalow_id: selectedBungalow.id,
      user_id: userId,
      treatment_date: new Date().toISOString(),
      alkalinity_reading,
      calcium_reading,
      alkalinity_treatment_cups,
      calcium_treatment_cups,
    });

    if (error) {
      toast({ title: "Error Logging Treatment", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success!", description: `Treatment for ${selectedBungalow.name} logged.` });
      setIsDialogOpen(false);
      fetchBungalowsAndTreatments(); // Refresh data
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading Bungalow data...</div>;

  return (
    <>
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center print:hidden">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>← Back</Button>
            <h1 className="text-2xl font-bold text-center">Polynesian Bungalows - All Units</h1>
            <Button variant="outline" onClick={() => window.print()}>Print</Button>
          </div>
          
          <Tabs defaultValue="water-balanced" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto print:hidden">
              <TabsTrigger value="daily-reads" disabled>Daily Reads</TabsTrigger>
              <TabsTrigger value="tds" disabled>TDS (Weekly Reads)</TabsTrigger>
              <TabsTrigger value="water-balanced">Water Balanced</TabsTrigger>
            </TabsList>

            <TabsContent value="water-balanced" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bungalows.map((bungalow) => {
                  const { suggestions, isBalanced } = calculateTreatment(
                    bungalow.last_treatment?.alkalinity_reading ?? null,
                    bungalow.last_treatment?.calcium_reading ?? null
                  );
                  return (
                    <Card key={bungalow.id} className="print:break-inside-avoid">
                      <CardHeader>
                        <CardTitle>{bungalow.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Last reading: {bungalow.last_treatment ? format(new Date(bungalow.last_treatment.treatment_date!), "M/d/yyyy") : "N/A"}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-around text-center">
                          <div>
                            <Label className="text-muted-foreground">Alkalinity</Label>
                            <p className="text-2xl font-bold">{bungalow.last_treatment?.alkalinity_reading ?? "N/A"}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Calcium</Label>
                            <p className="text-2xl font-bold">{bungalow.last_treatment?.calcium_reading ?? "N/A"}</p>
                          </div>
                        </div>
                        <Card className="p-4 bg-secondary">
                          <h4 className="font-semibold mb-2">Suggested Treatment</h4>
                          {isBalanced ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="h-5 w-5" />
                              <p>Water is balanced. No treatment needed.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {suggestions.map(({ chemical, cups, icon: Icon }) => (
                                <div key={chemical} className="flex items-center gap-2">
                                  <Icon className="h-5 w-5 text-primary" />
                                  <p>Add <strong>{cups} {cups > 1 ? "cups" : "cup"}</strong> of {chemical}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>
                        <Button className="w-full" onClick={() => handleOpenDialog(bungalow)}>Log Treatment</Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log New Treatment for {selectedBungalow?.name}</DialogTitle>
            <DialogDescription>Enter the new readings below. The suggested treatment will be calculated and saved.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="alkalinity">Alkalinity Reading</Label>
              <Input id="alkalinity" type="number" value={newReadings.alkalinity} onChange={(e) => setNewReadings({...newReadings, alkalinity: e.target.value})} placeholder="e.g., 40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calcium">Calcium Reading</Label>
              <Input id="calcium" type="number" value={newReadings.calcium} onChange={(e) => setNewReadings({...newReadings, calcium: e.target.value})} placeholder="e.g., 120" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLogTreatment}>Save Treatment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BungalowReads;