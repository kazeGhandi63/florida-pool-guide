import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const WeeklySchedule = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Weekly Schedule</h1>
          <div />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>4-Week Rolling Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The weekly schedule feature will be implemented here.</p>
            <p className="mt-4 text-muted-foreground">This will include a calendar grid showing the 4-week rolling system for all resorts.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WeeklySchedule;