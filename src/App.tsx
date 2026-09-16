import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './store/store';
import { Nav } from './components/bits';
import { armBell } from './lib/bell';
import Dashboard from './pages/Dashboard';
import Workout from './pages/Workout';
import Journal from './pages/Journal';
import Trends from './pages/Trends';
import Team from './pages/Team';

export default function App() {
  // המחווה הראשונה באפליקציה מחממת את צליל סוף הטיימר — כדי שהוא יוכל לנגן
  // אחר כך בלי מחווה (דרישת אייפון), עוד לפני שאבי בכלל נכנס למסך האימון
  useEffect(() => { armBell(); }, []);

  return (
    <StoreProvider>
      <HashRouter>
        <div className="app">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workout" element={<Workout />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/team" element={<Team />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
          <Nav />
        </div>
      </HashRouter>
    </StoreProvider>
  );
}
