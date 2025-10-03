import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TreatmentDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Treatment Dashboard</h1>
          <div />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Analytics & Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The treatment dashboard with analytics and charts will be implemented here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TreatmentDashboard;