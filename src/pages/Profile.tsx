import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import SensitivityWarning from '../components/SensitivityWarning';
import { Plus, Globe } from 'lucide-react';

const Profile = () => {
  const { profile, addWeightEntry } = useApp();
  const { t, lang, setLang } = useI18n();
  const [newWeight, setNewWeight] = useState('');

  const handleSaveWeight = () => {
    const w = parseFloat(newWeight);
    if (w > 0) {
      addWeightEntry({ date: new Date().toISOString().split('T')[0], weight: w });
      setNewWeight('');
    }
  };

  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const goalKeys: Record<string, string> = {
    'חיטוב': t('goal.toning'),
    'גמישות': t('goal.flexibility'),
    'כוח': t('goal.strength'),
  };

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      <h1 className="text-2xl font-bold mb-5">{t('prof.title')}</h1>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <SensitivityWarning />
      </motion.div>

      {/* Language Switcher */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="bg-card border border-border rounded-xl p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          {t('prof.language')}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setLang('he')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
              lang === 'he' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            עברית
          </button>
          <button
            onClick={() => setLang('en')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
              lang === 'en' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            English
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-xl p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3">{t('prof.personal')}</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t('prof.age')}</span>
            <span className="text-sm font-medium">{profile.age}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t('prof.height')}</span>
            <span className="text-sm font-medium">{profile.height} {t('prof.cm')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t('prof.currentWeight')}</span>
            <span className="text-sm font-medium">{profile.weight} {t('dash.kg')}</span>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-xl p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3">{t('prof.updateWeight')}</h3>
        <div className="flex gap-2">
          <input
            type="number"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            placeholder={t('prof.newWeight')}
            step="0.1"
            className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button onClick={handleSaveWeight} className="gradient-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1">
            <Plus className="w-4 h-4" /> {t('prof.save')}
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border rounded-xl p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3">{t('prof.goals')}</h3>
        <div className="flex flex-wrap gap-2">
          {profile.goals.map((goal, i) => (
            <span key={i} className="bg-primary/15 text-primary text-xs font-medium px-3 py-1.5 rounded-full">
              {goalKeys[goal] || goal}
            </span>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">{t('prof.weightHistory')}</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {[...profile.weightHistory].reverse().map((entry, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{new Date(entry.date).toLocaleDateString(locale)}</span>
              <span className="font-medium">{entry.weight} {t('dash.kg')}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
