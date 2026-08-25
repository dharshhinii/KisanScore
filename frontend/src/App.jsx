import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Gateway from './pages/Gateway';
import Postman from './pages/Postman';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 font-sans text-slate-100 antialiased">
        <Routes>
          <Route path="/" element={<Gateway />} />
          <Route path="/postman" element={<Postman />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
