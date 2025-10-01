import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Droplets, Beaker } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format, parseISO } from "date-fns";

type Pool = {
  id: string;
  name: string;
};

type WeeklyReads = {
  tds: string;
  alkalinity: string;
  calciumHardness: string;
  lsi: number | null;
};

type LatestWeeklyRead = Tables<"weekly_reads">;
type LatestDailyRead = Tables<"daily_reads">;

type TreatmentSuggestion = {
  bicarb: number;
  calcium: number;
};

const BungalowReads = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bungalows, setBungalows] = useState<Pool[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [reads, setReads] = useState<Record<string, { chlorine: string; ph: string; temperature: string; flow: string }>>({});
  const [weeklyReads, setWeeklyReads] = useState<Record<string, WeeklyReads>>({});
  const [latestDailyReads, setLatestDailyReads] = useState<Record<string, LatestDailyRead>>({});
  const [latestWeeklyReads, setLatestWeeklyReads] = useState<Record<string, LatestWeeklyRead>>({});
  const [treatmentSuggestions, setTreatmentSuggestions] = useState<Record<string, TreatmentSuggestion>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBungalows();
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const getBicarbTreatment = (alkalinity: number | null): number => {
    if (!alkalinity) return 0;
    if (alkalinity >= 30 && alkalinity <= 49) return 2;
    if (alkalinity >= 50 && alkalinity <= 69) return 1.5;
    if (alkalinity >= 70 && alkalinity <= 80) return 1;
    return 0;
  };

  const getCalciumTreatment = (calcium: number | null): number => {
    if (!calcium) return 0;
    if (calcium <= 125) return 2;
    if (calcium > 125 && calcium <= 150) return 1.5;
    if (calcium > 150 && calcium <= 175) return 1;
    return 0;
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
    const poolIds = sortedData.map(b => b.id);

    if (poolIds.length > 0) {
      const { data: dailyData, error: dailyError } = await supabase
        .from("daily_reads")
        .select("*")
        .in("pool_id", poolIds)
        .order("read_date", { ascending: false });

      if (dailyError) {
        toast({ title: "Error fetching daily reads", description: dailyError.message, variant: "destructive" });
      } else {
        const latestReadsByPool: Record<string, LatestDailyRead> = {};
        for (const read of dailyData || []) {
          if (read.pool_id && !latestReadsByPool[read.pool_id]) {
            latestReadsByPool[read.pool_id] = read;
          }
        }
        setLatestDailyReads(latestReadsByPool);

        const initialReads: Record<string, any> = {};
        sortedData.forEach((b) => {
          const lastRead = latestReadsByPool[b.id];
          initialReads[b.id] = {
            chlorine: lastRead?.chlorine != null ? lastRead.chlorine.toString() : "",
            ph: lastRead?.ph != null ? lastRead.ph.toString() : "",
            temperature: lastRead?.temperature != null ? lastRead.temperature.toString() : "",
            flow: lastRead?.flow != null ? lastRead.flow.toString() : "",
          };
        });
        setReads(initialReads);
      }
    }
    await fetchLatestWeeklyReads(poolIds);
    setLoading(false);
  };

  const fetchLatestWeeklyReads = async (poolIds: string[]) => {
    if (poolIds.length === 0) return;

    const { data, error } = await supabase
      .from("weekly_reads")
      .select("*")
      .in("pool_id", poolIds)
      .order("read_date", { ascending: false });

    if (error) {
      toast({ title: "Error fetching weekly reads", description: error.message, variant: "destructive" });
      return;
    }

    const latestReadsByPool: Record<string, LatestWeeklyRead> = {};
    for (const read of data || []) {
      if (read.pool_id && !latestReadsByPool[read.pool_id]) {
        latestReadsByPool[read.pool_id] = read;
      }
    }
    setLatestWeeklyReads(latestReadsByPool);

    const initialWeeklyReads: Record<string, WeeklyReads> = {};
    poolIds.forEach(poolId => {
      const read = latestReadsByPool[poolId];
      initialWeeklyReads[poolId] = {
        tds: read?.tds != null ? read.tds.toString() : "",
        alkalinity: read?.alkalinity != null ? read.alkalinity.toString() : "",
        calciumHardness: read?.calcium_hardness != null ? read.calcium_hardness.toString() : "",
        lsi: read?.saturation_index ?? null,
      };
    });
    setWeeklyReads(initialWeeklyReads);

    const suggestions: Record<string, TreatmentSuggestion> = {};
    poolIds.forEach(poolId => {
      const read = latestReadsByPool[poolId];
      suggestions[poolId] = {
        bicarb: getBicarbTreatment(read?.alkalinity),
        calcium: getCalciumTreatment(read?.calcium_hardness),
      };
    });
    setTreatmentSuggestions(suggestions);
  };

  const handleInputChange = (bungalowId: string, field: string, value: string) => {
    setReads((prev) => ({
      ...prev,
      [bungalowId]: { ...prev[bungalowId], [field]: value },
    }));
  };

  const handleWeeklyInputChange = (bungalowId: string, field: keyof WeeklyReads, value: string) => {
    setWeeklyReads((prev) => {
      const updated = { ...prev, [bungalowId]: { ...prev[bungalowId], [field]: value } };
      const poolData = updated[bungalowId];
      const dailyData = reads[bungalowId];
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
        updated[bungalowId].lsi = Math.round(lsiValue * 100) / 100;
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!userId) return;
    const readsToInsert = Object.entries(reads)
      .filter(([_, values]) => values.chlorine || values.ph || values.temperature || values.flow)
      .map(([poolId, values]) => ({
        pool_id: poolId,
        user_id: userId,
        chlorine: parseFloat(values.chlorine) || null,
        ph: parseFloat(values.ph) || null,
        temperature: parseFloat(values.temperature) || null,
        flow: parseFloat(values.flow) || null,
      }));
    if (readsToInsert.length === 0) {
      toast({ title: "No data to save", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("daily_reads").insert(readsToInsert);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "All reads saved!" });
      fetchBungalows();
    }
  };

  const handleSaveWeekly = async () => {
    if (!userId) return;
    const weeklyToInsert = Object.entries(weeklyReads)
      .filter(([_, values]) => values.tds || values.alkalinity || values.calciumHardness)
      .map(([poolId, values]) => ({
        pool_id: poolId,
        user_id: userId,
        tds: parseFloat(values.tds) || null,
        alkalinity: parseFloat(values.alkalinity) || null,
        calcium_hardness: parseFloat(values.calciumHardness) || null,
        saturation_index: values.lsi,
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
      fetchLatestWeeklyReads(bungalows.map(b => b.id));
    }
  };

  const handleLogTreatment = async (poolId: string) => {
    if (!userId || !treatmentSuggestions[poolId]) return;
    const suggestion = treatmentSuggestions[poolId];
    if (suggestion.bicarb === 0 && suggestion.calcium === 0) {
      toast({ title: "No treatment needed", description: "Water is balanced according to the rules." });
      return;
    }
    const { error } = await supabase.from("treatments").insert({
      pool_id: poolId,
      user_id: userId,
      bicarb_cups_added: suggestion.bicarb,
      calcium_cups_added: suggestion.calcium,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Treatment for ${bungalows.find(b => b.id === poolId)?.name} logged!` });
    }
  };

  const handlePrint = () => window.print();

  const renderBungalowGroup = (start: number, end: number, title: string) => {
    const group = bungalows.slice(start - 1, end);
    return (
      <div className="print:page-break-after-always print:h-screen">
        <h2 className="text-xl font-bold mb-4 print:block hidden">{title}</h2>
        <div className="grid gap-3 print:gap-2">
          {group.map((bungalow) => (
            <Card key={bungalow.id} className="print:break-inside-avoid print:shadow-none">
              <CardHeader className="py-2 print:py-1">
                <CardTitle className="text-sm print:text-xs">{bungalow.name}</CardTitle>
                {latestDailyReads[bungalow.id] && latestDailyReads[bungalow.id].read_date && (
                  <CardDescription className="text-xs">
                    Last: {format(parseISO(latestDailyReads[bungalow.id].read_date), "M/d/yy")}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="py-2 print:py-1">
                <div className="grid grid-cols-4 gap-2 print:gap-1">
                  <div className="space-y-1"><Label htmlFor={`${bungalow.id}-chlorine`} className="text-xs">Chlorine</Label><Input id={`${bungalow.id}-chlorine`} type="number" step="0.01" value={reads[bungalow.id]?.chlorine || ""} onChange={(e) => handleInputChange(bungalow.id, "chlorine", e.target.value)} className="h-8 text-sm print:h-6 print:text-xs" /></div>
                  <div className="space-y-1"><Label htmlFor={`${bungalow.id}-ph`} className="text-xs">pH</Label><Input id={`${bungalow.id}-ph`} type="number" step="0.01" value={reads[bungalow.id]?.ph || ""} onChange={(e) => handleInputChange(bungalow.id, "ph", e.target.value)} className="h-8 text-sm print:h-6 print:text-xs" /></div>
                  <div className="space-y-1"><Label htmlFor={`${bungalow.id}-temperature`} className="text-xs">Temperature</Label><Input id={`${bungalow.id}-temperature`} type="number" step="0.1" value={reads[bungalow.id]?.temperature || ""} onChange={(e) => handleInputChange(bungalow.id, "temperature", e.target.value)} className="h-8 text-sm print:h-6 print:text-xs" /></div>
                  <div className="space-y-1"><Label htmlFor={`${bungalow.id}-flow`} className="text-xs">Flow</Label><Input id={`${bungalow.id}-flow`} type="number" step="0.01" value={reads[bungalow.id]?.flow || ""} onChange={(e) => handleInputChange(bungalow.id, "flow", e.target.value)} className="h-8 text-sm print:h-6 print:text-xs" /></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderWeeklyBungalowGroup = (start: number, end: number, title: string) => {
    const group = bungalows.slice(start - 1, end);
    return (
      <div className="print:page-break-after-always print:h-screen">
        <h2 className="text-xl font-bold mb-4 print:block hidden">{title}</h2>
        <div className="grid gap-3 print:gap-2">
          {group.map((bungalow) => (
            <Card key={bungalow.id} className="print:break-inside-avoid print:shadow-none">
              <CardHeader className="py-2 print:py-1">
                <CardTitle className="text-sm print:text-xs">{bungalow.name}</CardTitle>
                {latestWeeklyReads[bungalow.id] && latestWeeklyReads[bungalow.id].read_date && (
                  <CardDescription className="text-xs">
                    Last: {format(parseISO(latestWeeklyReads[bungalow.id].read_date), "M/d/yy")}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="py-2 print:py-1">
                <div className="grid grid-cols-4 gap-2 print:gap-1">
                  <div className="space-y-1"><Label htmlFor={`${bungalow.id}-tds`} className="text-xs">TDS</Label><Input id={`${bungalow.id}-tds`} type="number" step="0.01" value={weeklyReads[bungalow.id]?.tds || ""} onChange={(e) => handleWeeklyInputChange(bungalow.id, "tds", e.target.value)} className="h-8 text-sm print:h-6 print:text-xs" /></div>
                  <div className="space-y-1"><Label htmlFor={`${bungalow.id}-alkalinity`} className="text-xs">Alkalinity</Label><Input id={`${bungalow.id}-alkalinity`} type="number" step="0.01" value={weeklyReads[bungalow.id]?.alkalinity || ""} onChange={(e) => handleWeeklyInputChange(bungalow.id, "alkalinity", e.target.value)} className="h-8 text-sm print:h-6 print:text-xs" /></div>
                  <div className="space-y-1"><Label htmlFor={`${bungalow.id}-calcium`} className="text-xs">Calcium Hardness</Label><Input id={`${bungalow.id}-calcium`} type="number" step="0.01" value={weeklyReads[bungalow.id]?.calciumHardness || ""} onChange={(e) => handleWeeklyInputChange(bungalow.id, "calciumHardness", e.target.value)} className="h-8 text-sm print:h-6 print:text-xs" /></div>
                  <div className="space-y-1"><Label htmlFor={`${bungalow.id}-lsi`} className="text-xs">LSI</Label><Input id={`${bungalow.id}-lsi`} type="number" value={weeklyReads[bungalow.id]?.lsi !== null ? weeklyReads[bungalow.id].lsi : ""} readOnly placeholder="Auto" className="h-8 text-sm print:h-6 print:text-xs bg-muted" />
                    {weeklyReads[bungalow.id]?.lsi !== null && (<p className="text-xs mt-1">{weeklyReads[bungalow.id].lsi! < -0.5 ? (<span className="text-destructive font-medium">⚠️ Corrosive</span>) : weeklyReads[bungalow.id].lsi! > 0.5 ? (<span className="text-destructive font-medium">⚠️ Scale-Forming</span>) : (<span className="text-green-600 font-medium">✓ Balanced</span>)}</p>)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading Bungalow data...</div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" onClick={() => navigate("/")}>← Back</Button>
          <Button variant="outline" onClick={handlePrint}>Print</Button>
        </div>
        <Card className="print:shadow-none">
          <CardHeader><CardTitle className="text-2xl">Polynesian Bungalows - All Units</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="daily" className="w-full">
              <TabsList className="grid w-full grid-cols-3 print:hidden">
                <TabsTrigger value="daily">Daily Reads</TabsTrigger>
                <TabsTrigger value="weekly">TDS (Weekly Reads)</TabsTrigger>
                <TabsTrigger value="balanced">Water Balanced</TabsTrigger>
              </TabsList>
              <TabsContent value="daily" className="mt-6">
                <div className="flex justify-end mb-4 print:hidden"><Button onClick={handleSave}>Save All Daily Reads</Button></div>
                <div>{renderBungalowGroup(1, 10, "Polynesian Bungalows 1-10")}{renderBungalowGroup(11, 20, "Polynesian Bungalows 11-20")}</div>
              </TabsContent>
              <TabsContent value="weekly" className="mt-6">
                <div className="flex justify-end mb-4 print:hidden"><Button onClick={handleSaveWeekly}>Save All Weekly Reads</Button></div>
                <div>{renderWeeklyBungalowGroup(1, 10, "Polynesian Bungalows 1-10")}{renderWeeklyBungalowGroup(11, 20, "Polynesian Bungalows 11-20")}</div>
              </TabsContent>
              <TabsContent value="balanced" className="mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {bungalows.map((bungalow) => {
                    const latestRead = latestWeeklyReads[bungalow.id];
                    const suggestion = treatmentSuggestions[bungalow.id];
                    return (
                      <Card key={bungalow.id}>
                        <CardHeader><CardTitle>{bungalow.name}</CardTitle>
                          <CardDescription>
                            Last reading: {latestRead && latestRead.read_date ? format(parseISO(latestRead.read_date), "M/d/yyyy") : "N/A"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex justify-around text-center">
                            <div><p className="text-sm text-muted-foreground">Alkalinity</p><p className="font-bold text-lg">{latestRead?.alkalinity ?? "N/A"}</p></div>
                            <div><p className="text-sm text-muted-foreground">Calcium</p><p className="font-bold text-lg">{latestRead?.calcium_hardness ?? "N/A"}</p></div>
                          </div>
                          <div className="space-y-2 rounded-lg border p-4">
                            <h4 className="font-semibold">Suggested Treatment</h4>
                            {suggestion && (suggestion.bicarb > 0 || suggestion.calcium > 0) ? (
                              <div className="space-y-2">
                                {suggestion.bicarb > 0 && <div className="flex items-center gap-2"><Droplets className="h-5 w-5 text-blue-500" /><span>Add <span className="font-bold">{suggestion.bicarb} cups</span> of Bicarb</span></div>}
                                {suggestion.calcium > 0 && <div className="flex items-center gap-2"><Beaker className="h-5 w-5 text-orange-500" /><span>Add <span className="font-bold">{suggestion.calcium} cups</span> of Calcium</span></div>}
                              </div>
                            ) : (
                              <p className="text-sm text-green-600 font-medium">✓ Water is balanced. No treatment needed.</p>
                            )}
                          </div>
                          <Button className="w-full" onClick={() => handleLogTreatment(bungalow.id)} disabled={!suggestion}>
                            Log Applied Treatment
                          </Button>
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