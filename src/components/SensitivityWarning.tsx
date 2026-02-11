import { AlertTriangle } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

interface Props {
  compact?: boolean;
}

const SensitivityWarning = ({ compact }: Props) => {
  const { t } = useI18n();

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-warning text-xs bg-warning/10 rounded-lg px-3 py-2">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>{t('sens.compact')}</span>
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
          <h3 className="font-semibold text-warning mb-1">{t('sens.title')}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-warning">{t('sens.back')}</strong> &amp; <strong className="text-warning">{t('sens.knees')}</strong> — {t('sens.detail')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SensitivityWarning;
