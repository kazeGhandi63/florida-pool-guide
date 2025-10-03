import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Save, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

type DailyRead = {
  id: string;
  read_date: string;
  chlorine: number | null;
  ph: number | null;
  temperature: number | null;
  flow: number | null;
  influent: number | null;
  effluent: number | null;
  pools: { name: string; resorts: { name: string } } | null;
  profiles: { pool_attendant: string } | null;
};

type WeeklyRead = {
  id: string;
  read_date: string;
  tds: number | null;
  alkalinity: number | null;
  calcium_hardness: number | null;
  saturation_index: number | null;
  pools: { name: string; resorts: { name: string } } | null;
  profiles: { pool_attendant: string } | null;
};

const Reports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dailyReads, setDailyReads] = useState<DailyRead[]>([]);
  const [weeklyReads, setWeeklyReads] = useState<WeeklyRead[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingDailyRead, setEditingDailyRead] = useState<Partial<DailyRead> | null>(null);
  const [dailyReadToDelete, setDailyReadToDelete] = useState<DailyRead | null>(null);

  const [editingWeeklyRead, setEditingWeeklyRead] = useState<Partial<WeeklyRead> | null>(null);
  const [weeklyReadToDelete, setWeeklyReadToDelete] = useState<WeeklyRead | null>(null);

  useEffect(() => {
    fetchReads();
  }, []);

  const fetchReads = async () => {
    setLoading(true);
    const dailyPromise = supabase
      .from("daily_reads")
      .select(`*, pools (name, resorts (name)), profiles (pool_attendant)`)
      .order("read_date", { ascending: false })
      .limit(100);
    const weeklyPromise = supabase
      .from("weekly_reads")
      .select(`*, pools (name, resorts (name)), profiles (pool_attendant)`)
      .order("read_date", { ascending: false })
      .limit(100);

    const [dailyResult, weeklyResult] = await Promise.all([dailyPromise, weeklyPromise]);

    if (dailyResult.error) {
      toast({ title: "Error fetching daily reads", description: dailyResult.error.message, variant: "destructive" });
    } else {
      setDailyReads((dailyResult.data as unknown as DailyRead[]) || []);
    }
    if (weeklyResult.error) {
      toast({ title: "Error fetching weekly reads", description: weeklyResult.error.message, variant: "destructive" });
    } else {
      setWeeklyReads((weeklyResult.data as unknown as WeeklyRead[]) || []);
    }
    setLoading(false);
  };

  const getLSIStatus = (lsi: number | null) => {
    if (lsi === null) return { text: "-", className: "" };
    if (lsi < -0.5) return { text: "⚠️ Corrosive", className: "text-destructive font-medium" };
    if (lsi > 0.5) return { text: "⚠️ Scale-Forming", className: "text-destructive font-medium" };
    return { text: "✓ Balanced", className: "text-green-600 font-medium" };
  };

  const isValueOutOfRange = (key: string, value: number | null) => {
    if (value === null) return false;
    switch (key) {
      case "chlorine": return value < 2.0 || value > 5.0;
      case "ph": return value < 7.2 || value > 7.8;
      case "temperature": return value > 104;
      case "alkalinity": return value < 80 || value > 120;
      case "calcium_hardness": return value < 200 || value > 400;
      default: return false;
    }
  };

  // --- Daily Reads Handlers ---
  const handleSaveDaily = async () => {
    if (!editingDailyRead) return;
    const { pools, profiles, ...updateData } = editingDailyRead;
    const { error } = await supabase.from("daily_reads").update(updateData).eq("id", editingDailyRead.id!);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Daily read updated!" });
      setEditingDailyRead(null);
      fetchReads();
    }
  };

  const handleDeleteDaily = async () => {
    if (!dailyReadToDelete) return;
    const { error } = await supabase.from("daily_reads").delete().eq("id", dailyReadToDelete.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Daily read deleted!" });
      setDailyReadToDelete(null);
      fetchReads();
    }
  };

  // --- Weekly Reads Handlers ---
  const handleSaveWeekly = async () => {
    if (!editingWeeklyRead) return;
    const { pools, profiles, ...updateData } = editingWeeklyRead;
    const { error } = await supabase.from("weekly_reads").update(updateData).eq("id", editingWeeklyRead.id!);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Weekly read updated!" });
      setEditingWeeklyRead(null);
      fetchReads();
    }
  };

  const handleDeleteWeekly = async () => {
    if (!weeklyReadToDelete) return;
    const { error } = await supabase.from("weekly_reads").delete().eq("id", weeklyReadToDelete.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Weekly read deleted!" });
      setWeeklyReadToDelete(null);
      fetchReads();
    }
  };

  if (loading) return <div className="min-h-screen bg-background p-4">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate("/")}>← Back</Button>
          <h1 className="text-3xl font-bold">Saved Reports</h1>
          <div className="w-20" />
        </div>

        <Card>
          <CardHeader><CardTitle>Historical Reads</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="daily" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="daily">Daily Reads</TabsTrigger>
                <TabsTrigger value="weekly">Weekly Reads (TDS)</TabsTrigger>
              </TabsList>

              {/* Daily Reads Tab */}
              <TabsContent value="daily" className="mt-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyReads.map((read) => (
                        editingDailyRead?.id === read.id ? (
                          <TableRow key={read.id}>
                            <TableCell>{format(parseISO(read.read_date), "MMM d, yyyy")}</TableCell>
                            <TableCell>{read.pools?.resorts.name}</TableCell>
                            <TableCell>{read.pools?.name}</TableCell>
                            <TableCell>{read.profiles?.pool_attendant}</TableCell>
                            <TableCell><Input type="number" value={editingDailyRead.chlorine ?? ""} onChange={(e) => setEditingDailyRead({ ...editingDailyRead, chlorine: parseFloat(e.target.value) })} className="w-20" /></TableCell>
                            <TableCell><Input type="number" value={editingDailyRead.ph ?? ""} onChange={(e) => setEditingDailyRead({ ...editingDailyRead, ph: parseFloat(e.target.value) })} className="w-20" /></TableCell>
                            <TableCell><Input type="number" value={editingDailyRead.temperature ?? ""} onChange={(e) => setEditingDailyRead({ ...editingDailyRead, temperature: parseFloat(e.target.value) })} className="w-20" /></TableCell>
                            <TableCell><Input type="number" value={editingDailyRead.flow ?? ""} onChange={(e) => setEditingDailyRead({ ...editingDailyRead, flow: parseFloat(e.target.value) })} className="w-20" /></TableCell>
                            <TableCell><Input type="number" value={editingDailyRead.influent ?? ""} onChange={(e) => setEditingDailyRead({ ...editingDailyRead, influent: parseFloat(e.target.value) })} className="w-20" /></TableCell>
                            <TableCell><Input type="number" value={editingDailyRead.effluent ?? ""} onChange={(e) => setEditingDailyRead({ ...editingDailyRead, effluent: parseFloat(e.target.value) })} className="w-20" /></TableCell>
                            <TableCell className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={handleSaveDaily}><Save className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setEditingDailyRead(null)}><XCircle className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <TableRow key={read.id}>
                            <TableCell>{format(parseISO(read.read_date), "MMM d, yyyy")}</TableCell>
                            <TableCell>{read.pools?.resorts.name}</TableCell>
                            <TableCell>{read.pools?.name}</TableCell>
                            <TableCell>{read.profiles?.pool_attendant}</TableCell>
                            <TableCell className={isValueOutOfRange('chlorine', read.chlorine) ? 'text-destructive' : ''}>{read.chlorine ?? "-"}</TableCell>
                            <TableCell className={isValueOutOfRange('ph', read.ph) ? 'text-destructive' : ''}>{read.ph ?? "-"}</TableCell>
                            <TableCell className={isValueOutOfRange('temperature', read.temperature) ? 'text-destructive' : ''}>{read.temperature ?? "-"}</TableCell>
                            <TableCell>{read.flow ?? "-"}</TableCell>
                            <TableCell>{read.influent ?? "-"}</TableCell>
                            <TableCell>{read.effluent ?? "-"}</TableCell>
                            <TableCell className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => setEditingDailyRead({ ...read })}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDailyReadToDelete(read)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                          </TableRow>
                        )
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Weekly Reads Tab */}
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
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weeklyReads.map((read) => (
                        editingWeeklyRead?.id === read.id ? (
                          <TableRow key={read.id}>
                            <TableCell>{format(parseISO(read.read_date), "MMM d, yyyy")}</TableCell>
                            <TableCell>{read.pools?.resorts.name}</TableCell>
                            <TableCell>{read.pools?.name}</TableCell>
                            <TableCell>{read.profiles?.pool_attendant}</TableCell>
                            <TableCell><Input type="number" value={editingWeeklyRead.tds ?? ""} onChange={(e) => setEditingWeeklyRead({ ...editingWeeklyRead, tds: parseFloat(e.target.value) })} className="w-20" /></TableCell>
                            <TableCell><Input type="number" value={editingWeeklyRead.alkalinity ?? ""} onChange={(e) => setEditingWeeklyRead({ ...editingWeeklyRead, alkalinity: parseFloat(e.target.value) })} className="w-20" /></TableCell>
                            <TableCell><Input type="number" value={editingWeeklyRead.calcium_hardness ?? ""} onChange={(e) => setEditingWeeklyRead({ ...editingWeeklyRead, calcium_hardness: parseFloat(e.target.value) })} className="w-24" /></TableCell>
                            <TableCell>{read.saturation_index ?? "-"}</TableCell>
                            <TableCell>{getLSIStatus(read.saturation_index).text}</TableCell>
                            <TableCell className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={handleSaveWeekly}><Save className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setEditingWeeklyRead(null)}><XCircle className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <TableRow key={read.id}>
                            <TableCell>{format(parseISO(read.read_date), "MMM d, yyyy")}</TableCell>
                            <TableCell>{read.pools?.resorts.name}</TableCell>
                            <TableCell>{read.pools?.name}</TableCell>
                            <TableCell>{read.profiles?.pool_attendant}</TableCell>
                            <TableCell>{read.tds ?? "-"}</TableCell>
                            <TableCell className={isValueOutOfRange('alkalinity', read.alkalinity) ? 'text-destructive' : ''}>{read.alkalinity ?? "-"}</TableCell>
                            <TableCell className={isValueOutOfRange('calcium_hardness', read.calcium_hardness) ? 'text-destructive' : ''}>{read.calcium_hardness ?? "-"}</TableCell>
                            <TableCell>{read.saturation_index ?? "-"}</TableCell>
                            <TableCell className={getLSIStatus(read.saturation_index).className}>{getLSIStatus(read.saturation_index).text}</TableCell>
                            <TableCell className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => setEditingWeeklyRead({ ...read })}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setWeeklyReadToDelete(read)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                          </TableRow>
                        )
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialogs */}
      <AlertDialog open={!!dailyReadToDelete} onOpenChange={() => setDailyReadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogDescription>This action cannot be undone. This will permanently delete the daily read entry.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDaily}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!weeklyReadToDelete} onOpenChange={() => setWeeklyReadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogDescription>This action cannot be undone. This will permanently delete the weekly read entry.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWeekly}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Reports;