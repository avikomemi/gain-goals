import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import SensitivityWarning from '../components/SensitivityWarning';
import { Save, Plus } from 'lucide-react';

const Profile = () => {
  const { profile, setProfile, addWeightEntry } = useApp();
  const [newWeight, setNewWeight] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);

  const handleSaveWeight = () => {
    const w = parseFloat(newWeight);
    if (w > 0) {
      addWeightEntry({ date: new Date().toISOString().split('T')[0], weight: w });
      setNewWeight('');
    }
  };

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      <h1 className="text-2xl font-bold mb-5">פרופיל</h1>

      {/* Sensitivity Warning - Prominent */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <SensitivityWarning />
      </motion.div>

      {/* Personal Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-xl p-4 mb-4"
      >
        <h3 className="text-sm font-semibold mb-3">פרטים אישיים</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">גיל</span>
            <span className="text-sm font-medium">{profile.age}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">גובה</span>
            <span className="text-sm font-medium">{profile.height} ס"מ</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">משקל נוכחי</span>
            <span className="text-sm font-medium">{profile.weight} ק"ג</span>
          </div>
        </div>
      </motion.div>

      {/* Add Weight */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl p-4 mb-4"
      >
        <h3 className="text-sm font-semibold mb-3">עדכון משקל</h3>
        <div className="flex gap-2">
          <input
            type="number"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            placeholder="משקל חדש (ק״ג)"
            step="0.1"
            className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSaveWeight}
            className="gradient-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> שמור
          </button>
        </div>
      </motion.div>

      {/* Goals */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card border border-border rounded-xl p-4 mb-4"
      >
        <h3 className="text-sm font-semibold mb-3">מטרות</h3>
        <div className="flex flex-wrap gap-2">
          {profile.goals.map((goal, i) => (
            <span key={i} className="bg-primary/15 text-primary text-xs font-medium px-3 py-1.5 rounded-full">
              {goal}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Weight History */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-xl p-4"
      >
        <h3 className="text-sm font-semibold mb-3">היסטוריית משקל</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {[...profile.weightHistory].reverse().map((entry, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{new Date(entry.date).toLocaleDateString('he-IL')}</span>
              <span className="font-medium">{entry.weight} ק"ג</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
