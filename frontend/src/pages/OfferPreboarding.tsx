import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Rocket, FileCheck, Calendar, MapPin } from "lucide-react";

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  address: string;
  date_of_joining: string;
  workflow_status: string;
  survey_id: string;
}

interface OnboardingTemplate {
  id: string;
  name: string;
  description?: string;
  version: number;
}

export default function OfferPreboarding() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [offerDetails, setOfferDetails] = useState({
    ctc: "",
    location: "",
    workMode: "hybrid",
    documentsRequired: ["PAN Card", "Aadhaar Card", "Bank Passbook", "Educational Certificates"]
  });
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (id && user) {
      loadCandidateAndTemplates();
    }
  }, [id, user]);

  const loadCandidateAndTemplates = async () => {
    try {
      // Load candidate details
      const { data: candidateData, error: candidateError } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", id)
        .eq("user_id", user?.id)
        .single();

      if (candidateError) throw candidateError;
      setCandidate(candidateData);

      // Load onboarding templates - specifically look for "New Tech Employee Onboarding Template"
      const { data: templatesData, error: templatesError } = await supabase
        .from("onboarding_templates")
        .select("id, name, version")
        .eq("is_active", true)
        .eq("name", "New Tech Employee Onboarding Template")
        .order("version", { ascending: false })
        .limit(1);

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Auto-select the New Tech Employee Onboarding Template
      if (templatesData && templatesData.length > 0) {
        setSelectedTemplate(templatesData[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load candidate or template data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const launchOnboardingJourney = async () => {
    if (!selectedTemplate || !candidate) return;

    setLaunching(true);
    try {
      const { data, error } = await supabase.rpc("launch_onboarding_journey", {
        p_candidate_id: candidate.id,
        p_template_id: selectedTemplate
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Onboarding journey launched successfully",
      });

      // Navigate to the onboarding workspace
      navigate(`/onboarding/${candidate.id}`);
    } catch (error) {
      console.error("Error launching journey:", error);
      toast({
        title: "Error",
        description: "Failed to launch onboarding journey",
        variant: "destructive",
      });
    } finally {
      setLaunching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Candidate Not Found</h2>
          <p className="text-muted-foreground mb-4">The candidate you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate("/candidates")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Employees
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="py-8 px-12">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/candidates")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Employees
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Offer & Preboarding</h1>
            <p className="text-muted-foreground">Manage offer details and launch onboarding journey for {candidate.first_name} {candidate.last_name}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Candidate Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Candidate Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Name</Label>
                <p className="text-lg">{candidate.first_name} {candidate.last_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p>{candidate.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Phone</Label>
                <p>{candidate.phone_number}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Date of Joining</Label>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {candidate.date_of_joining ?
                    new Date(candidate.date_of_joining).toLocaleDateString() :
                    "Not set"
                  }
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Current Status</Label>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${candidate.workflow_status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
                  }`}>
                  {candidate.workflow_status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Offer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Offer Details
              </CardTitle>
              <CardDescription>Configure offer terms and conditions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ctc">CTC (Annual)</Label>
                <Input
                  id="ctc"
                  placeholder="e.g., 12,00,000"
                  value={offerDetails.ctc}
                  onChange={(e) => setOfferDetails(prev => ({ ...prev, ctc: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="location">Work Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Bangalore, India"
                  value={offerDetails.location}
                  onChange={(e) => setOfferDetails(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="workMode">Work Mode</Label>
                <Select value={offerDetails.workMode} onValueChange={(value) => setOfferDetails(prev => ({ ...prev, workMode: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Required Documents</Label>
                <Textarea
                  value={offerDetails.documentsRequired.join(", ")}
                  onChange={(e) => setOfferDetails(prev => ({
                    ...prev,
                    documentsRequired: e.target.value.split(", ").filter(Boolean)
                  }))}
                  placeholder="List required documents separated by commas"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Onboarding Journey */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Launch Onboarding Journey
              </CardTitle>
              <CardDescription>
                Select an onboarding template to automatically create tasks for HR, IT, Facilities, Finance, and Vendors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="template">Onboarding Template</Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">
                    {templates.length > 0 ? templates[0].name : "New Tech Employee Onboarding Template"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Automatically selected template for new tech employees
                  </p>
                </div>
              </div>

              {templates.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No onboarding templates available.</p>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/onboarding/templates")}
                  >
                    Create Template
                  </Button>
                </div>
              )}

              {selectedTemplate && (
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={launchOnboardingJourney}
                    disabled={launching}
                    className="flex-1"
                  >
                    {launching ? "Launching..." : "Launch Onboarding Journey"}
                    <Rocket className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}