import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";

type Pool = Tables<"pools">;
type Resort = Tables<"resorts">;

type DailyReadValues = {
  chlorine?: string;
  ph?: string;
  bromine?: string;
  temperature?: string;
  flow?: string;
  influent?: string;
  effluent?: string;
  scrubbed?: boolean;
  vacuumed?: boolean;
  drain_fill?: boolean;
  tiles?: boolean;
  decoin?: boolean;
  backwash?: boolean;
  work_order_1?: string;
  work_order_2?: string;
  work_order_3?: string;
  work_order_4?: string;
};

type WeeklyReadValues = {
  tds?: string;
  alkalinity?: string;
  calcium_hardness?: string;
  saturation_index?: string;
};

const ResortReads = () => {
  const { resortId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resort, setResort] = useState<Resort | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [dailyReads, setDailyReads] = useState<Record<string, DailyReadValues>>({});
  const [weeklyReads, setWeeklyReads] = useState<Record<string, WeeklyReadValues>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
    fetchResortAndPools();
  }, [resortId]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const fetchResortAndPools = async () => {
    setLoading(true);
    const { data: resortData, error: resortError } = await supabase.from("resorts").select("*").eq("id", resortId).single();
    if (resortError) {
      toast({ title: "Error fetching resort", description: resortError.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setResort(resortData);

    const { data: poolsData, error: poolsError } = await supabase.from("pools").select("*").eq("resort_id", resortId);
    if (poolsError) {
      toast({ title: "Error fetching pools", description: poolsError.message, variant: "destructive" });
    } else {
      let sortedPools = poolsData || [];
      if (resortData.name === "Grand Floridian Resort AM") {
        const order = ["Court Yard Pool", "Court Yard Spa", "Beach Pool", "APA", "Men Spa", "Women Spa"];
        sortedPools.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
      } else if (resortData.name === "Grand Floridian Resort PM") {
        const order = ["Court Yard Pool", "Court Yard Spa", "Court Yard Fountain", "Beach Pool", "APA", "Founder's Fountain", "Pinguin's Fountain", "Men Spa", "Women Spa"];
        sortedPools.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
      } else {
        sortedPools.sort((a, b) => a.name.localeCompare(b.name));
      }
      setPools(sortedPools);
    }
    setLoading(false);
  };

  const handleDailyChange = (poolId: string, field: keyof DailyReadValues, value: string | boolean) => {
    setDailyReads(prev => ({ ...prev, [poolId]: { ...prev[poolId], [field]: value } }));
  };

  const handleWeeklyChange = (poolId: string, field: keyof WeeklyReadValues, value: string) => {
    setWeeklyReads(prev => ({ ...prev, [poolId]: { ...prev[poolId], [field]: value } }));
  };

  const handleSaveDaily = async () => {
    if (!userId) return;
    const readsToInsert = Object.entries(dailyReads).map(([poolId, values]) => ({
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
    }
  };
  
  const handleSaveWeekly = async () => {
    if (!userId) return;
    const readsToInsert = Object.entries(weeklyReads).map(([poolId, values]) => ({
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
    }
  };

  const renderPoolFields = (pool: Pool) => {
    const poolName = pool.name;
    const resortName = resort?.name;
    const values = dailyReads[pool.id] || {};

    const standardFields = (
      <>
        <div className="space-y-1"><Label>Chlorine</Label><Input type="number" step="0.1" value={values.chlorine || ""} onChange={e => handleDailyChange(pool.id, 'chlorine', e.target.value)} /></div>
        <div className="space-y-1"><Label>pH</Label><Input type="number" step="0.1" value={values.ph || ""} onChange={e => handleDailyChange(pool.id, 'ph', e.target.value)} /></div>
        <div className="space-y-1"><Label>Temperature</Label><Input type="number" step="0.1" value={values.temperature || ""} onChange={e => handleDailyChange(pool.id, 'temperature', e.target.value)} /></div>
        <div className="space-y-1"><Label>Flow</Label><Input type="number" step="0.1" value={values.flow || ""} onChange={e => handleDailyChange(pool.id, 'flow', e.target.value)} /></div>
        <div className="space-y-1"><Label>Influent</Label><Input type="number" step="0.1" value={values.influent || ""} onChange={e => handleDailyChange(pool.id, 'influent', e.target.value)} /></div>
        <div className="space-y-1"><Label>Effluent</Label><Input type="number" step="0.1" value={values.effluent || ""} onChange={e => handleDailyChange(pool.id, 'effluent', e.target.value)} /></div>
      </>
    );

    const workOrderFields = (
      <>
        <div className="space-y-1"><Label>W.O.# 1</Label><Input value={values.work_order_1 || ""} onChange={e => handleDailyChange(pool.id, 'work_order_1', e.target.value)} /></div>
        <div className="space-y-1"><Label>W.O.# 2</Label><Input value={values.work_order_2 || ""} onChange={e => handleDailyChange(pool.id, 'work_order_2', e.target.value)} /></div>
        <div className="space-y-1"><Label>W.O.# 3</Label><Input value={values.work_order_3 || ""} onChange={e => handleDailyChange(pool.id, 'work_order_3', e.target.value)} /></div>
        <div className="space-y-1"><Label>W.O.# 4</Label><Input value={values.work_order_4 || ""} onChange={e => handleDailyChange(pool.id, 'work_order_4', e.target.value)} /></div>
      </>
    );

    if (resortName === "Grand Floridian Resort PM") {
      if (poolName === "Court Yard Fountain") return <div className="grid md:grid-cols-6 gap-4"><div className="space-y-1"><Label>Bromine</Label><Input type="number" step="0.1" value={values.bromine || ""} onChange={e => handleDailyChange(pool.id, 'bromine', e.target.value)} /></div><div className="space-y-1"><Label>pH</Label><Input type="number" step="0.1" value={values.ph || ""} onChange={e => handleDailyChange(pool.id, 'ph', e.target.value)} /></div><div className="flex items-center gap-2 pt-6"><Checkbox checked={values.scrubbed} onCheckedChange={c => handleDailyChange(pool.id, 'scrubbed', !!c)} /><Label>Scrubbed</Label></div><div className="flex items-center gap-2 pt-6"><Checkbox checked={values.vacuumed} onCheckedChange={c => handleDailyChange(pool.id, 'vacuumed', !!c)} /><Label>Vacuumed</Label></div><div className="flex items-center gap-2 pt-6"><Checkbox checked={values.drain_fill} onCheckedChange={c => handleDailyChange(pool.id, 'drain_fill', !!c)} /><Label>Drain/Fill</Label></div></div>;
      if (poolName === "Founder's Fountain") return <div className="grid md:grid-cols-6 gap-4"><div className="space-y-1"><Label>Chlorine</Label><Input type="number" step="0.1" value={values.chlorine || ""} onChange={e => handleDailyChange(pool.id, 'chlorine', e.target.value)} /></div><div className="space-y-1"><Label>pH</Label><Input type="number" step="0.1" value={values.ph || ""} onChange={e => handleDailyChange(pool.id, 'ph', e.target.value)} /></div><div className="flex items-center gap-2 pt-6"><Checkbox checked={values.scrubbed} onCheckedChange={c => handleDailyChange(pool.id, 'scrubbed', !!c)} /><Label>Scrubbed</Label></div><div className="flex items-center gap-2 pt-6"><Checkbox checked={values.vacuumed} onCheckedChange={c => handleDailyChange(pool.id, 'vacuumed', !!c)} /><Label>Vacuumed</Label></div><div className="flex items-center gap-2 pt-6"><Checkbox checked={values.drain_fill} onCheckedChange={c => handleDailyChange(pool.id, 'drain_fill', !!c)} /><Label>Drain/Fill</Label></div></div>;
      if (poolName === "Pinguin's Fountain") return <div className="grid md:grid-cols-6 gap-4"><div className="space-y-1"><Label>Bromine</Label><Input type="number" step="0.1" value={values.bromine || ""} onChange={e => handleDailyChange(pool.id, 'bromine', e.target.value)} /></div><div className="space-y-1"><Label>pH</Label><Input type="number" step="0.1" value={values.ph || ""} onChange={e => handleDailyChange(pool.id, 'ph', e.target.value)} /></div><div className="flex items-center gap-2 pt-6"><Checkbox checked={values.scrubbed} onCheckedChange={c => handleDailyChange(pool.id, 'scrubbed', !!c)} /><Label>Scrubbed</Label></div><div className="flex items-center gap-2 pt-6"><Checkbox checked={values.backwash} onCheckedChange={c => handleDailyChange(pool.id, 'backwash', !!c)} /><Label>Backwash/Drain</Label></div><div className="flex items-center gap-2 pt-6"><Checkbox checked={values.decoin} onCheckedChange={c => handleDailyChange(pool.id, 'decoin', !!c)} /><Label>Decoin</Label></div></div>;
      if (poolName === "Men Spa" || poolName === "Women Spa") return <div className="space-y-4"><div className="grid md:grid-cols-6 gap-4">{standardFields}</div><div className="flex items-center gap-8"><div className="flex items-center gap-2"><Checkbox checked={values.drain_fill} onCheckedChange={c => handleDailyChange(pool.id, 'drain_fill', !!c)} /><Label>Drain/Fill</Label></div><div className="flex items-center gap-2"><Checkbox checked={values.tiles} onCheckedChange={c => handleDailyChange(pool.id, 'tiles', !!c)} /><Label>Tiles</Label></div></div><div className="grid md:grid-cols-4 gap-4">{workOrderFields}</div></div>;
    }

    return <div className="space-y-4"><div className="grid md:grid-cols-6 gap-4">{standardFields}</div><div className="grid md:grid-cols-4 gap-4">{workOrderFields}</div></div>;
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (!resort) return <div className="p-4">Resort not found.</div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>← Back</Button>
          <h1 className="text-3xl font-bold">{resort.name}</h1>
          <Button variant="outline" onClick={() => window.print()}>Print</Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="daily">
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="daily">Daily Reads</TabsTrigger>
                  <TabsTrigger value="weekly">TDS (Weekly Reads)</TabsTrigger>
                </TabsList>
                <TabsContent value="daily" className="m-0"><Button onClick={handleSaveDaily}>Save All Daily Reads</Button></TabsContent>
                <TabsContent value="weekly" className="m-0"><Button onClick={handleSaveWeekly}>Save All Weekly Reads</Button></TabsContent>
              </div>

              <TabsContent value="daily" className="space-y-6">
                {pools.map(pool => (
                  <Card key={pool.id}>
                    <CardHeader><CardTitle>{pool.name}</CardTitle></CardHeader>
                    <CardContent>{renderPoolFields(pool)}</CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="weekly" className="space-y-6">
                {pools.map(pool => {
                  const values = weeklyReads[pool.id] || {};
                  return (
                    <Card key={pool.id}>
                      <CardHeader><CardTitle>{pool.name}</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-4 gap-4">
                          <div className="space-y-1"><Label>TDS</Label><Input type="number" step="0.1" value={values.tds || ""} onChange={e => handleWeeklyChange(pool.id, 'tds', e.target.value)} /></div>
                          <div className="space-y-1"><Label>Alkalinity</Label><Input type="number" step="0.1" value={values.alkalinity || ""} onChange={e => handleWeeklyChange(pool.id, 'alkalinity', e.target.value)} /></div>
                          <div className="space-y-1"><Label>Calcium Hardness</Label><Input type="number" step="0.1" value={values.calcium_hardness || ""} onChange={e => handleWeeklyChange(pool.id, 'calcium_hardness', e.target.value)} /></div>
                          <div className="space-y-1"><Label>Saturation Index</Label><Input type="number" step="0.1" value={values.saturation_index || ""} onChange={e => handleWeeklyChange(pool.id, 'saturation_index', e.target.value)} /></div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResortReads;