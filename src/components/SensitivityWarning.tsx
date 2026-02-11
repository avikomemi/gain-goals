import { AlertTriangle } from 'lucide-react';

interface Props {
  compact?: boolean;
}

const SensitivityWarning = ({ compact }: Props) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-warning text-xs bg-warning/10 rounded-lg px-3 py-2">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>זהירות: גב וברכיים — התאם עומסים ותנועות</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-warning/20 p-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
        </div>
        <div>
          <h3 className="font-semibold text-warning mb-1">אזורים רגישים</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-warning">גב</strong> ו<strong className="text-warning">ברכיים</strong> — 
            שים לב לביצוע תקין, הקטן עומסים בעת כאב, ורשום כל שינוי או אי-נוחות.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SensitivityWarning;
