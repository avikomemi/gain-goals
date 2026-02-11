import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Dumbbell, TrendingUp, User } from 'lucide-react';

const tabs = [
  { path: '/', icon: Home, label: 'ראשי' },
  { path: '/workout', icon: Dumbbell, label: 'אימון' },
  { path: '/progress', icon: TrendingUp, label: 'התקדמות' },
  { path: '/profile', icon: User, label: 'פרופיל' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide nav during active workout
  if (location.pathname.startsWith('/workout/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'text-primary scale-105' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
