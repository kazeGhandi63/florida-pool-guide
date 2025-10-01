import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer } from "lucide-react";
import { format } from "date-fns";

type DailyRead = {
  id: string;
  read_date: string;
  chlorine: number | null;
  ph: number | null;
  temperature: number | null;
  flow: number | null;
  influent: number | null;
  effluent: number | null;
  pools: { name: string; resorts: { name: string } };
  profiles: { pool_attendant: string };
};

type WeeklyRead = {
  id: string;
  read_date: string;
  tds: number | null;
  alkalinity: number | null;
  calcium_hardness: number | null;
  saturation_index: number | null;
  pools: { name: string; resorts: { name: string } };
  profiles: { pool_attendant: string };
};

const Reports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dailyReads, setDailyReads] = useState<DailyRead[]>([]);
  const [weeklyReads, setWeeklyReads] = useState<WeeklyRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDailyReads, setSelectedDailyReads] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchReads();
  }, []);

  const fetchReads = async () => {
    setLoading(true);
    
    const { data: dailyData, error: dailyError } = await supabase
      .from("daily_reads")
      .select(`
        *,
        pools (name, resorts (name)),
        profiles (pool_attendant)
      `)
      .order("read_date", { ascending: false })
      .limit(100);

    if (dailyError) {
      toast({ title: "Error", description: dailyError.message, variant: "destructive" });
    } else {
      setDailyReads(dailyData || []);
    }

    const { data: weeklyData, error: weeklyError } = await supabase
      .from("weekly_reads")
      .select(`
        *,
        pools (name, resorts (name)),
        profiles (pool_attendant)
      `)
      .order("read_date", { ascending: false })
      .limit(100);

    if (weeklyError) {
      toast({ title: "Error", description: weeklyError.message, variant: "destructive" });
    } else {
      setWeeklyReads(weeklyData || []);
    }

    setLoading(false);
  };

  const getLSIStatus = (lsi: number | null) => {
    if (lsi === null) return "-";
    if (lsi < -0.5) return "⚠️ Corrosive";
    if (lsi > 0.5) return "⚠️ Scale-Forming";
    return "✓ Balanced";
  };

  const toggleDailyRead = (id: string) => {
    const newSelected = new Set(selectedDailyReads);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDailyReads(newSelected);
  };

  const toggleAllDailyReads = () => {
    if (selectedDailyReads.size === dailyReads.length) {
      setSelectedDailyReads(new Set());
    } else {
      setSelectedDailyReads(new Set(dailyReads.map(r => r.id)));
    }
  };

  const handlePrint = () => {
    if (selectedDailyReads.size === 0) {
      toast({ title: "No reads selected", description: "Please select at least one read to print", variant: "destructive" });
      return;
    }

    const selectedReadsData = dailyReads.filter(read => selectedDailyReads.has(read.id));
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Daily Reads Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            @media print {
              body { margin: 0; }
              @page { margin: 0.5cm; }
            }
          </style>
        </head>
        <body>
          <h1>Daily Reads Report</h1>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Resort</th>
                <th>Pool</th>
                <th>Attendant</th>
                <th>Chlorine</th>
                <th>pH</th>
                <th>Temp (°F)</th>
                <th>Flow</th>
                <th>Influent</th>
                <th>Effluent</th>
              </tr>
            </thead>
            <tbody>
              ${selectedReadsData.map(read => `
                <tr>
                  <td>${format(new Date(read.read_date), "MMM d, yyyy")}</td>
                  <td>${read.pools.resorts.name}</td>
                  <td>${read.pools.name}</td>
                  <td>${read.profiles.pool_attendant}</td>
                  <td>${read.chlorine ?? "-"}</td>
                  <td>${read.ph ?? "-"}</td>
                  <td>${read.temperature ?? "-"}</td>
                  <td>${read.flow ?? "-"}</td>
                  <td>${read.influent ?? "-"}</td>
                  <td>${read.effluent ?? "-"}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (loading) return <div className="min-h-screen bg-background p-4">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            ← Back
          </Button>
          <h1 className="text-3xl font-bold">Saved Reports</h1>
          <div className="w-20" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historical Reads</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="daily" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="daily">Daily Reads</TabsTrigger>
                <TabsTrigger value="weekly">Weekly Reads (TDS)</TabsTrigger>
              </TabsList>

              <TabsContent value="daily" className="mt-6">
                <div className="mb-4 flex gap-2">
                  <Button onClick={handlePrint} disabled={selectedDailyReads.size === 0}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Selected ({selectedDailyReads.size})
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox 
                            checked={dailyReads.length > 0 && selectedDailyReads.size === dailyReads.length}
                            onCheckedChange={toggleAllDailyReads}
                          />
                        </TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Resort</TableHead>
                        <TableHead>Pool</TableHead>
                        <TableHead>Attendant</TableHead>
                        <TableHead>Chlorine</TableHead>
                        <TableHead>pH</TableHead>
                        <TableHead>Temp (°F)</TableHead>
                        <TableHead>Flow</TableHead>
                        <TableHead>Influent</TableHead>
                        <TableHead>Effluent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyReads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center text-muted-foreground">
                            No daily reads found
                          </TableCell>
                        </TableRow>
                      ) : (
                        dailyReads.map((read) => (
                          <TableRow key={read.id}>
                            <TableCell>
                              <Checkbox 
                                checked={selectedDailyReads.has(read.id)}
                                onCheckedChange={() => toggleDailyRead(read.id)}
                              />
                            </TableCell>
                            <TableCell>{format(new Date(read.read_date), "MMM d, yyyy")}</TableCell>
                            <TableCell>{read.pools.resorts.name}</TableCell>
                            <TableCell>{read.pools.name}</TableCell>
                            <TableCell>{read.profiles.pool_attendant}</TableCell>
                            <TableCell>{read.chlorine ?? "-"}</TableCell>
                            <TableCell>{read.ph ?? "-"}</TableCell>
                            <TableCell>{read.temperature ?? "-"}</TableCell>
                            <TableCell>{read.flow ?? "-"}</TableCell>
                            <TableCell>{read.influent ?? "-"}</TableCell>
                            <TableCell>{read.effluent ?? "-"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="weekly" className="mt-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Resort</TableHead>
                        <TableHead>Pool</TableHead>
                        <TableHead>Attendant</TableHead>
                        <TableHead>TDS</TableHead>
                        <TableHead>Alkalinity</TableHead>
                        <TableHead>Calcium Hardness</TableHead>
                        <TableHead>LSI</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weeklyReads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground">
                            No weekly reads found
                          </TableCell>
                        </TableRow>
                      ) : (
                        weeklyReads.map((read) => (
                          <TableRow key={read.id}>
                            <TableCell>{format(new Date(read.read_date), "MMM d, yyyy")}</TableCell>
                            <TableCell>{read.pools.resorts.name}</TableCell>
                            <TableCell>{read.pools.name}</TableCell>
                            <TableCell>{read.profiles.pool_attendant}</TableCell>
                            <TableCell>{read.tds ?? "-"}</TableCell>
                            <TableCell>{read.alkalinity ?? "-"}</TableCell>
                            <TableCell>{read.calcium_hardness ?? "-"}</TableCell>
                            <TableCell>{read.saturation_index ?? "-"}</TableCell>
                            <TableCell>
                              <span className={
                                read.saturation_index === null ? "" :
                                read.saturation_index < -0.5 || read.saturation_index > 0.5 
                                  ? "text-destructive font-medium" 
                                  : "text-green-600 font-medium"
                              }>
                                {getLSIStatus(read.saturation_index)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
