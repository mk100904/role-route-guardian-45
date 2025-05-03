import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilePlus, Search, Filter, Calendar as CalendarIcon, Eye, Clock, CheckCircle, X, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchUserBranchVisits } from "@/services/branchService";
import { toast } from "@/components/ui/use-toast";
import { Database } from "@/integrations/supabase/types";
import BranchVisitDetailsModal from "@/components/branch/BranchVisitDetailsModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { supabase } from "@/integrations/supabase/client";

type BranchVisitWithBranch = Database["public"]["Tables"]["branch_visits"]["Row"] & {
  branches: {
    name: string;
    location: string;
    category: string;
  }
};

const MyVisits = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [branchCategory, setBranchCategory] = useState("");
  const [month, setMonth] = useState("");
  const [status, setStatus] = useState("all");
  const [visits, setVisits] = useState<BranchVisitWithBranch[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<BranchVisitWithBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<BranchVisitWithBranch | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // New state for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchVisits = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const visitsData = await fetchUserBranchVisits(user.id);
        setVisits(visitsData as BranchVisitWithBranch[]);
        setFilteredVisits(visitsData as BranchVisitWithBranch[]);
      } catch (error) {
        console.error("Error fetching visits:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your branch visits.",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchVisits();
  }, [user]);
  
  useEffect(() => {
    // Apply filters when filter values change
    filterVisits();
  }, [searchQuery, branchCategory, month, status, visits]);
  
  const filterVisits = () => {
    let filtered = [...visits];
    
    // Text search
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      filtered = filtered.filter(visit => 
        visit.branches.name.toLowerCase().includes(search) || 
        visit.branches.location.toLowerCase().includes(search)
      );
    }
    
    // Category filter
    if (branchCategory && branchCategory !== "all") {
      filtered = filtered.filter(visit => visit.branch_category === branchCategory);
    }
    
    // Month filter
    if (month && month !== "all") {
      const monthIndex = [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december"
      ].indexOf(month.toLowerCase());
      
      if (monthIndex !== -1) {
        filtered = filtered.filter(visit => {
          const date = parseISO(visit.visit_date);
          return date.getMonth() === monthIndex;
        });
      }
    }
    
    // Status filter
    if (status && status !== "all") {
      filtered = filtered.filter(visit => visit.status === status);
    }
    
    setFilteredVisits(filtered);
  };
  
  const resetFilters = () => {
    setSearchQuery("");
    setBranchCategory("");
    setMonth("");
    setStatus("all");
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return dateString;
    }
  };
  
  // Get status badge properties
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'draft':
        return { 
          label: 'Draft', 
          className: 'bg-slate-200 text-slate-800 hover:bg-slate-200',
          icon: <Clock className="h-3 w-3 mr-1" />
        };
      case 'submitted':
        return { 
          label: 'Submitted', 
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
          icon: <Eye className="h-3 w-3 mr-1" />
        };
      case 'approved':
        return { 
          label: 'Approved', 
          className: 'bg-green-100 text-green-800 hover:bg-green-100',
          icon: <CheckCircle className="h-3 w-3 mr-1" />
        };
      case 'rejected':
        return { 
          label: 'Rejected', 
          className: 'bg-red-100 text-red-800 hover:bg-red-100',
          icon: <X className="h-3 w-3 mr-1" />
        };
      default:
        return { 
          label: 'Unknown', 
          className: 'bg-gray-200 text-gray-800 hover:bg-gray-200',
          icon: null
        };
    }
  };
  
  const handleViewDetails = (visit: BranchVisitWithBranch) => {
    setSelectedVisit(visit);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };
  
  // New functions for edit and delete
  const handleEditVisit = (visitId: string) => {
    navigate(`/bh/edit-visit/${visitId}`);
  };
  
  const handleDeleteClick = (visitId: string) => {
    setVisitToDelete(visitId);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!visitToDelete) return;
    
    try {
      const { error } = await supabase
        .from("branch_visits")
        .delete()
        .eq("id", visitToDelete);
        
      if (error) throw error;
      
      // Remove the deleted visit from state
      const updatedVisits = visits.filter(visit => visit.id !== visitToDelete);
      setVisits(updatedVisits);
      setFilteredVisits(updatedVisits);
      
      toast({
        title: "Visit deleted",
        description: "The visit report has been successfully deleted.",
      });
      
      // Close the dialogs
      setIsDeleteDialogOpen(false);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error deleting visit:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete the visit report.",
      });
    }
  };
  
  const handleDeleteCancel = () => {
    setVisitToDelete(null);
    setIsDeleteDialogOpen(false);
  };
  
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">My Branch Visits</h1>
          <p className="text-slate-600">View and manage your branch visit records</p>
        </div>
        
        <Button 
          onClick={() => navigate("/bh/new-visit")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <FilePlus className="h-4 w-4" />
          New Visit
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="p-4 md:p-6 pt-4 pb-0 md:pt-6 md:pb-2">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  placeholder="Search by branch name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {!isMobile ? (
                <>
                  <Select
                    value={month}
                    onValueChange={setMonth}
                  >
                    <SelectTrigger className="border-slate-200 w-[150px]">
                      <SelectValue placeholder="All Months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      <SelectItem value="january">January</SelectItem>
                      <SelectItem value="february">February</SelectItem>
                      <SelectItem value="march">March</SelectItem>
                      <SelectItem value="april">April</SelectItem>
                      <SelectItem value="may">May</SelectItem>
                      <SelectItem value="june">June</SelectItem>
                      <SelectItem value="july">July</SelectItem>
                      <SelectItem value="august">August</SelectItem>
                      <SelectItem value="september">September</SelectItem>
                      <SelectItem value="october">October</SelectItem>
                      <SelectItem value="november">November</SelectItem>
                      <SelectItem value="december">December</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={branchCategory}
                    onValueChange={setBranchCategory}
                  >
                    <SelectTrigger className="border-slate-200 w-[150px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="platinum">Platinum</SelectItem>
                      <SelectItem value="diamond">Diamond</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="bronze">Bronze</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Tabs value={status} onValueChange={setStatus} className="w-[400px]">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="submitted">Submitted</TabsTrigger>
                      <TabsTrigger value="approved">Approved</TabsTrigger>
                      <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-2 md:pt-4">
          {/* Mobile filter dropdown */}
          {isMobile && (
            <div className="grid grid-cols-2 gap-4 p-4">
              <div className="p-2">
                <p className="text-xs font-medium mb-2">Month</p>
                <Select
                  value={month}
                  onValueChange={setMonth}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    <SelectItem value="january">January</SelectItem>
                    <SelectItem value="february">February</SelectItem>
                    <SelectItem value="march">March</SelectItem>
                    <SelectItem value="april">April</SelectItem>
                    <SelectItem value="may">May</SelectItem>
                    <SelectItem value="june">June</SelectItem>
                    <SelectItem value="july">July</SelectItem>
                    <SelectItem value="august">August</SelectItem>
                    <SelectItem value="september">September</SelectItem>
                    <SelectItem value="october">October</SelectItem>
                    <SelectItem value="november">November</SelectItem>
                    <SelectItem value="december">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium mb-2">Branch Category</p>
                <Select
                  value={branchCategory}
                  onValueChange={setBranchCategory}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                    <SelectItem value="diamond">Diamond</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="bronze">Bronze</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium mb-2">Status</p>
                <Tabs value={status} onValueChange={setStatus} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="submitted">Submitted</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : null}
          
        </CardContent>
      </Card>
      
      {!loading && filteredVisits.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-medium mb-2">No visits found matching your filters</h3>
          <p className="text-slate-500 mb-6">
            Try changing your search criteria or create a new branch visit record.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              variant="outline" 
              onClick={resetFilters}
            >
              Reset Filters
            </Button>
            <Button
              onClick={() => navigate("/bh/new-visit")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FilePlus className="mr-2 h-4 w-4" />
              Create New Visit
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVisits.map((visit) => {
            const statusBadge = getStatusBadge(visit.status);
            const categoryName = visit.branch_category.charAt(0).toUpperCase() + visit.branch_category.slice(1);
            
            return (
              <Card key={visit.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className={`h-2 w-full ${visit.branch_category === 'platinum' ? 'bg-violet-500' : 
                                             visit.branch_category === 'diamond' ? 'bg-blue-500' :
                                             visit.branch_category === 'gold' ? 'bg-amber-500' :
                                             visit.branch_category === 'silver' ? 'bg-slate-400' :
                                             'bg-orange-700'}`}></div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{visit.branches.name}</h3>
                      <p className="text-sm text-slate-500">{visit.branches.location}</p>
                    </div>
                    <Badge className={statusBadge.className}>
                      <span className="flex items-center">
                        {statusBadge.icon}
                        {statusBadge.label}
                      </span>
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                    <div>
                      <p className="text-xs text-slate-500">Visit Date</p>
                      <p className="text-sm font-medium">{formatDate(visit.visit_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Category</p>
                      <p className="text-sm font-medium">{categoryName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">HR Connect</p>
                      <p className="text-sm font-medium">{visit.hr_connect_session ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Coverage</p>
                      <p className="text-sm font-medium">
                        {visit.total_employees_invited && visit.total_participants ? 
                          Math.round((visit.total_participants / visit.total_employees_invited) * 100) + '%' : 
                          '0%'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 text-sm"
                      onClick={() => handleViewDetails(visit)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                    
                    {/* Only show Edit button for draft status */}
                    {visit.status === 'draft' && (
                      <Button
                        variant="outline"
                        className="text-blue-600 border-blue-600"
                        onClick={() => handleEditVisit(visit.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Details Modal - Update to pass edit and delete handlers */}
      <BranchVisitDetailsModal
        visit={selectedVisit}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onEdit={selectedVisit?.status === 'draft' ? () => selectedVisit && handleEditVisit(selectedVisit.id) : undefined}
        onDelete={selectedVisit?.status === 'draft' ? () => selectedVisit && handleDeleteClick(selectedVisit.id) : undefined}
      />
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        title="Delete Visit Report"
        description="Are you sure you want to delete this visit report? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
};

export default MyVisits;
