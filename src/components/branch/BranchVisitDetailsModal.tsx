import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Clock, Eye, CheckCircle, AlertTriangle, Edit, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Database } from "@/integrations/supabase/types";

type BranchVisitWithBranch = Database["public"]["Tables"]["branch_visits"]["Row"] & {
  branches: {
    name: string;
    location: string;
    category: string;
    branch_code?: string;
  }
};

interface BranchVisitDetailsModalProps {
  visit: BranchVisitWithBranch | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const BranchVisitDetailsModal = ({
  visit,
  isOpen,
  onClose,
  onEdit,
  onDelete
}: BranchVisitDetailsModalProps) => {
  if (!visit) return null;

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
          label: 'submitted', 
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
          icon: <AlertTriangle className="h-3 w-3 mr-1" />
        };
      default:
        return { 
          label: 'Unknown', 
          className: 'bg-gray-200 text-gray-800 hover:bg-gray-200',
          icon: null
        };
    }
  };

  const getCategoryName = (category: string | undefined) => {
    // Add null check to prevent calling charAt on undefined
    if (!category) return "Unknown";
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getQualitativeLabel = (value: string | null) => {
    if (!value) return "Not rated";
    
    switch (value) {
      case 'very_poor': return 'Very Poor';
      case 'poor': return 'Poor';
      case 'neutral': return 'Neutral';
      case 'good': return 'Good';
      case 'excellent': return 'Excellent';
      default: return 'Not rated';
    }
  };

  const statusBadge = getStatusBadge(visit.status);

  // Show edit and delete buttons only for draft status
  const isDraft = visit.status === 'draft';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <span>Branch Visit Details</span>
            <Badge className={statusBadge.className}>
              <span className="flex items-center">
                {statusBadge.icon}
                {statusBadge.label}
              </span>
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-2">
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{visit.branches?.name || 'Unknown Branch'}</h3>
              <p className="text-sm text-slate-600">
                {visit.branches?.location || 'Unknown Location'}
                <span className="text-slate-400 mx-1">•</span>
                {visit.branches?.branch_code || 'No Code'}
                <span className="text-slate-400 mx-1">•</span>
                {getCategoryName(visit.branches?.category)}
              </p>
            </div>
            <div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                visit.branches?.category === 'platinum' ? 'bg-violet-100 text-violet-700' : 
                visit.branches?.category === 'diamond' ? 'bg-blue-100 text-blue-700' :
                visit.branches?.category === 'gold' ? 'bg-amber-100 text-amber-700' :
                visit.branches?.category === 'silver' ? 'bg-slate-100 text-slate-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {getCategoryName(visit.branches?.category)}
              </div>
            </div>
          </div>
          
          {/* Visit Information content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">Visit Information</h3>
              <div className="bg-slate-50 rounded-md p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Visit Date</p>
                    <p className="text-sm font-medium">{formatDate(visit.visit_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">HR Connect Session</p>
                    <p className="text-sm font-medium">{visit.hr_connect_session ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">HR Connect Coverage</h3>
              <div className="bg-slate-50 rounded-md p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Total Employees Invited</p>
                    <p className="text-sm font-medium">{visit.total_employees_invited || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Participants</p>
                    <p className="text-sm font-medium">{visit.total_participants || 0}</p>
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
              </div>
            </div>
          </div>
          
          {/* Branch Metrics */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Branch Metrics</h3>
            <div className="bg-slate-50 rounded-md p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Manning %</p>
                  <p className="text-sm font-medium">{visit.manning_percentage || 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Attrition %</p>
                  <p className="text-sm font-medium">{visit.attrition_percentage || 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Non-Vendor %</p>
                  <p className="text-sm font-medium">{visit.non_vendor_percentage || 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">ER %</p>
                  <p className="text-sm font-medium">{visit.er_percentage || 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">CWT Cases</p>
                  <p className="text-sm font-medium">{visit.cwt_cases || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Performance Level</p>
                  <p className="text-sm font-medium">{visit.performance_level || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Employee Coverage */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Employee Coverage</h3>
            <div className="bg-slate-50 rounded-md p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <h4 className="text-xs font-semibold mb-2">New Employees (0-6 months)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="text-sm font-medium">{visit.new_employees_total || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Covered</p>
                      <p className="text-sm font-medium">{visit.new_employees_covered || 0}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-semibold mb-2">STAR Employees</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="text-sm font-medium">{visit.star_employees_total || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Covered</p>
                      <p className="text-sm font-medium">{visit.star_employees_covered || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Qualitative Assessment */}
          <div className="mb-6">
            <h3 className="text-base font-medium mb-2">Qualitative Assessment</h3>
            <div className="bg-slate-50 rounded-md p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-500">Leaders Aligned with Code</p>
                  <p className="text-sm font-medium">{visit.leaders_aligned_with_code || 'Not rated'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Employees Feel Safe</p>
                  <p className="text-sm font-medium">{visit.employees_feel_safe || 'Not rated'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Employees Feel Motivated</p>
                  <p className="text-sm font-medium">{visit.employees_feel_motivated || 'Not rated'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Leaders Use Abusive Language</p>
                  <p className="text-sm font-medium">{visit.leaders_abusive_language || 'Not rated'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Employees Comfortable with Escalation</p>
                  <p className="text-sm font-medium">{visit.employees_comfort_escalation || 'Not rated'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Inclusive Culture</p>
                  <p className="text-sm font-medium">{visit.inclusive_culture || 'Not rated'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Remarks */}
          {visit.feedback && (
            <div className="mb-6">
              <h3 className="text-base font-medium mb-2">Additional Remarks</h3>
              <div className="bg-slate-50 rounded-md p-4">
                <p className="text-sm">{visit.feedback}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-between">
          <div className="flex gap-2">
            {/* Edit and Delete buttons for draft status */}
            {isDraft && onEdit && (
              <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50" onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
            
            {isDraft && onDelete && (
              <Button variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            )}
          </div>
          
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BranchVisitDetailsModal;
