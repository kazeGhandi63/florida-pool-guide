import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Pool = {
  id: string;
  name: string;
  pool_type: string;
  resort_id: string;
};

type Resort = {
  name: string;
};

const PoolReads = () => {
  const { poolId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pool, setPool] = useState<Pool | null>(null);
  const [resort, setResort] = useState<Resort | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Daily reads state
  const [chlorine, setChlorine] = useState("");
  const [ph, setPh] = useState("");
  const [temperature, setTemperature] = useState("");
  const [flow, setFlow] = useState("");
  const [influent, setInfluent] = useState("");
  const [effluent, setEffluent] = useState("");

  // Weekly reads state
  const [tds, setTds] = useState("");
  const [alkalinity, setAlkalinity] = useState("");
  const [calciumHardness, setCalciumHardness] = useState("");
  const [lsi, setLsi] = useState<number | null>(null);

  useEffect(() => {
    fetchPoolAndResort();
    fetchUser();
  }, [poolId]);

  useEffect(() => {
    if (ph && temperature) {
      calculateLSI();
    }
  }, [ph, temperature, alkalinity, calciumHardness, tds]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const fetchPoolAndResort = async () => {
    const { data: poolData, error: poolError } = await supabase
      .from("pools")
      .select("*, resorts(name)")
      .eq("id", poolId)
      .single();

    if (poolError) {
      toast({ title: "Error", description: poolError.message, variant: "destructive" });
    } else {
      setPool(poolData);
      setResort(poolData.resorts as unknown as Resort);
    }
  };

  const calculateLSI = () => {
    const phValue = parseFloat(ph);
    const tempValue = parseFloat(temperature);
    const alkValue = parseFloat(alkalinity || "0");
    const caValue = parseFloat(calciumHardness || "0");
    const tdsValue = parseFloat(tds || "0");

    if (phValue && tempValue) {
      // Simplified LSI calculation
      const lsiValue = phValue - (9.3 + (tempValue / 25) + (alkValue / 50) + (caValue / 75) - (tdsValue / 1000));
      setLsi(Math.round(lsiValue * 100) / 100);
    }
  };

  const handleDailyReads = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const { error } = await supabase.from("daily_reads").insert({
      pool_id: poolId,
      user_id: userId,
      chlorine: parseFloat(chlorine),
      ph: parseFloat(ph),
      temperature: parseFloat(temperature),
      flow: parseFloat(flow),
      ...(pool?.pool_type === "standard" && {
        influent: parseFloat(influent),
        effluent: parseFloat(effluent),
      }),
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Daily reads saved!" });
      resetDailyForm();
    }
  };

  const handleWeeklyReads = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const { error } = await supabase.from("weekly_reads").insert({
      pool_id: poolId,
      user_id: userId,
      tds: parseFloat(tds),
      alkalinity: parseFloat(alkalinity),
      calcium_hardness: parseFloat(calciumHardness),
      saturation_index: lsi,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Weekly reads saved!" });
      resetWeeklyForm();
    }
  };

  const resetDailyForm = () => {
    setChlorine("");
    setPh("");
    setTemperature("");
    setFlow("");
    setInfluent("");
    setEffluent("");
  };

  const resetWeeklyForm = () => {
    setTds("");
    setAlkalinity("");
    setCalciumHardness("");
    setLsi(null);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!pool || !resort) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6 print:space-y-4">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" onClick={() => navigate("/")}>
            ← Back
          </Button>
          <Button onClick={handlePrint}>Print</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {resort.name} - {pool.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="daily" className="print:hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="daily">Daily Reads</TabsTrigger>
                <TabsTrigger value="weekly">Weekly TDS</TabsTrigger>
              </TabsList>

              <TabsContent value="daily">
                <form onSubmit={handleDailyReads} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="chlorine">Chlorine</Label>
                      <Input
                        id="chlorine"
                        type="number"
                        step="0.01"
                        value={chlorine}
                        onChange={(e) => setChlorine(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ph">pH</Label>
                      <Input
                        id="ph"
                        type="number"
                        step="0.01"
                        value={ph}
                        onChange={(e) => setPh(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="temperature">Temperature</Label>
                      <Input
                        id="temperature"
                        type="number"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="flow">Flow</Label>
                      <Input
                        id="flow"
                        type="number"
                        step="0.01"
                        value={flow}
                        onChange={(e) => setFlow(e.target.value)}
                        required
                      />
                    </div>
                    {pool.pool_type === "standard" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="influent">Influent</Label>
                          <Input
                            id="influent"
                            type="number"
                            step="0.01"
                            value={influent}
                            onChange={(e) => setInfluent(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="effluent">Effluent</Label>
                          <Input
                            id="effluent"
                            type="number"
                            step="0.01"
                            value={effluent}
                            onChange={(e) => setEffluent(e.target.value)}
                            required
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <Button type="submit" className="w-full">
                    Save Daily Reads
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="weekly">
                <form onSubmit={handleWeeklyReads} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tds">TDS</Label>
                      <Input
                        id="tds"
                        type="number"
                        step="0.01"
                        value={tds}
                        onChange={(e) => setTds(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alkalinity">Alkalinity</Label>
                      <Input
                        id="alkalinity"
                        type="number"
                        step="0.01"
                        value={alkalinity}
                        onChange={(e) => setAlkalinity(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="calciumHardness">Calcium Hardness</Label>
                      <Input
                        id="calciumHardness"
                        type="number"
                        step="0.01"
                        value={calciumHardness}
                        onChange={(e) => setCalciumHardness(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lsi">Saturation Index (LSI)</Label>
                      <Input
                        id="lsi"
                        type="number"
                        step="0.01"
                        value={lsi || ""}
                        readOnly
                        placeholder="Auto-calculated"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Save Weekly Reads
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PoolReads;