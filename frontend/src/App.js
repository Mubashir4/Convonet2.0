// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/pages/Login';
import Signup from './components/pages/Signup';
import Dashboard from './components/pages/Dashboard';
import TopBar from './components/TopBar';
import PrivateRoute from './components/routes/PrivateRoute'; // Import the PrivateRoute component

const App = () => {
  return (
    <Router>
      <Routes>
        <Route exact path="/" element={<><TopBar /><Login /></>} />
        <Route path="/signup" element={<><TopBar /><Signup /></>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      </Routes>
    </Router>
  );
};

export default App;
