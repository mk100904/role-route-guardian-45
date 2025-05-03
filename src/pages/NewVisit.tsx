
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, Check, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Form schema for the branch visit form
const formSchema = z.object({
  branch_id: z.string().min(1, { message: "Branch is required" }),
  visit_date: z.date({
    required_error: "Visit date is required",
  }),
  hr_connect_session: z.boolean().default(false),
  total_employees_invited: z.coerce.number().optional(),
  total_participants: z.coerce.number().optional(),
  manning_percentage: z.coerce.number().min(0).max(100).optional(),
  attrition_percentage: z.coerce.number().min(0).max(100).optional(),
  non_vendor_percentage: z.coerce.number().min(0).max(100).optional(),
  er_percentage: z.coerce.number().min(0).max(100).optional(),
  cwt_cases: z.coerce.number().min(0).optional(),
  performance_level: z.string().optional(),
  new_employees_total: z.coerce.number().min(0).optional(),
  new_employees_covered: z.coerce.number().min(0).optional(),
  star_employees_total: z.coerce.number().min(0).optional(),
  star_employees_covered: z.coerce.number().min(0).optional(),
  leaders_aligned_with_code: z.enum(["very_poor", "poor", "neutral", "good", "excellent"]).optional(),
  employees_feel_safe: z.enum(["very_poor", "poor", "neutral", "good", "excellent"]).optional(),
  employees_feel_motivated: z.enum(["very_poor", "poor", "neutral", "good", "excellent"]).optional(),
  leaders_abusive_language: z.enum(["very_poor", "poor", "neutral", "good", "excellent"]).optional(),
  employees_comfort_escalation: z.enum(["very_poor", "poor", "neutral", "good", "excellent"]).optional(),
  inclusive_culture: z.enum(["very_poor", "poor", "neutral", "good", "excellent"]).optional(),
  feedback: z.string().optional(),
});

