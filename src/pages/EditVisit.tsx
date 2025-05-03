
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const EditVisit = () => {
  const { visitId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVisitData = async () => {
      if (!visitId) {
        navigate('/bh/new-visit');
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('branch_visits')
          .select('*')
          .eq('id', visitId)
          .single();
        
        if (error) throw error;
        
        // Navigate to new-visit with query param for editing
        navigate(`/bh/new-visit?edit=${visitId}`, { state: data });
      } catch (error) {
        console.error('Error fetching visit data:', error);
        navigate('/bh/my-visits');
      }
    };

    fetchVisitData();
  }, [visitId, navigate]);

  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-2">Loading visit data...</span>
    </div>
  );
};

export default EditVisit;
