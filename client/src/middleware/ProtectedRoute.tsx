import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { user, setAuth, logout } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

 useEffect(() => {
  if (!user) {
    navigate('/login');
  }
}, [user]);


  return <>{children}</>;
};

export default ProtectedRoute