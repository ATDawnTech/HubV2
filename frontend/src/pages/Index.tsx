import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // If a recovery link lands on the root path, redirect to /auth preserving tokens
  useEffect(() => {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const hashParams = new URLSearchParams(
      hash.startsWith("#") ? hash.slice(1) : hash,
    );
    const searchParams = new URLSearchParams(search);
    const type = searchParams.get("type") || hashParams.get("type");
    if (type === "recovery") {
      window.location.replace(`/auth${search}${hash}`);
    }
  }, []);

  useEffect(() => {
    if (!loading && user && !window.location.pathname.startsWith("/test/")) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold mb-2">ADT Hub</CardTitle>
          <CardDescription className="text-xl">
            One place for Intake, Onboarding, Productivity Management
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-4">
            <p className="text-lg text-muted-foreground">
              Collect detailed hiring requirements, track survey responses, and
              export data for analysis.
            </p>
            <p className="text-sm text-muted-foreground">
              Access restricted to @atdawntech.com email address only!
            </p>
          </div>
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            className="w-full sm:w-auto"
          >
            Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
