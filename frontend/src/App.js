// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/pages/Login';
import Signup from './components/pages/Signup';
import Dashboard from './components/pages/Dashboard';
import TopBar from './components/TopBar';
import PrivateRoute from './components/routes/PrivateRoute'; // Import the PrivateRoute component
import { TranscriptionProvider } from './components/pages/TranscriptionContext'; // Import the context provider
import ResetPassword from './components/pages/ResetPassword';
import NewPassword from './components/pages/NewPassword';

const App = () => {
  return (
    <TranscriptionProvider>
      <Router>
        <Routes>
          <Route exact path="/" element={<><Login /></>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password/:token" element={<NewPassword />} />
          <Route path="/signup" element={<><TopBar /><Signup /></>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        </Routes>
      </Router>
    </TranscriptionProvider>
  );
};

export default App;
