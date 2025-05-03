
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CircleDashed, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Search,
  AlertTriangle, 
  FileSpreadsheet,
  Edit,
  Trash2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
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
import BranchVisitDetailsModal from "@/components/branch/BranchVisitDetailsModal";

interface BranchVisitWithBranch {
  id: string;
  user_id: string;
  branch_id: string;
  visit_date: string;
  status: string;
  created_at: string;
  branches: {
    name: string;
    location: string;
    category: string;
  };
  [key: string]: any;
}

const statusConfig = {
  draft: {
    icon: CircleDashed,
    label: "Draft",
    color: "bg-slate-200 text-slate-800 hover:bg-slate-200",
  },
  submitted: {
    icon: Eye,
    label: "Submitted",
    color: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  approved: {
    icon: CheckCircle2,
    label: "Approved",
    color: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  rejected: {
    icon: AlertCircle,
    label: "Rejected",
    color: "bg-red-100 text-red-800 hover:bg-red-100",
  },
};

const formatVisitDate = (dateString: string) => {
  try {
    return format(parseISO(dateString), "dd MMM yyyy");
  } catch (error) {
    return dateString;
  }
};

const MyVisits = () => {
  const [visits, setVisits] = useState<BranchVisitWithBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedVisit, setSelectedVisit] = useState<BranchVisitWithBranch | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchVisits();
    }
  }, [user]);

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("branch_visits")
        .select(`
          *,
          branches:branch_id (
            name,
            location,
            category
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVisits(data as BranchVisitWithBranch[]);
    } catch (error) {
      console.error("Error fetching visits:", error);
      toast({
        variant: "destructive",
        title: "Error fetching visits",
        description: "There was a problem fetching your visits. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewVisit = (visit: BranchVisitWithBranch) => {
    setSelectedVisit(visit);
    setIsDetailsModalOpen(true);
  };

  const handleEditVisit = (visit: BranchVisitWithBranch) => {
    if (visit.status === "draft") {
      navigate(`/bh/edit-visit/${visit.id}`);
    } else {
      toast({
        variant: "warning",
        title: "Cannot edit visit",
        description: "Only draft visits can be edited.",
      });
    }
  };

  const confirmDeleteVisit = (visitId: string) => {
    setVisitToDelete(visitId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteVisit = async () => {
    if (!visitToDelete) return;
    
    try {
      const { error } = await supabase
        .from("branch_visits")
        .delete()
        .eq("id", visitToDelete);
        
      if (error) throw error;
      
      // Update the local state to remove the deleted visit
      setVisits(visits.filter(visit => visit.id !== visitToDelete));
      
      toast({
        title: "Visit deleted",
        description: "The visit has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting visit:", error);
      toast({
        variant: "destructive",
        title: "Error deleting visit",
        description: "There was a problem deleting the visit. Please try again.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setVisitToDelete(null);
    }
  };

  const filteredVisits = visits.filter((visit) => {
    // Filter by search query
    const matchesSearch =
      searchQuery === "" ||
      visit.branches?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.branches?.location?.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter by status
    const matchesStatus = statusFilter === "all" || visit.status === statusFilter;

    // Filter by tab
    const matchesTab = activeTab === "all" || visit.status === activeTab;

    return matchesSearch && matchesStatus && matchesTab;
  });

  const statusCounts = {
    all: visits.length,
    draft: visits.filter(v => v.status === 'draft').length,
    submitted: visits.filter(v => v.status === 'submitted').length,
    approved: visits.filter(v => v.status === 'approved').length,
    rejected: visits.filter(v => v.status === 'rejected').length,
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">My Visits</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                className="pl-9"
                placeholder="Search by branch or location..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-1">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger value="draft">
                Draft ({statusCounts.draft})
              </TabsTrigger>
              <TabsTrigger value="submitted">
                Pending ({statusCounts.submitted})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({statusCounts.approved})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({statusCounts.rejected})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileSpreadsheet className="h-12 w-12 mx-auto opacity-20 mb-3" />
              <h3 className="text-xl font-medium mb-2">No visits found</h3>
              <p>
                You haven't created any visit reports that match your filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {filteredVisits.map((visit) => {
                const StatusIcon = statusConfig[visit.status as keyof typeof statusConfig]?.icon || AlertTriangle;
                
                return (
                  <Card 
                    key={visit.id} 
                    className="overflow-hidden hover:border-slate-300 transition-colors"
                  >
                    <CardContent className="pt-5">
                      <div className="mb-2 flex justify-between">
                        <Badge className={`${statusConfig[visit.status as keyof typeof statusConfig]?.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[visit.status as keyof typeof statusConfig]?.label}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatVisitDate(visit.visit_date)}</span>
                        </div>
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-1">{visit.branches.name}</h3>
                      <p className="text-slate-500 text-sm mb-3">{visit.branches.location}</p>
                      
                      <div className={
                        `px-2 py-1 text-xs inline-block rounded-full capitalize
                        ${visit.branches.category === 'platinum' ? 'bg-violet-100 text-violet-800' : 
                          visit.branches.category === 'diamond' ? 'bg-blue-100 text-blue-800' :
                          visit.branches.category === 'gold' ? 'bg-amber-100 text-amber-800' :
                          visit.branches.category === 'silver' ? 'bg-slate-100 text-slate-800' :
                          'bg-orange-100 text-orange-800'
                        }`
                      }>
                        {visit.branches.category}
                      </div>
                      
                      <div className="flex justify-end mt-4 pt-3 border-t gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs"
                          onClick={() => handleViewVisit(visit)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                        
                        {visit.status === 'draft' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 text-xs"
                              onClick={() => handleEditVisit(visit)}
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                            
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 text-xs"
                              onClick={() => confirmDeleteVisit(visit.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Visit Details Modal */}
      <BranchVisitDetailsModal
        visit={selectedVisit}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedVisit(null);
        }}
        onEdit={() => {
          setIsDetailsModalOpen(false);
          if (selectedVisit) {
            handleEditVisit(selectedVisit);
          }
        }}
        onDelete={() => {
          setIsDetailsModalOpen(false);
          if (selectedVisit) {
            confirmDeleteVisit(selectedVisit.id);
          }
        }}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this visit report. You cannot undo this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteVisit}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyVisits;
