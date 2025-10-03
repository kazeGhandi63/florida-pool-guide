import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [poolAttendant, setPoolAttendant] = useState("");
  const [attendantId, setAttendantId] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // We'll generate a unique, hidden email from the attendant ID.
    // The attendant ID will also serve as the password.
    const email = `${attendantId}@pool-guide.local`;
    const password = attendantId;

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        navigate("/dashboard");
      } else {
        // Sign up
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              pool_attendant: poolAttendant,
              attendant_id: attendantId,
            },
          },
        });

        if (error) throw error;
        toast({
          title: "Account created!",
          description: "You can now sign in with your name and ID.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Pool Reads</CardTitle>
          <CardDescription>
            {isLogin ? "Sign in with your Attendant Name and ID" : "Create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="poolAttendant">Pool Attendant Name</Label>
              <Input
                id="poolAttendant"
                placeholder="Enter your full name"
                value={poolAttendant}
                onChange={(e) => setPoolAttendant(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attendantId">Attendant ID</Label>
              <Input
                id="attendantId"
                type="password" // Use password type to hide the ID
                placeholder="Enter your Attendant ID"
                value={attendantId}
                onChange={(e) => setAttendantId(e.target.value)}
                required
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Need an account? Sign up" : "Have an account? Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;