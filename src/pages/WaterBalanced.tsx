import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const WaterBalanced = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Water Balance Dashboard</h1>
          <div />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Report & Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Dashboard and reporting features for water balance treatments will be implemented here.</p>
            <p className="mt-4 text-muted-foreground">This will include charts for LSI trends, treatment history, and a printable weekly report.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WaterBalanced;