
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import BHDashboardLayout from '@/components/bh/BHDashboardLayout';
import MyVisits from '@/pages/MyVisits';
import NewVisit from '@/pages/NewVisit';
import EditVisit from '@/pages/EditVisit';

// This component acts as a wrapper for branch-related routes
const BranchRoutesWrapper = () => {
  return (
    <Routes>
      <Route path="/" element={<BHDashboardLayout />}>
        <Route path="my-visits" element={<MyVisits />} />
        <Route path="new-visit" element={<NewVisit />} />
        <Route path="edit-visit/:visitId" element={<EditVisit />} />
      </Route>
    </Routes>
  );
};

export default BranchRoutesWrapper;
