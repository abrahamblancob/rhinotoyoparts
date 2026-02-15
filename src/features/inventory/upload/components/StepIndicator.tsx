import type { WizardStep } from '../types.ts';

const STEPS: { key: WizardStep; label: string; icon: string }[] = [
  { key: 'file', label: 'Archivo', icon: '1' },
  { key: 'processing', label: 'Procesamiento', icon: '2' },
  { key: 'summary', label: 'Resumen', icon: '3' },
  { key: 'uploading', label: 'Carga', icon: '4' },
  { key: 'results', label: 'Resultados', icon: '5' },
];

interface Props {
  currentStep: WizardStep;
}

export function StepIndicator({ currentStep }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="rh-wizard-steps">
      {STEPS.map((step, i) => {
        const state =
          i < currentIndex ? 'completed' : i === currentIndex ? 'active' : 'pending';
        return (
          <div key={step.key} className={`rh-wizard-step ${state}`}>
            <div className="rh-wizard-step-circle">
              {state === 'completed' ? '\u2713' : step.icon}
            </div>
            <span className="rh-wizard-step-label">{step.label}</span>
            {i < STEPS.length - 1 && (
              <div
                className="rh-wizard-step-line"
                style={{
                  backgroundColor: i < currentIndex ? '#10B981' : '#E8E6E4',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
