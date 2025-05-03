
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// We're reusing the NewVisit form component but with prefilled data
// In a real implementation, this would be more fleshed out
const EditVisit = () => {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [visit, setVisit] = useState<any>(null);

  useEffect(() => {
    const fetchVisitDetails = async () => {
      if (!visitId || !user) return;
      
      try {
        setLoading(true);
        
        // Fetch the visit details
        const { data, error } = await supabase
          .from("branch_visits")
          .select(`
            *,
            branches:branch_id (
              id, 
              name, 
              location, 
              category, 
              branch_code
            )
          `)
          .eq("id", visitId)
          .eq("user_id", user.id)  // Ensure the visit belongs to this user
          .single();
          
        if (error) throw error;
        
        // Only allow editing draft visits
        if (data.status !== "draft") {
          toast({
            variant: "destructive",
            title: "Cannot edit this visit",
            description: "Only draft visits can be edited.",
          });
          navigate("/bh/my-visits");
          return;
        }
        
        setVisit(data);
      } catch (error: any) {
        console.error("Error fetching visit:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to load visit details.",
        });
        navigate("/bh/my-visits");
      } finally {
        setLoading(false);
      }
    };
    
    fetchVisitDetails();
  }, [visitId, user, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // This is a placeholder for now - redirect to NewVisit and pass visitId as state
  // In a real implementation, this would be replaced with the actual form
  // pre-populated with the visit data
  return (
    <div className="container py-6 space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Edit Branch Visit</h2>
      </div>
      
      <div className="p-6 bg-white rounded-lg shadow text-center">
        <p>Loading edit form for visit ID: {visitId}</p>
        <p className="text-slate-600">This feature is under development. You'll be able to edit your draft visits soon.</p>
        <div className="mt-4">
          <button 
            onClick={() => navigate("/bh/my-visits")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Return to My Visits
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditVisit;
