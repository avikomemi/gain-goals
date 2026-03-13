import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { routines as defaultRoutines } from '../data/routines';
import { Exercise } from '../data/types';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Pencil, ExternalLink, Check, X, Link2 } from 'lucide-react';
import { toast } from 'sonner';

const RoutineEditor = () => {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const { getCustomizedRoutine, updateRoutineCustomization, routineCustomizations } = useApp();
  const { t, lang } = useI18n();
  const isHe = lang === 'he';

  const routine = getCustomizedRoutine(routineId || '');
  const baseRoutine = defaultRoutines.find(r => r.id === routineId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  if (!routine || !baseRoutine) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{isHe ? 'אימון לא נמצא' : 'Routine not found'}</p>
      </div>
    );
  }

  const exercises = routine.exercises;
  const customization = routineCustomizations[routineId!] || {};

  const moveExercise = (index: number, direction: -1 | 1) => {
    const currentOrder = exercises.map(e => e.id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;
    [currentOrder[index], currentOrder[targetIndex]] = [currentOrder[targetIndex], currentOrder[index]];
    updateRoutineCustomization(routineId!, { exerciseOrder: currentOrder });
  };

  const startEditName = (ex: Exercise) => {
    setEditingId(ex.id);
    setEditName(isHe ? (ex.nameHe || ex.name) : ex.name);
  };

  const saveEditName = () => {
    if (!editingId || !editName.trim()) return;
    const overrides = { ...customization.exerciseOverrides };
    overrides[editingId] = {
      ...overrides[editingId],
      [isHe ? 'nameHe' : 'name']: editName.trim(),
    };
    updateRoutineCustomization(routineId!, { exerciseOverrides: overrides });
    setEditingId(null);
    toast(isHe ? 'השם עודכן' : 'Name updated');
  };

  const startEditLink = (ex: Exercise) => {
    setEditingLinkId(ex.id);
    setEditLink(ex.link || '');
  };

  const saveEditLink = () => {
    if (!editingLinkId) return;
    const overrides = { ...customization.exerciseOverrides };
    overrides[editingLinkId] = {
      ...overrides[editingLinkId],
      link: editLink.trim(),
    };
    updateRoutineCustomization(routineId!, { exerciseOverrides: overrides });
    setEditingLinkId(null);
    toast(isHe ? 'הקישור עודכן' : 'Link updated');
  };

  const BackIcon = isHe ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen pb-20 px-4 pt-6" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <BackIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">{isHe ? 'עריכת תרגילים' : 'Edit Exercises'}</h1>
          <p className="text-xs text-muted-foreground">{isHe ? routine.nameHe : routine.name}</p>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {exercises.map((ex, i) => {
            const isEditingName = editingId === ex.id;
            const isEditingLink = editingLinkId === ex.id;
            const displayName = isHe ? (ex.nameHe || ex.name) : ex.name;

            return (
              <motion.div
                key={ex.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ layout: { type: 'spring', stiffness: 300, damping: 30 } }}
                className="bg-card border border-border rounded-xl p-3"
              >
                <div className="flex items-center gap-2">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveExercise(i, -1)}
                      disabled={i === 0}
                      className="p-1 rounded bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveExercise(i, 1)}
                      disabled={i === exercises.length - 1}
                      className="p-1 rounded bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    {isEditingName ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEditName()}
                          autoFocus
                          className="flex-1 bg-secondary rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button onClick={saveEditName} className="p-1 rounded bg-primary text-primary-foreground">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 rounded bg-secondary text-muted-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{displayName}</span>
                        <button onClick={() => startEditName(ex)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Link row */}
                    {isEditingLink ? (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <input
                          type="url"
                          value={editLink}
                          onChange={(e) => setEditLink(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEditLink()}
                          placeholder="https://youtube.com/..."
                          autoFocus
                          dir="ltr"
                          className="flex-1 bg-secondary rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button onClick={saveEditLink} className="p-1 rounded bg-primary text-primary-foreground">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingLinkId(null)} className="p-1 rounded bg-secondary text-muted-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        {ex.link ? (
                          <a href={ex.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 truncate">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{isHe ? 'צפה בסרטון' : 'Watch video'}</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">{isHe ? 'אין סרטון' : 'No video'}</span>
                        )}
                        <button onClick={() => startEditLink(ex)} className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          <Link2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RoutineEditor;
