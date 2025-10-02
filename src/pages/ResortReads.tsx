import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tables } from "@/integrations/supabase/types";
import { format, parseISO, getDay, setDay } from "date-fns";

type Pool = {
  id: string;
  name: string;
  pool_type: string;
};

type Resort = {
  name: string;
};

type PoolReads = {
  chlorine: string;
  ph: string;
  temperature: string;
  flow: string;
  influent: string;
  effluent: string;
};

type WeeklyReads = {
  tds: string;
  alkalinity: string;
  calciumHardness: string;
  lsi: number | null;
};

type LatestWeeklyRead = Tables<"weekly_reads">;

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ResortReads = () => {
  const { resortId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resort, setResort] = useState<Resort | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [reads, setReads] = useState<Record<string, PoolReads>>({});
  const [weeklyReads, setWeeklyReads] = useState<Record<string, WeeklyReads>>({});
  const [latestWeeklyReads, setLatestWeeklyReads] = useState<Record<string, LatestWeeklyRead>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>(() => weekdays[getDay(new Date())]);
  const [activeTab, setActiveTab] = useState<string>(() => weekdays[getDay(new Date())]);

  useEffect(() => {
    fetchUser();
    fetchResortAndPools();
  }, [resortId]);

  useEffect(() => {
    if (pools.length > 0 && activeTab !== "weekly") {
      fetchReadsForDay(activeTab, pools.map(p => p.id));
    }
  }, [activeTab, pools]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const fetchReadsForDay = async (day: string, poolIds: string[]) => {
    if (poolIds.length === 0) return;

    const dayIndex = weekdays.indexOf(day);
    const targetDate = setDay(new Date(), dayIndex);
    const formattedDate = format(targetDate, "yyyy-MM-dd");

    const { data: dailyData, error } = await supabase
      .from("daily_reads")
      .select("*")
      .in("pool_id", poolIds)
      .eq("read_date", formattedDate);

    if (error) {
      toast({ title: `Error fetching reads for ${day}`, description: error.message, variant: "destructive" });
      return;
    }

    const newReads: Record<string, PoolReads> = {};
    pools.forEach(pool => {
      const existingRead = dailyData?.find(r => r.pool_id === pool.id);
      newReads[pool.id] = {
        chlorine: existingRead?.chlorine?.toString() ?? "",
        ph: existingRead?.ph?.toString() ?? "",
        temperature: existingRead?.temperature?.toString() ?? "",
        flow: existingRead?.flow?.toString() ?? "",
        influent: existingRead?.influent?.toString() ?? "",
        effluent: existingRead?.effluent?.toString() ?? "",
      };
    });
    setReads(newReads);
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

    const { data: poolsData, error: poolsError } = await supabase.from("pools").select("*").eq("resort_id", resortId).order("name");
    if (poolsError) {
      toast({ title: "Error fetching pools", description: poolsError.message, variant: "destructive" });
    } else {
      let sortedPools = poolsData || [];
      if (resortData.name === "Grand Floridian") {
        const order = ["Court Yard Pool", "Court Yard Spa", "Beach Pool", "APA", "Men Spa", "Women Spa"];
        sortedPools = sortedPools.sort((a, b) => {
          const indexA = order.indexOf(a.name);
          const indexB = order.indexOf(b.name);
          return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
        });
      }
      setPools(sortedPools);
      const poolIds = sortedPools.map(p => p.id);
      if (poolIds.length > 0) {
        fetchReadsForDay(selectedDay, poolIds);
        fetchLatestWeeklyReads(poolIds);
      }
    }
    setLoading(false);
  };

  const fetchLatestWeeklyReads = async (poolIds: string[]) => {
    const { data: weeklyData } = await supabase.from("weekly_reads").select("*").in("pool_id", poolIds).order("read_date", { ascending: false });
    const latestWeeklyByPool: Record<string, LatestWeeklyRead> = {};
    for (const read of weeklyData || []) {
      if (read.pool_id && !latestWeeklyByPool[read.pool_id]) latestWeeklyByPool[read.pool_id] = read;
    }
    setLatestWeeklyReads(latestWeeklyByPool);

    const initialWeeklyReads: Record<string, WeeklyReads> = {};
    pools.forEach((pool) => {
      const lastWeekly = latestWeeklyByPool[pool.id];
      initialWeeklyReads[pool.id] = {
        tds: lastWeekly?.tds != null ? lastWeekly.tds.toString() : "",
        alkalinity: lastWeekly?.alkalinity != null ? lastWeekly.alkalinity.toString() : "",
        calciumHardness: lastWeekly?.calcium_hardness != null ? lastWeekly.calcium_hardness.toString() : "",
        lsi: lastWeekly?.saturation_index ?? null,
      };
    });
    setWeeklyReads(initialWeeklyReads);
  };

  const handleInputChange = (poolId: string, field: keyof PoolReads, value: string) => {
    setReads((prev) => ({ ...prev, [poolId]: { ...prev[poolId], [field]: value } }));
  };

  const handleWeeklyInputChange = (poolId: string, field: keyof WeeklyReads, value: string) => {
    setWeeklyReads((prev) => {
      const updated = { ...prev, [poolId]: { ...prev[poolId], [field]: value } };
      const poolData = updated[poolId];
      const dailyData = reads[poolId];
      if (poolData.tds && poolData.alkalinity && poolData.calciumHardness && dailyData?.ph && dailyData?.temperature) {
        const phValue = parseFloat(dailyData.ph);
        const tempFahrenheit = parseFloat(dailyData.temperature);
        const alkValue = parseFloat(poolData.alkalinity);
        const caValue = parseFloat(poolData.calciumHardness);
        const tdsValue = parseFloat(poolData.tds);
        const tempCelsius = (tempFahrenheit - 32) * 5 / 9;
        const A = (Math.log10(tdsValue) - 1) / 10;
        const B = -13.12 * Math.log10(tempCelsius + 273) + 34.55;
        const C = Math.log10(caValue) - 0.4;
        const D = Math.log10(alkValue);
        const pHs = (9.3 + A + B) - (C + D);
        const lsiValue = phValue - pHs;
        updated[poolId].lsi = Math.round(lsiValue * 100) / 100;
      }
      return updated;
    });
  };

  const handleSaveDailyReads = async () => {
    if (!userId) return;
    const dayIndex = weekdays.indexOf(activeTab);
    const targetDate = setDay(new Date(), dayIndex);
    const formattedDate = format(targetDate, "yyyy-MM-dd");

    const readsToUpsert = Object.entries(reads)
      .filter(([_, values]) => values.chlorine || values.ph || values.temperature || values.flow)
      .map(([poolId, values]) => {
        const pool = pools.find((p) => p.id === poolId);
        return {
          pool_id: poolId,
          user_id: userId,
          read_date: formattedDate,
          chlorine: parseFloat(values.chlorine) || null,
          ph: parseFloat(values.ph) || null,
          temperature: parseFloat(values.temperature) || null,
          flow: parseFloat(values.flow) || null,
          ...(pool?.pool_type === "standard" && {
            influent: parseFloat(values.influent) || null,
            effluent: parseFloat(values.effluent) || null,
          }),
        };
      });

    if (readsToUpsert.length === 0) {
      toast({ title: "No data to save", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("daily_reads").upsert(readsToUpsert, { onConflict: 'pool_id,read_date' });
    if (error) {
      toast({ title: "Error", description: `Could not save reads. A database constraint might be missing. ${error.message}`, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Reads for ${activeTab} saved!` });
    }
  };

  const handleSaveWeekly = async () => {
    if (!userId) return;
    const weeklyToInsert = Object.entries(weeklyReads)
      .filter(([_, values]) => values.tds || values.alkalinity || values.calciumHardness)
      .map(([poolId, values]) => ({
        pool_id: poolId, user_id: userId, tds: parseFloat(values.tds) || null, alkalinity: parseFloat(values.alkalinity) || null,
        calcium_hardness: parseFloat(values.calciumHardness) || null, saturation_index: values.lsi,
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
      fetchLatestWeeklyReads(pools.map(p => p.id));
    }
  };

  const handlePrint = () => window.print();

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading resort data...</div>;
  if (!resort) return <div className="flex min-h-screen items-center justify-center">Resort not found.</div>;

  const DailyReadsForm = ({ day }: { day: string }) => (
    <div className="space-y-4 print:space-y-2 mt-6">
      <div className="flex justify-end mb-4 print:hidden">
        <Button onClick={handleSaveDailyReads}>Save Reads for {day}</Button>
      </div>
      {pools.map((pool) => (
        <Card key={pool.id} className="print:break-inside-avoid print:shadow-none print:mb-1">
          <CardHeader className="py-2 print:py-1"><CardTitle className="text-base print:text-sm">{pool.name}</CardTitle></CardHeader>
          <CardContent className="py-2 print:py-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 print:gap-1">
              <div className="space-y-1"><Label htmlFor={`${pool.id}-chlorine`} className="text-xs print:text-[10px]">Chlorine</Label><Input id={`${pool.id}-chlorine`} type="number" step="0.01" value={reads[pool.id]?.chlorine || ""} onChange={(e) => handleInputChange(pool.id, "chlorine", e.target.value)} className="h-8 print:h-6 text-sm print:text-xs" /></div>
              <div className="space-y-1"><Label htmlFor={`${pool.id}-ph`} className="text-xs print:text-[10px]">pH</Label><Input id={`${pool.id}-ph`} type="number" step="0.01" value={reads[pool.id]?.ph || ""} onChange={(e) => handleInputChange(pool.id, "ph", e.target.value)} className="h-8 print:h-6 text-sm print:text-xs" /></div>
              <div className="space-y-1"><Label htmlFor={`${pool.id}-temperature`} className="text-xs print:text-[10px]">Temperature</Label><Input id={`${pool.id}-temperature`} type="number" step="0.1" value={reads[pool.id]?.temperature || ""} onChange={(e) => handleInputChange(pool.id, "temperature", e.target.value)} className="h-8 print:h-6 text-sm print:text-xs" /></div>
              <div className="space-y-1"><Label htmlFor={`${pool.id}-flow`} className="text-xs print:text-[10px]">Flow</Label><Input id={`${pool.id}-flow`} type="number" step="0.01" value={reads[pool.id]?.flow || ""} onChange={(e) => handleInputChange(pool.id, "flow", e.target.value)} className="h-8 print:h-6 text-sm print:text-xs" /></div>
              {pool.pool_type === "standard" && (<>
                <div className="space-y-1"><Label htmlFor={`${pool.id}-influent`} className="text-xs print:text-[10px]">Influent</Label><Input id={`${pool.id}-influent`} type="number" step="0.01" value={reads[pool.id]?.influent || ""} onChange={(e) => handleInputChange(pool.id, "influent", e.target.value)} className="h-8 print:h-6 text-sm print:text-xs" /></div>
                <div className="space-y-1"><Label htmlFor={`${pool.id}-effluent`} className="text-xs print:text-[10px]">Effluent</Label><Input id={`${pool.id}-effluent`} type="number" step="0.01" value={reads[pool.id]?.effluent || ""} onChange={(e) => handleInputChange(pool.id, "effluent", e.target.value)} className="h-8 print:h-6 text-sm print:text-xs" /></div>
              </>)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" onClick={() => navigate("/")}>← Back</Button>
          <Button variant="outline" onClick={handlePrint}>Print</Button>
        </div>
        <Card className="print:shadow-none">
          <CardHeader><CardTitle className="text-2xl">{resort.name}</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-8 print:hidden">
                {weekdays.map(day => <TabsTrigger key={day} value={day}>{day.substring(0, 3)}</TabsTrigger>)}
                <TabsTrigger value="weekly">TDS</TabsTrigger>
              </TabsList>
              {weekdays.map(day => <TabsContent key={day} value={day}><DailyReadsForm day={day} /></TabsContent>)}
              <TabsContent value="weekly" className="space-y-4 print:space-y-2 mt-6">
                <div className="flex justify-end mb-4 print:hidden"><Button onClick={handleSaveWeekly}>Save All Weekly Reads</Button></div>
                {pools.map((pool) => (
                  <Card key={pool.id} className="print:break-inside-avoid print:shadow-none">
                    <CardHeader className="print:py-2"><CardTitle className="text-lg print:text-base">{pool.name}</CardTitle>
                      {latestWeeklyReads[pool.id] && latestWeeklyReads[pool.id].read_date && (<CardDescription className="text-xs">Last: {format(parseISO(latestWeeklyReads[pool.id].read_date), "M/d/yy")}</CardDescription>)}
                    </CardHeader>
                    <CardContent className="print:py-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:gap-2">
                        <div className="space-y-1"><Label htmlFor={`${pool.id}-tds`} className="text-xs">TDS</Label><Input id={`${pool.id}-tds`} type="number" step="0.01" value={weeklyReads[pool.id]?.tds || ""} onChange={(e) => handleWeeklyInputChange(pool.id, "tds", e.target.value)} className="h-9 print:h-8 text-sm" /></div>
                        <div className="space-y-1"><Label htmlFor={`${pool.id}-alkalinity`} className="text-xs">Alkalinity</Label><Input id={`${pool.id}-alkalinity`} type="number" step="0.01" value={weeklyReads[pool.id]?.alkalinity || ""} onChange={(e) => handleWeeklyInputChange(pool.id, "alkalinity", e.target.value)} className="h-9 print:h-8 text-sm" /></div>
                        <div className="space-y-1"><Label htmlFor={`${pool.id}-calcium`} className="text-xs">Calcium Hardness</Label><Input id={`${pool.id}-calcium`} type="number" step="0.01" value={weeklyReads[pool.id]?.calciumHardness || ""} onChange={(e) => handleWeeklyInputChange(pool.id, "calciumHardness", e.target.value)} className="h-9 print:h-8 text-sm" /></div>
                        <div className="space-y-1"><Label htmlFor={`${pool.id}-lsi`} className="text-xs">Saturation Index (LSI)</Label><Input id={`${pool.id}-lsi`} type="number" step="0.01" value={weeklyReads[pool.id]?.lsi !== null ? weeklyReads[pool.id].lsi : ""} readOnly placeholder="Auto-calculated" className="h-9 print:h-8 text-sm bg-muted" />
                          {weeklyReads[pool.id]?.lsi !== null && (<p className="text-xs mt-1">{weeklyReads[pool.id].lsi! < -0.5 ? (<span className="text-destructive font-medium">⚠️ Corrosive - Needs Treatment</span>) : weeklyReads[pool.id].lsi! > 0.5 ? (<span className="text-destructive font-medium">⚠️ Scale-Forming - Needs Treatment</span>) : (<span className="text-green-600 font-medium">✓ Balanced - No Treatment Needed</span>)}</p>)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResortReads;