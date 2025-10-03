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

type Treatment = Tables<"treatments">;

type DisplayBungalow = {
  poolId: string;
  bungalowId: string;
  name: string;
  lastTreatment: Treatment | null;
};

type DailyReadValues = {
  chlorine?: string;
  ph?: string;
  temperature?: string;
  flow?: string;
  influent?: string;
  effluent?: string;
};

type WeeklyReadValues = {
  tds?: string;
  alkalinity?: string;
  calcium_hardness?: string;
  saturation_index?: string;
};

const BungalowReads = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [displayBungalows, setDisplayBungalows] = useState<DisplayBungalow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBungalow, setSelectedBungalow] = useState<DisplayBungalow | null>(null);
  const [newReadings, setNewReadings] = useState({ alkalinity: "", calcium: "" });
  const [dailyReads, setDailyReads] = useState<Record<string, DailyReadValues>>({});
  const [weeklyReads, setWeeklyReads] = useState<Record<string, WeeklyReadValues>>({});

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchBungalowData(user.id);
      } else {
        toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchBungalowData = async (currentUserId: string) => {
    setLoading(true);

    const { data: pools, error: poolsError } = await supabase
      .from("pools")
      .select("id, name, resorts!inner(name)")
      .eq("resorts.name", "Polynesian Bungalows");

    if (poolsError) {
      toast({ title: "Error fetching pools", description: poolsError.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    if (!pools || pools.length === 0) {
      toast({ title: "Info", description: "No bungalows found for Polynesian Resort in the 'pools' table." });
      setLoading(false);
      return;
    }

    const { data: existingBungalows, error: bungalowsError } = await supabase.from("bungalows").select("id, name");
    if (bungalowsError) {
      toast({ title: "Error fetching bungalows", description: bungalowsError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const existingBungalowNames = new Set(existingBungalows.map(b => b.name));
    const bungalowsToCreate = pools
      .filter(p => !existingBungalowNames.has(p.name))
      .map(p => ({ name: p.name, user_id: currentUserId }));

    if (bungalowsToCreate.length > 0) {
      const { error: insertError } = await supabase.from("bungalows").insert(bungalowsToCreate);
      if (insertError) {
        toast({ title: "Error setting up bungalows", description: insertError.message, variant: "destructive" });
        setLoading(false);
        return;
      }
    }

    const [bungalowsRes, treatmentsRes] = await Promise.all([
      supabase.from("bungalows").select("id, name"),
      supabase.from("treatments").select("*").order("treatment_date", { ascending: false }),
    ]);

    if (bungalowsRes.error || treatmentsRes.error) {
      toast({ title: "Error fetching data", description: "Could not load all necessary bungalow data.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const allBungalows = bungalowsRes.data || [];
    const allTreatments = treatmentsRes.data || [];
    const bungalowMap = new Map(allBungalows.map(b => [b.name, b.id]));

    const combinedData: DisplayBungalow[] = pools
      .map(pool => {
        const bungalowId = bungalowMap.get(pool.name);
        const lastTreatment = bungalowId ? allTreatments.find(t => t.bungalow_id === bungalowId) || null : null;
        return {
          poolId: pool.id,
          bungalowId: bungalowId || '',
          name: pool.name,
          lastTreatment: lastTreatment,
        };
      })
      .filter(b => b.bungalowId);

    combinedData.sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.name.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });

    setDisplayBungalows(combinedData);
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

  const handleOpenDialog = (bungalow: DisplayBungalow) => {
    setSelectedBungalow(bungalow);
    setNewReadings({ alkalinity: "", calcium: "" });
    setIsDialogOpen(true);
  };

  const handleLogTreatment = async () => {
    if (!selectedBungalow || !userId || !selectedBungalow.bungalowId) return;
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
      bungalow_id: selectedBungalow.bungalowId,
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
      if (userId) fetchBungalowData(userId);
    }
  };

  const handleDailyChange = (poolId: string, field: keyof DailyReadValues, value: string) => {
    setDailyReads(prev => ({ ...prev, [poolId]: { ...prev[poolId], [field]: value } }));
  };

  const handleWeeklyChange = (poolId: string, field: keyof WeeklyReadValues, value: string) => {
    setWeeklyReads(prev => ({ ...prev, [poolId]: { ...prev[poolId], [field]: value } }));
  };

  const handleSaveDaily = async () => {
    if (!userId) return;
    const readsToInsert = Object.entries(dailyReads)
      .filter(([, values]) => Object.values(values).some(v => v))
      .map(([poolId, values]) => ({
        pool_id: poolId,
        user_id: userId,
        ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === '' ? null : value]))
      }));
    if (readsToInsert.length === 0) {
      toast({ title: "No data to save", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("daily_reads").insert(readsToInsert);
    if (error) {
      toast({ title: "Error saving daily reads", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success!", description: "Daily reads have been saved." });
      setDailyReads({});
    }
  };

  const handleSaveWeekly = async () => {
    if (!userId) return;
    const readsToInsert = Object.entries(weeklyReads)
      .filter(([, values]) => Object.values(values).some(v => v))
      .map(([poolId, values]) => ({
        pool_id: poolId,
        user_id: userId,
        ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === '' ? null : value]))
      }));
    if (readsToInsert.length === 0) {
      toast({ title: "No data to save", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("weekly_reads").insert(readsToInsert);
    if (error) {
      toast({ title: "Error saving weekly reads", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success!", description: "Weekly reads have been saved." });
      setWeeklyReads({});
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
              <TabsTrigger value="daily-reads">Daily Reads</TabsTrigger>
              <TabsTrigger value="tds">TDS (Weekly Reads)</TabsTrigger>
              <TabsTrigger value="water-balanced">Water Balanced</TabsTrigger>
            </TabsList>

            <TabsContent value="daily-reads" className="space-y-6 mt-6">
              <div className="text-right print:hidden">
                <Button onClick={handleSaveDaily}>Save All Daily Reads</Button>
              </div>
              {displayBungalows.map(bungalow => {
                const values = dailyReads[bungalow.poolId] || {};
                return (
                  <Card key={bungalow.poolId}>
                    <CardHeader><CardTitle>{bungalow.name}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-6 gap-4">
                        <div className="space-y-1"><Label>Chlorine</Label><Input type="number" step="0.1" value={values.chlorine || ""} onChange={e => handleDailyChange(bungalow.poolId, 'chlorine', e.target.value)} /></div>
                        <div className="space-y-1"><Label>pH</Label><Input type="number" step="0.1" value={values.ph || ""} onChange={e => handleDailyChange(bungalow.poolId, 'ph', e.target.value)} /></div>
                        <div className="space-y-1"><Label>Temperature</Label><Input type="number" step="0.1" value={values.temperature || ""} onChange={e => handleDailyChange(bungalow.poolId, 'temperature', e.target.value)} /></div>
                        <div className="space-y-1"><Label>Flow</Label><Input type="number" step="0.1" value={values.flow || ""} onChange={e => handleDailyChange(bungalow.poolId, 'flow', e.target.value)} /></div>
                        <div className="space-y-1"><Label>Influent</Label><Input type="number" step="0.1" value={values.influent || ""} onChange={e => handleDailyChange(bungalow.poolId, 'influent', e.target.value)} /></div>
                        <div className="space-y-1"><Label>Effluent</Label><Input type="number" step="0.1" value={values.effluent || ""} onChange={e => handleDailyChange(bungalow.poolId, 'effluent', e.target.value)} /></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="tds" className="space-y-6 mt-6">
              <div className="text-right print:hidden">
                <Button onClick={handleSaveWeekly}>Save All Weekly Reads</Button>
              </div>
              {displayBungalows.map(bungalow => {
                const values = weeklyReads[bungalow.poolId] || {};
                return (
                  <Card key={bungalow.poolId}>
                    <CardHeader><CardTitle>{bungalow.name}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="space-y-1"><Label>TDS</Label><Input type="number" step="0.1" value={values.tds || ""} onChange={e => handleWeeklyChange(bungalow.poolId, 'tds', e.target.value)} /></div>
                        <div className="space-y-1"><Label>Alkalinity</Label><Input type="number" step="0.1" value={values.alkalinity || ""} onChange={e => handleWeeklyChange(bungalow.poolId, 'alkalinity', e.target.value)} /></div>
                        <div className="space-y-1"><Label>Calcium Hardness</Label><Input type="number" step="0.1" value={values.calcium_hardness || ""} onChange={e => handleWeeklyChange(bungalow.poolId, 'calcium_hardness', e.target.value)} /></div>
                        <div className="space-y-1"><Label>Saturation Index</Label><Input type="number" step="0.1" value={values.saturation_index || ""} onChange={e => handleWeeklyChange(bungalow.poolId, 'saturation_index', e.target.value)} /></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="water-balanced" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayBungalows.map((bungalow) => {
                  const { suggestions, isBalanced } = calculateTreatment(
                    bungalow.lastTreatment?.alkalinity_reading ?? null,
                    bungalow.lastTreatment?.calcium_reading ?? null
                  );
                  return (
                    <Card key={bungalow.poolId} className="print:break-inside-avoid">
                      <CardHeader>
                        <CardTitle>{bungalow.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Last reading: {bungalow.lastTreatment ? format(new Date(bungalow.lastTreatment.treatment_date!), "M/d/yyyy") : "N/A"}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-around text-center">
                          <div>
                            <Label className="text-muted-foreground">Alkalinity</Label>
                            <p className="text-2xl font-bold">{bungalow.lastTreatment?.alkalinity_reading ?? "N/A"}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Calcium</Label>
                            <p className="text-2xl font-bold">{bungalow.lastTreatment?.calcium_reading ?? "N/A"}</p>
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