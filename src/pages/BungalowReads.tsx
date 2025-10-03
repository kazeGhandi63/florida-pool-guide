import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Tables } from "@/integrations/supabase/types";

type Bungalow = Tables<"pools">;

type DailyReadValues = {
  chlorine?: string;
  ph?: string;
  temperature?: string;
  flow?: string;
  acid?: boolean;
  chlorine_add?: boolean; // To avoid conflict with the 'chlorine' reading field
  work_order_temp?: string;
  work_order_flow?: string;
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
  const [bungalows, setBungalows] = useState<Bungalow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [dailyReads, setDailyReads] = useState<Record<string, DailyReadValues>>({});
  const [weeklyReads, setWeeklyReads] = useState<Record<string, WeeklyReadValues>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
    fetchBungalows();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const fetchBungalows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pools")
      .select("*, resorts!inner(name)")
      .eq("resorts.name", "Polynesian Bungalows");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    
    const sortedData = (data || []).sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.name.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });
    setBungalows(sortedData);
    
    const initialDailyReads: Record<string, DailyReadValues> = {};
    sortedData.forEach(b => {
      initialDailyReads[b.id] = {};
    });
    setDailyReads(initialDailyReads);

    const initialWeeklyReads: Record<string, WeeklyReadValues> = {};
    sortedData.forEach(b => {
      initialWeeklyReads[b.id] = {};
    });
    setWeeklyReads(initialWeeklyReads);

    setLoading(false);
  };

  const handleDailyChange = (bungalowId: string, field: keyof DailyReadValues, value: string | boolean) => {
    setDailyReads((prev) => ({
      ...prev,
      [bungalowId]: { ...prev[bungalowId], [field]: value },
    }));
  };

  const handleWeeklyChange = (bungalowId: string, field: keyof WeeklyReadValues, value: string) => {
    setWeeklyReads((prev) => ({
      ...prev,
      [bungalowId]: { ...prev[bungalowId], [field]: value },
    }));
  };

  const handleSaveDaily = async () => {
    if (!userId) return;
    const readsToInsert = Object.entries(dailyReads)
      .filter(([_, values]) => Object.values(values).some(v => v))
      .map(([poolId, values]) => ({
        pool_id: poolId,
        user_id: userId,
        chlorine: values.chlorine ? parseFloat(values.chlorine) : null,
        ph: values.ph ? parseFloat(values.ph) : null,
        temperature: values.temperature ? parseFloat(values.temperature) : null,
        flow: values.flow ? parseFloat(values.flow) : null,
        work_order_temp: values.work_order_temp || null,
        work_order_flow: values.work_order_flow || null,
        // Note: 'acid' and 'chlorine_add' are not saved as there are no DB columns for them.
      }));

    if (readsToInsert.length === 0) {
      toast({ title: "No data to save", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("daily_reads").insert(readsToInsert);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "All daily reads saved!" });
    }
  };

  const handleSaveWeekly = async () => {
    if (!userId) return;
    const weeklyToInsert = Object.entries(weeklyReads)
      .filter(([_, values]) => Object.values(values).some(v => v))
      .map(([poolId, values]) => ({
        pool_id: poolId,
        user_id: userId,
        tds: values.tds ? parseFloat(values.tds) : null,
        alkalinity: values.alkalinity ? parseFloat(values.alkalinity) : null,
        calcium_hardness: values.calcium_hardness ? parseFloat(values.calcium_hardness) : null,
        saturation_index: values.saturation_index ? parseFloat(values.saturation_index) : null,
      }));

    if (weeklyToInsert.length === 0) {
      toast({ title: "No data to save", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("weekly_reads").insert(weeklyToInsert);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "All weekly reads saved!" });
    }
  };

  const handlePrint = () => window.print();

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading Bungalow data...</div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>← Back</Button>
          <h1 className="text-2xl font-bold text-center">Polynesian Bungalows - All Units</h1>
          <Button variant="outline" onClick={handlePrint}>Print</Button>
        </div>
        
        <Card className="print:shadow-none print:border-none">
          <CardContent className="p-4 md:p-6">
            <Tabs defaultValue="daily" className="w-full">
              <div className="flex justify-between items-start mb-4 print:hidden">
                <TabsList className="grid w-full grid-cols-2 max-w-sm">
                  <TabsTrigger value="daily">Daily Reads</TabsTrigger>
                  <TabsTrigger value="weekly">TDS (Weekly Reads)</TabsTrigger>
                </TabsList>
                <TabsContent value="daily" className="m-0"><Button onClick={handleSaveDaily}>Save All Daily Reads</Button></TabsContent>
                <TabsContent value="weekly" className="m-0"><Button onClick={handleSaveWeekly}>Save All Weekly Reads</Button></TabsContent>
              </div>

              <TabsContent value="daily" className="mt-6">
                <div className="space-y-4">
                  {bungalows.map((bungalow) => {
                    const values = dailyReads[bungalow.id] || {};
                    return (
                      <Card key={bungalow.id} className="print:break-inside-avoid">
                        <CardHeader className="py-3">
                          <div className="flex items-center gap-4">
                            <CardTitle className="text-base">{bungalow.name}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Checkbox id={`${bungalow.id}-acid`} checked={values.acid} onCheckedChange={c => handleDailyChange(bungalow.id, 'acid', !!c)} />
                              <Label htmlFor={`${bungalow.id}-acid`}>ACID</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox id={`${bungalow.id}-chlorine_add`} checked={values.chlorine_add} onCheckedChange={c => handleDailyChange(bungalow.id, 'chlorine_add', !!c)} />
                              <Label htmlFor={`${bungalow.id}-chlorine_add`}>CHLORINE</Label>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="py-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1"><Label>Chlorine</Label><Input type="number" step="0.1" value={values.chlorine || ""} onChange={e => handleDailyChange(bungalow.id, 'chlorine', e.target.value)} /></div>
                            <div className="space-y-1"><Label>pH</Label><Input type="number" step="0.1" value={values.ph || ""} onChange={e => handleDailyChange(bungalow.id, 'ph', e.target.value)} /></div>
                            <div className="space-y-1">
                              <Label>Temperature</Label>
                              <Input type="number" step="0.1" value={values.temperature || ""} onChange={e => handleDailyChange(bungalow.id, 'temperature', e.target.value)} />
                              <Label className="text-xs text-muted-foreground">W.O#</Label>
                              <Input placeholder="Work Order" value={values.work_order_temp || ""} onChange={e => handleDailyChange(bungalow.id, 'work_order_temp', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label>Flow</Label>
                              <Input type="number" step="0.1" value={values.flow || ""} onChange={e => handleDailyChange(bungalow.id, 'flow', e.target.value)} />
                              <Label className="text-xs text-muted-foreground">W.O#</Label>
                              <Input placeholder="Work Order" value={values.work_order_flow || ""} onChange={e => handleDailyChange(bungalow.id, 'work_order_flow', e.target.value)} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="weekly" className="mt-6">
                <div className="space-y-4">
                  {bungalows.map((bungalow) => {
                    const values = weeklyReads[bungalow.id] || {};
                    return (
                      <Card key={bungalow.id} className="print:break-inside-avoid">
                        <CardHeader className="py-3">
                          <CardTitle className="text-base">{bungalow.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="py-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1"><Label>TDS</Label><Input type="number" step="1" value={values.tds || ""} onChange={e => handleWeeklyChange(bungalow.id, 'tds', e.target.value)} /></div>
                            <div className="space-y-1"><Label>Alkalinity</Label><Input type="number" step="1" value={values.alkalinity || ""} onChange={e => handleWeeklyChange(bungalow.id, 'alkalinity', e.target.value)} /></div>
                            <div className="space-y-1"><Label>Calcium Hardness</Label><Input type="number" step="1" value={values.calcium_hardness || ""} onChange={e => handleWeeklyChange(bungalow.id, 'calcium_hardness', e.target.value)} /></div>
                            <div className="space-y-1"><Label>Saturation Index</Label><Input type="number" step="0.1" value={values.saturation_index || ""} onChange={e => handleWeeklyChange(bungalow.id, 'saturation_index', e.target.value)} /></div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BungalowReads;