const NewVisit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [branches, setBranches] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  
  // Use react-hook-form with zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      visit_date: new Date(), // Default to today's date
      hr_connect_session: false,
      manning_percentage: 0,
      attrition_percentage: 0,
      non_vendor_percentage: 0,
      er_percentage: 0,
      cwt_cases: 0,
      new_employees_total: 0,
      new_employees_covered: 0,
      star_employees_total: 0,
      star_employees_covered: 0,
    },
  });

  // Watch the hr_connect_session field to conditionally show related fields
  const hrConnectSession = form.watch("hr_connect_session");
  
  // Watch branch_id to fetch branch details
  const selectedBranchId = form.watch("branch_id");

  // Fetch branches assigned to the user
  useEffect(() => {
    const fetchBranches = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("branch_assignments")
          .select(`
            branches:branch_id (
              id,
              name,
              location,
              category,
              branch_code
            )
          `)
          .eq("user_id", user.id);
          
        if (error) throw error;
        
        // Transform data to a simpler format
        const formattedBranches = data.map((item: any) => {
          return {
            id: item.branches.id,
            name: item.branches.name,
            location: item.branches.location,
            category: item.branches.category,
            branch_code: item.branches.branch_code
          };
        });
        
        setBranches(formattedBranches);
      } catch (error) {
        console.error("Error fetching branches:", error);
        toast({
          variant: "destructive",
          title: "Failed to load branches",
          description: "There was an error loading your assigned branches.",
        });
      }
    };
    
    fetchBranches();
  }, [user]);

  // Update selected branch when branch_id changes
  useEffect(() => {
    if (selectedBranchId) {
      const branch = branches.find(b => b.id === selectedBranchId);
      setSelectedBranch(branch);
    } else {
      setSelectedBranch(null);
    }
  }, [selectedBranchId, branches]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    
    try {
      setSubmitting(true);
      
      // Prepare data for submission
      const visitData = {
        ...values,
        user_id: user.id,
        status: "draft", // Initial status is draft
        created_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from("branch_visits")
        .insert(visitData)
        .select();
        
      if (error) throw error;
      
      toast({
        title: "Visit report saved",
        description: "Your visit report has been saved as a draft.",
      });
      
      // Navigate to "My Visits" page
      navigate("/bh/my-visits");
    } catch (error: any) {
      console.error("Error saving visit:", error);
      toast({
        variant: "destructive",
        title: "Failed to save visit",
        description: error.message || "There was an error saving your visit report.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForReview = async () => {
    const values = form.getValues();
    if (!user) return;
    
    try {
      setSubmitting(true);
      
      // Prepare data for submission
      const visitData = {
        ...values,
        user_id: user.id,
        status: "submitted", // Set status to submitted
        created_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from("branch_visits")
        .insert(visitData)
        .select();
        
      if (error) throw error;
      
      toast({
        title: "Visit report submitted",
        description: "Your visit report has been submitted for review.",
      });
      
      navigate("/bh/my-visits");
    } catch (error: any) {
      console.error("Error submitting visit:", error);
      toast({
        variant: "destructive",
        title: "Failed to submit visit",
        description: error.message || "There was an error submitting your visit report.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Navigate back to "My Visits" page without saving
    navigate("/bh/my-visits");
  };

  // Calculate HR Connect Session Coverage
  const calculateCoverage = () => {
    const totalInvited = form.getValues("total_employees_invited");
    const totalParticipants = form.getValues("total_participants");
    
    if (!totalInvited || totalInvited === 0) return 0;
    
    return ((totalParticipants || 0) / totalInvited) * 100;
  };

  return (
    <div className="container py-6 space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">New Branch Visit</h2>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Visit Information */}
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Visit Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="branch_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name} - {branch.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="visit_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Visit Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Branch details display when branch is selected */}
            {selectedBranch && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium mb-1">Branch Code</p>
                  <p className="text-base border border-input bg-background px-3 py-2 rounded-md">
                    {selectedBranch.branch_code || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Branch Category</p>
                  <p className="text-base border border-input bg-background px-3 py-2 rounded-md capitalize">
                    {selectedBranch.category || "N/A"}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4">
              <h4 className="text-lg font-medium mb-2">HR Connect Session</h4>
              <div className="flex space-x-2 mb-4">
                <Button
                  type="button"
                  variant={hrConnectSession ? "default" : "outline"}
                  className={`w-28 ${hrConnectSession ? "bg-green-500 hover:bg-green-600" : ""}`}
                  onClick={() => form.setValue("hr_connect_session", true)}
                >
                  <Check className="mr-2 h-4 w-4" /> Yes
                </Button>
                <Button
                  type="button"
                  variant={!hrConnectSession ? "default" : "outline"}
                  className={`w-28 ${!hrConnectSession ? "bg-red-500 hover:bg-red-600" : ""}`}
                  onClick={() => form.setValue("hr_connect_session", false)}
                >
                  <X className="mr-2 h-4 w-4" /> No
                </Button>
              </div>
              
              {hrConnectSession && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 border-t pt-4">
                  <FormField
                    control={form.control}
                    name="total_employees_invited"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Employees Invited</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="total_participants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Participants</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <p className="text-sm font-medium mb-1">Coverage (%)</p>
                    <p className="text-base border border-input bg-background px-3 py-2 rounded-md">
                      {calculateCoverage().toFixed(2)}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Branch Metrics */}
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Branch Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="manning_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manning Percentage (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="attrition_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attrition Percentage (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="non_vendor_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Non-Vendor Percentage (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="er_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ER Percentage (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="cwt_cases"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CWT Cases</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="performance_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Performance Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          {/* Employee Coverage */}
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Employee Coverage</h3>
            
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-3">New Employees (0-6 months)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="new_employees_total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total New Employees</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="new_employees_covered"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Employees Covered</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-medium mb-3">STAR Employees</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="star_employees_total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total STAR Employees</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="star_employees_covered"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>STAR Employees Covered</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
          
          {/* Qualitative Assessment */}
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Qualitative Assessment</h3>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="leaders_aligned_with_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Are leaders aligned with the organization code?</FormLabel>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant={field.value === "good" ? "default" : "outline"}
                        className={`w-28 ${field.value === "good" ? "bg-green-500 hover:bg-green-600" : ""}`}
                        onClick={() => form.setValue("leaders_aligned_with_code", "good")}
                      >
                        <Check className="mr-2 h-4 w-4" /> Yes
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "poor" ? "default" : "outline"}
                        className={`w-28 ${field.value === "poor" ? "bg-red-500 hover:bg-red-600" : ""}`}
                        onClick={() => form.setValue("leaders_aligned_with_code", "poor")}
                      >
                        <X className="mr-2 h-4 w-4" /> No
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="employees_feel_safe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Do employees feel safe?</FormLabel>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant={field.value === "good" ? "default" : "outline"}
                        className={`w-28 ${field.value === "good" ? "bg-green-500 hover:bg-green-600" : ""}`}
                        onClick={() => form.setValue("employees_feel_safe", "good")}
                      >
                        <Check className="mr-2 h-4 w-4" /> Yes
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "poor" ? "default" : "outline"}
                        className={`w-28 ${field.value === "poor" ? "bg-red-500 hover:bg-red-600" : ""}`}
                        onClick={() => form.setValue("employees_feel_safe", "poor")}
                      >
                        <X className="mr-2 h-4 w-4" /> No
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="employees_feel_motivated"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Are employees motivated?</FormLabel>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant={field.value === "good" ? "default" : "outline"}
                        className={`w-28 ${field.value === "good" ? "bg-green-500 hover:bg-green-600" : ""}`}
                        onClick={() => form.setValue("employees_feel_motivated", "good")}
                      >
                        <Check className="mr-2 h-4 w-4" /> Yes
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "poor" ? "default" : "outline"}
                        className={`w-28 ${field.value === "poor" ? "bg-red-500 hover:bg-red-600" : ""}`}
                        onClick={() => form.setValue("employees_feel_motivated", "poor")}
                      >
                        <X className="mr-2 h-4 w-4" /> No
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="leaders_abusive_language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Do leaders use abusive language?</FormLabel>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant={field.value === "good" ? "default" : "outline"}
                        className={`w-28 ${field.value === "good" ? "bg-green-500 hover:bg-green-600" : ""}`}
                        onClick={() => form.setValue("leaders_abusive_language", "good")}
                      >
                        <Check className="mr-2 h-4 w-4" /> Yes
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "poor" ? "default" : "outline"}
                        className={`w-28 ${field.value === "poor" ? "bg-red-500 hover:bg-red-600" : ""}`}
                        onClick={() => form.setValue("leaders_abusive_language", "poor")}
                      >
                        <X className="mr-2 h-4 w-4" /> No
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="employees_comfort_escalation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Are employees comfortable with escalation process?</FormLabel>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant={field.value === "good" ? "default" : "outline"}
                        className={`w-28 ${field.value === "good" ? "bg-green-500 hover:bg-green-600" : ""}`}
                        onClick={() => form.setValue("employees_comfort_escalation", "good")}
                      >
                        <Check className="mr-2 h-4 w-4" /> Yes
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "poor" ? "default" : "outline"}
                        className={`w-28 ${field.value === "poor" ? "bg-red-500 hover:bg-red-600" : ""}`}
                        onClick={() => form.setValue("employees_comfort_escalation", "poor")}
                      >
                        <X className="mr-2 h-4 w-4" /> No
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="inclusive_culture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Is there an inclusive culture?</FormLabel>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant={field.value === "good" ? "default" : "outline"}
                        className={`w-28 ${field.value === "good" ? "bg-green-500 hover:bg-green-600" : ""}`}
                        onClick={() => form.setValue("inclusive_culture", "good")}
                      >
                        <Check className="mr-2 h-4 w-4" /> Yes
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "poor" ? "default" : "outline"}
                        className={`w-28 ${field.value === "poor" ? "bg-red-500 hover:bg-red-600" : ""}`}
                        onClick={() => form.setValue("inclusive_culture", "poor")}
                      >
                        <X className="mr-2 h-4 w-4" /> No
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          {/* Feedback */}
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Feedback</h3>
            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Feedback</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your observations and feedback..."
                      className="h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              type="button" 
              className="bg-amber-500 hover:bg-amber-600"
              onClick={form.handleSubmit(onSubmit)}
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save as Draft"}
            </Button>
            <Button
              type="button"
              onClick={handleSubmitForReview}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit for Review"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default NewVisit;
