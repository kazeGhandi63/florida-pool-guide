import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { calculateLSI } from "@/lib/lsi";
import { calculateAlkalinityTreatment, calculateCalciumTreatment } from "@/lib/treatments";

type DailyReadValues = {
  chlorine?: string;
  ph?: string;
  temperature?: string;
  flow?: string;
  work_order_1?: string;
  work_order_2?: string;
  // Using existing DB fields for the new checkboxes: decoin -> ACID, tiles -> CHLORINE
  decoin?: boolean;
  tiles?: boolean;
};

type WeeklyReadValues = {
  tds?: string;
  alkalinity?: string;
  calcium_hardness?: string;
  saturation_index?: string;
  alkalinity_treatment_cups?: string;
  calcium_treatment_cups?: string;
};

// Add bungalow_id to the state to link pools with the treatments table
type Bungalow = { id: string; name: string; bungalow_id: string };

const BungalowReads = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bungalows, setBungalows] = useState<Bungalow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

    // 1. Fetch pools that are bungalows
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

    // 2. Ensure a corresponding entry exists in the 'bungalows' table for each pool
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
      }
    }

    // 3. Refetch all bungalows to get their specific IDs from the 'bungalows' table
    const { data: allBungalows, error: allBungalowsError } = await supabase.from("bungalows").select("id, name");
    if (allBungalowsError) {
      toast({ title: "Error fetching bungalow IDs", description: allBungalowsError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // 4. Map pool IDs to bungalow IDs using the name as the key
    const bungalowIdMap = new Map(allBungalows.map(b => [b.name, b.id]));
    const enrichedBungalows = pools
      .map(pool => ({
        ...pool,
        bungalow_id: bungalowIdMap.get(pool.name) || "",
      }))
      .filter(b => b.bungalow_id); // Ensure we have a valid bungalow_id

    enrichedBungalows.sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.name.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });

    setBungalows(enrichedBungalows);
    setLoading(false);
  };

  const recalculateDependentValues = (dailyValues: DailyReadValues, weeklyValues: WeeklyReadValues): Partial<WeeklyReadValues> => {
    const newWeekly: Partial<WeeklyReadValues> = {};

    const ph = dailyValues.ph ? parseFloat(dailyValues.ph) : null;
    const temp = dailyValues.temperature ? parseFloat(dailyValues.temperature) : null;
    const alk = weeklyValues.alkalinity ? parseFloat(weeklyValues.alkalinity) : null;
    const ch = weeklyValues.calcium_hardness ? parseFloat(weeklyValues.calcium_hardness) : null;

    const lsi = calculateLSI(ph, temp, ch, alk);
    newWeekly.saturation_index = lsi !== null ? lsi.toString() : "";

    const alkTreatment = calculateAlkalinityTreatment(alk);
    newWeekly.alkalinity_treatment_cups = alkTreatment > 0 ? alkTreatment.toString() : "";

    const calciumTreatment = calculateCalciumTreatment(ch);
    newWeekly.calcium_treatment_cups = calciumTreatment > 0 ? calciumTreatment.toString() : "";

    return newWeekly;
  };

  const handleDailyChange = (poolId: string, field: keyof DailyReadValues, value: string | boolean) => {
    setDailyReads(prevDaily => {
      const newDailyReads = { ...prevDaily, [poolId]: { ...(prevDaily[poolId] || {}), [field]: value } };

      if (field === 'ph' || field === 'temperature') {
        setWeeklyReads(prevWeekly => {
          const currentWeekly = prevWeekly[poolId] || {};
          const updatedValues = recalculateDependentValues(newDailyReads[poolId], currentWeekly);
          return { ...prevWeekly, [poolId]: { ...currentWeekly, ...updatedValues } };
        });
      }
      
      return newDailyReads;
    });
  };

  const handleWeeklyChange = (poolId: string, field: keyof WeeklyReadValues, value: string) => {
    setWeeklyReads(prevWeekly => {
      const newWeeklyReads = { ...prevWeekly, [poolId]: { ...(prevWeekly[poolId] || {}), [field]: value } };
      const currentDaily = dailyReads[poolId] || {};
      const updatedValues = recalculateDependentValues(currentDaily, newWeeklyReads[poolId]);
      return { ...prevWeekly, [poolId]: { ...newWeeklyReads[poolId], ...updatedValues } };
    });
  };

  const handleSaveDaily = async () => {
    if (!userId) return;
    const readsToInsert = Object.entries(dailyReads)
      .filter(([, values]) => Object.values(values).some(v => v !== undefined && v !== '' && v !== false))
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

    const weeklyReadsToInsert = [];
    const treatmentsToInsert = [];

    for (const [poolId, values] of Object.entries(weeklyReads)) {
      if (!Object.values(values).some(v => v)) continue;

      const bungalow = bungalows.find(b => b.id === poolId);
      if (!bungalow) continue;

      // Prepare data for 'weekly_reads' table
      weeklyReadsToInsert.push({
        pool_id: poolId,
        user_id: userId,
        tds: values.tds ? parseFloat(values.tds) : null,
        alkalinity: values.alkalinity ? parseFloat(values.alkalinity) : null,
        calcium_hardness: values.calcium_hardness ? parseFloat(values.calcium_hardness) : null,
        saturation_index: values.saturation_index ? parseFloat(values.saturation_index) : null,
      });

      // Prepare data for 'treatments' table
      if (values.alkalinity_treatment_cups || values.calcium_treatment_cups) {
        treatmentsToInsert.push({
          bungalow_id: bungalow.bungalow_id, // Use the correct ID from the 'bungalows' table
          user_id: userId,
          alkalinity_reading: values.alkalinity ? parseFloat(values.alkalinity) : null,
          calcium_reading: values.calcium_hardness ? parseFloat(values.calcium_hardness) : null,
          alkalinity_treatment_cups: values.alkalinity_treatment_cups ? parseFloat(values.alkalinity_treatment_cups) : null,
          calcium_treatment_cups: values.calcium_treatment_cups ? parseFloat(values.calcium_treatment_cups) : null,
        });
      }
    }

    if (weeklyReadsToInsert.length === 0 && treatmentsToInsert.length === 0) {
      toast({ title: "No data to save", variant: "destructive" });
      return;
    }

    let hasError = false;

    if (weeklyReadsToInsert.length > 0) {
      const { error } = await supabase.from("weekly_reads").insert(weeklyReadsToInsert);
      if (error) {
        toast({ title: "Error saving weekly reads", description: error.message, variant: "destructive" });
        hasError = true;
      }
    }

    if (treatmentsToInsert.length > 0) {
      const { error } = await supabase.from("treatments").insert(treatmentsToInsert);
      if (error) {
        toast({ title: "Error saving treatments", description: error.message, variant: "destructive" });
        hasError = true;
      }
    }

    if (!hasError) {
      toast({ title: "Success!", description: "Weekly data has been saved." });
      setWeeklyReads({});
    }
  };

  const getLSIStatus = (lsi: number | null) => {
    if (lsi === null) return { text: "", className: "" };
    if (lsi < -0.5) return { text: "Water is corrosive", className: "text-destructive font-medium" };
    if (lsi > 0.5) return { text: "Water is scale-forming", className: "text-destructive font-medium" };
    return { text: "Water is balanced", className: "text-green-600 font-medium" };
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading Bungalow data...</div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>← Back</Button>
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">Print</Button>
        </header>

        <h1 className="text-3xl font-bold text-center">Polynesian Bungalows - All Units</h1>
        
        <Tabs defaultValue="daily-reads" className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="daily-reads">Daily Reads</TabsTrigger>
              <TabsTrigger value="tds">TDS (Weekly Reads)</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="daily-reads" className="space-y-6">
            <div className="text-right print:hidden">
              <Button onClick={handleSaveDaily}>Save All Daily Reads</Button>
            </div>
            {bungalows.map(bungalow => {
              const values = dailyReads[bungalow.id] || {};
              return (
                <Card key={bungalow.id} className="print:break-inside-avoid">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <h3 className="font-bold text-lg">{bungalow.name}</h3>
                      <div className="flex items-center gap-2">
                        <Checkbox id={`acid-${bungalow.id}`} checked={values.decoin} onCheckedChange={c => handleDailyChange(bungalow.id, 'decoin', !!c)} />
                        <Label htmlFor={`acid-${bungalow.id}`}>ACID</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id={`chlorine-${bungalow.id}`} checked={values.tiles} onCheckedChange={c => handleDailyChange(bungalow.id, 'tiles', !!c)} />
                        <Label htmlFor={`chlorine-${bungalow.id}`}>CHLORINE</Label>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1"><Label>Chlorine</Label><Input type="number" step="0.1" value={values.chlorine || ""} onChange={e => handleDailyChange(bungalow.id, 'chlorine', e.target.value)} /></div>
                      <div className="space-y-1"><Label>pH</Label><Input type="number" step="0.1" value={values.ph || ""} onChange={e => handleDailyChange(bungalow.id, 'ph', e.target.value)} /></div>
                      <div className="space-y-1"><Label>Temperature</Label><Input type="number" step="0.1" value={values.temperature || ""} onChange={e => handleDailyChange(bungalow.id, 'temperature', e.target.value)} /></div>
                      <div className="space-y-1"><Label>Flow</Label><Input type="number" step="0.1" value={values.flow || ""} onChange={e => handleDailyChange(bungalow.id, 'flow', e.target.value)} /></div>
                      <div className="space-y-1"><Label>W.O.#</Label><Input placeholder="Work Order" value={values.work_order_1 || ""} onChange={e => handleDailyChange(bungalow.id, 'work_order_1', e.target.value)} /></div>
                      <div className="space-y-1"><Label>W.O.#</Label><Input placeholder="Work Order" value={values.work_order_2 || ""} onChange={e => handleDailyChange(bungalow.id, 'work_order_2', e.target.value)} /></div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="tds" className="space-y-6">
            <div className="text-right print:hidden">
              <Button onClick={handleSaveWeekly}>Save All Weekly Reads</Button>
            </div>
            {bungalows.map(bungalow => {
              const values = weeklyReads[bungalow.id] || {};
              const lsiValue = values.saturation_index ? parseFloat(values.saturation_index) : null;
              const lsiStatus = getLSIStatus(lsiValue);
              return (
                <Card key={bungalow.id} className="print:break-inside-avoid">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-4">{bungalow.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-4 items-start">
                      {/* Row 1 */}
                      <div className="space-y-1"><Label>TDS</Label><Input type="number" step="0.1" value={values.tds || ""} onChange={e => handleWeeklyChange(bungalow.id, 'tds', e.target.value)} /></div>
                      <div className="space-y-1"><Label>Alkalinity</Label><Input type="number" step="0.1" value={values.alkalinity || ""} onChange={e => handleWeeklyChange(bungalow.id, 'alkalinity', e.target.value)} /></div>
                      <div className="space-y-1"><Label>Calcium Hardness</Label><Input type="number" step="0.1" value={values.calcium_hardness || ""} onChange={e => handleWeeklyChange(bungalow.id, 'calcium_hardness', e.target.value)} /></div>
                      <div className="space-y-1">
                        <Label>Saturation Index</Label>
                        <Input 
                          type="number" 
                          value={values.saturation_index || ""} 
                          readOnly 
                          placeholder="Auto-calculated"
                          className="bg-muted cursor-not-allowed"
                        />
                      </div>

                      {/* Row 2 */}
                      <div className="hidden md:block"></div> {/* Spacer */}
                      <div className="space-y-1">
                        <Label>Alkalinity Treatment (cups)</Label>
                        <Input 
                          type="number" 
                          value={values.alkalinity_treatment_cups || ""} 
                          readOnly 
                          placeholder="Auto-calculated"
                          className="bg-muted cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Calcium Treatment (cups)</Label>
                        <Input 
                          type="number" 
                          value={values.calcium_treatment_cups || ""} 
                          readOnly 
                          placeholder="Auto-calculated"
                          className="bg-muted cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-1 h-full flex items-end pb-1">
                        {lsiValue !== null && (
                          <p className={`text-sm ${lsiStatus.className}`}>
                            {lsiStatus.text}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BungalowReads;