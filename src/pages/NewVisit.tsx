import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuidv4 } from "uuid";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Send } from "lucide-react";

const formSchema = z.object({
  branchId: z.string().min(1, { message: "Branch is required" }),
  visitDate: z.date(),
  hrConnectSession: z.boolean().default(false),
  totalEmployeesInvited: z.number().min(0).optional(),
  totalParticipants: z.number().min(0).optional(),
  
  newEmployeesTotal: z.number().min(0).optional(),
  newEmployeesCovered: z.number()
    .min(0)
    .refine(val => val === undefined || val === 0 || val <= z.number().optional().parse(undefined), {
      message: "Covered must be less than or equal to total",
    })
    .optional(),
    
  starEmployeesTotal: z.number().min(0).optional(),
  starEmployeesCovered: z.number()
    .min(0)
    .refine(val => val === undefined || val === 0 || val <= z.number().optional().parse(undefined), {
      message: "Covered must be less than or equal to total",
    })
    .optional(),
    
  manningPercentage: z.number().min(0).max(100).optional(),
  attritionPercentage: z.number().min(0).max(100).optional(),
  nonVendorPercentage: z.number().min(0).max(100).optional(),
  erPercentage: z.number().min(0).max(100).optional(),
  cwtCases: z.number().min(0).optional(),
  
  performanceLevel: z.enum(["below_expectations", "meets_expectations", "exceeds_expectations"]).optional(),
  
  leadersAlignedWithCode: z.enum(["very_poor", "poor", "neutral", "good", "excellent"]).optional(),
  employeesFeelSafe: z.enum(["very_poor", "poor", "neutral", "good", "excellent"]).optional(),
  employeesFeelMotivated: z.enum(["very_poor", "poor", "neutral", "good", "excellent"]).optional(),
  leadersAbusiveLanguage: z.enum(["very_poor", "poor", "neutral", "good", "excellent"]).optional(),
  employeesComfortEscalation: z.enum(["very_poor", "poor", "neutral", "good", "excellent"]).optional(),
  inclusiveCulture: z.enum(["very_poor", "poor", "neutral", "good", "excellent"]).optional(),
  
  feedback: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const NewVisit = () => {
  const [assignedBranches, setAssignedBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("branch-info");
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're in edit mode
  const queryParams = new URLSearchParams(window.location.search);
  const editMode = queryParams.get('edit') !== null;
  const editData = location.state;
  
  // Form initialization with default values or edit data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      branchId: editMode && editData ? editData.branch_id : "",
      visitDate: editMode && editData ? new Date(editData.visit_date) : new Date(),
      hrConnectSession: editMode && editData ? editData.hr_connect_session : false,
      totalEmployeesInvited: editMode && editData ? editData.total_employees_invited : 0,
      totalParticipants: editMode && editData ? editData.total_participants : 0,
      newEmployeesTotal: editMode && editData ? editData.new_employees_total : 0,
      newEmployeesCovered: editMode && editData ? editData.new_employees_covered : 0,
      starEmployeesTotal: editMode && editData ? editData.star_employees_total : 0,
      starEmployeesCovered: editMode && editData ? editData.star_employees_covered : 0,
      manningPercentage: editMode && editData ? editData.manning_percentage : 0,
      attritionPercentage: editMode && editData ? editData.attrition_percentage : 0,
      nonVendorPercentage: editMode && editData ? editData.non_vendor_percentage : 0,
      erPercentage: editMode && editData ? editData.er_percentage : 0,
      cwtCases: editMode && editData ? editData.cwt_cases : 0,
      performanceLevel: editMode && editData ? editData.performance_level : undefined,
      leadersAlignedWithCode: editMode && editData ? editData.leaders_aligned_with_code : undefined,
      employeesFeelSafe: editMode && editData ? editData.employees_feel_safe : undefined,
      employeesFeelMotivated: editMode && editData ? editData.employees_feel_motivated : undefined,
      leadersAbusiveLanguage: editMode && editData ? editData.leaders_abusive_language : undefined,
      employeesComfortEscalation: editMode && editData ? editData.employees_comfort_escalation : undefined,
      inclusiveCulture: editMode && editData ? editData.inclusive_culture : undefined,
      feedback: editMode && editData ? editData.feedback : "",
    }
  });
  
  // Watch form values for dynamic calculations
  const watchHrConnectSession = form.watch("hrConnectSession");
  const watchTotalEmployeesInvited = form.watch("totalEmployeesInvited") || 0;
  const watchTotalParticipants = form.watch("totalParticipants") || 0;
  
  // Calculate the HR Connect coverage percentage
  const hrConnectCoverage = useMemo(() => {
    if (watchTotalEmployeesInvited > 0 && watchTotalParticipants > 0) {
      return Math.round((watchTotalParticipants / watchTotalEmployeesInvited) * 100);
    }
    return 0;
  }, [watchTotalEmployeesInvited, watchTotalParticipants]);

  useEffect(() => {
    if (user) {
      fetchAssignedBranches();
    }
  }, [user]);

  const fetchAssignedBranches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('branch_assignments')
        .select(`
          branch_id,
          branches:branch_id (
            id,
            name,
            location,
            category
          )
        `)
        .eq('user_id', user!.id);

      if (error) throw error;

      // Transform data to make it easier to work with
      const branches = data.map(item => ({
        id: item.branches.id,
        name: item.branches.name,
        location: item.branches.location,
        category: item.branches.category,
      }));

      setAssignedBranches(branches);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast({
        variant: "destructive",
        title: "Error fetching branches",
        description: "There was a problem loading your assigned branches.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: FormValues, status: 'draft' | 'submitted' = 'draft') => {
    if (!user) return;
    
    setSubmitting(true);
    
    try {
      const visitData = {
        id: editMode ? queryParams.get('edit') : uuidv4(),
        user_id: user.id,
        branch_id: values.branchId,
        visit_date: values.visitDate.toISOString(),
        status,
        
        hr_connect_session: values.hrConnectSession,
        total_employees_invited: values.totalEmployeesInvited || 0,
        total_participants: values.totalParticipants || 0,
        
        new_employees_total: values.newEmployeesTotal || 0,
        new_employees_covered: values.newEmployeesCovered || 0,
        star_employees_total: values.starEmployeesTotal || 0,
        star_employees_covered: values.starEmployeesCovered || 0,
        
        manning_percentage: values.manningPercentage || 0,
        attrition_percentage: values.attritionPercentage || 0,
        non_vendor_percentage: values.nonVendorPercentage || 0,
        er_percentage: values.erPercentage || 0,
        cwt_cases: values.cwtCases || 0,
        
        performance_level: values.performanceLevel,
        
        leaders_aligned_with_code: values.leadersAlignedWithCode,
        employees_feel_safe: values.employeesFeelSafe,
        employees_feel_motivated: values.employeesFeelMotivated,
        leaders_abusive_language: values.leadersAbusiveLanguage,
        employees_comfort_escalation: values.employeesComfortEscalation,
        inclusive_culture: values.inclusiveCulture,
        
        feedback: values.feedback,
      };

      let operation;
      if (editMode) {
        // Update existing visit
        operation = supabase
          .from('branch_visits')
          .update(visitData)
          .eq('id', visitData.id);
      } else {
        // Insert new visit
        operation = supabase
          .from('branch_visits')
          .insert(visitData);
      }

      const { error } = await operation;
      if (error) throw error;

      toast({
        title: editMode ? "Visit updated" : "Visit created",
        description: status === 'draft' 
          ? "Your visit report has been saved as a draft." 
          : "Your visit report has been submitted for review.",
        variant: "default",
      });

      navigate('/bh/my-visits');
    } catch (error) {
      console.error('Error saving visit:', error);
      toast({
        variant: "destructive",
        title: "Error saving visit",
        description: "There was a problem saving your visit report. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">{editMode ? 'Edit Branch Visit' : 'New Branch Visit'}</CardTitle>
        </CardHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => onSubmit(values, 'submitted'))}>
            <CardContent>
              <Tabs defaultValue="branch-info" value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid grid-cols-1 md:grid-cols-4 mb-6">
                  <TabsTrigger value="branch-info">Branch Info</TabsTrigger>
                  <TabsTrigger value="hr-connect">HR Connect</TabsTrigger>
                  <TabsTrigger value="metrics">Branch Metrics</TabsTrigger>
                  <TabsTrigger value="assessment">Qualitative Assessment</TabsTrigger>
                </TabsList>
                
                <TabsContent value="branch-info" className="mt-0">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="branchId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Branch</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a branch" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {assignedBranches.map((branch) => (
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
                        name="visitDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Visit Date</FormLabel>
                            <DatePicker
                              date={field.value}
                              setDate={field.onChange}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="hr-connect" className="mt-0">
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={form.control}
                      name="hrConnectSession"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>HR Connect Session Conducted</FormLabel>
                            <FormDescription>
                              Check this if an HR Connect session was conducted during this visit
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    {watchHrConnectSession && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="totalEmployeesInvited"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total Employees Invited</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  {...field}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    field.onChange(isNaN(value) ? 0 : value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="totalParticipants"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total Participants</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  {...field}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    field.onChange(isNaN(value) ? 0 : value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div>
                          <div className="text-sm font-medium mb-2">Coverage</div>
                          <div className="bg-slate-100 p-2 rounded text-center">
                            <span className="text-xl font-semibold">{hrConnectCoverage}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="font-medium mb-3">Employee Coverage</h3>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm mb-3">New Employees (0-6 months)</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="newEmployeesTotal"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Total</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        {...field}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value);
                                          field.onChange(isNaN(value) ? 0 : value);
                                        }}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="newEmployeesCovered"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Covered</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        {...field}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value);
                                          field.onChange(isNaN(value) ? 0 : value);
                                        }}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm mb-3">STAR Employees</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="starEmployeesTotal"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Total</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        {...field}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value);
                                          field.onChange(isNaN(value) ? 0 : value);
                                        }}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="starEmployeesCovered"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Covered</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        {...field}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value);
                                          field.onChange(isNaN(value) ? 0 : value);
                                        }}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="metrics" className="mt-0">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="manningPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manning Percentage</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                {...field}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  field.onChange(isNaN(value) ? 0 : Math.min(value, 100));
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              Enter value from 0-100%
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="attritionPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Attrition Percentage</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                {...field}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  field.onChange(isNaN(value) ? 0 : Math.min(value, 100));
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              Enter value from 0-100%
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="nonVendorPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Non-Vendor Percentage</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                {...field}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  field.onChange(isNaN(value) ? 0 : Math.min(value, 100));
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              Enter value from 0-100%
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="erPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ER Percentage</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                {...field}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  field.onChange(isNaN(value) ? 0 : Math.min(value, 100));
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              Enter value from 0-100%
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="cwtCases"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CWT Cases</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  field.onChange(isNaN(value) ? 0 : value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="performanceLevel"
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
                                <SelectItem value="below_expectations">Below Expectations</SelectItem>
                                <SelectItem value="meets_expectations">Meets Expectations</SelectItem>
                                <SelectItem value="exceeds_expectations">Exceeds Expectations</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="assessment" className="mt-0">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="leadersAlignedWithCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Leaders Aligned with Code</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="very_poor" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Very Poor
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="poor" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Poor
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="neutral" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Neutral
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="good" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Good
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="excellent" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Excellent
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="employeesFeelSafe"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employees Feel Safe</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="very_poor" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Very Poor
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="poor" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Poor
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="neutral" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Neutral
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="good" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Good
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="excellent" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Excellent
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="employeesFeelMotivated"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employees Feel Motivated</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="very_poor" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Very Poor
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="poor" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Poor
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="neutral" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Neutral
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="good" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Good
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="excellent" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Excellent
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="leadersAbusiveLanguage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Leaders Use Abusive Language</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="very_poor" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Very Poor
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="poor" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Poor
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="neutral" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Neutral
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="good" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Good
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="excellent" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Excellent
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="employeesComfortEscalation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employees Comfortable with Escalation</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="very_poor" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Very Poor
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="poor" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Poor
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="neutral" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Neutral
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="good" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Good
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="excellent" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Excellent
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="inclusiveCulture"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Inclusive Culture</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="very_poor" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Very Poor
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="poor" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Poor
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="neutral" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Neutral
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="good" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Good
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="excellent" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Excellent
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="feedback"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Remarks</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add any additional feedback or remarks about the visit"
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/bh/my-visits')}
              >
                Cancel
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                  onClick={() => form.handleSubmit((values) => onSubmit(values, 'draft'))()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save as Draft
                </Button>
                <Button 
                  type="submit" 
                  className="flex gap-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit
                </Button>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default NewVisit;
