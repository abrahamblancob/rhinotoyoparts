import { Check } from 'lucide-react';
import { STEPS, type WizardStep } from './types.ts';

interface StepIndicatorProps {
  currentStep: WizardStep;
  currentIndex: number;
  onStepClick: (step: WizardStep) => void;
}

export function StepIndicator({ currentIndex, onStepClick }: StepIndicatorProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        marginBottom: 32,
        padding: '16px 0',
      }}
    >
      {STEPS.map((step, i) => {
        const StepIcon = step.icon;
        const state =
          i < currentIndex
            ? 'completed'
            : i === currentIndex
              ? 'active'
              : 'pending';
        return (
          <div
            key={step.key}
            style={{ display: 'flex', alignItems: 'center', gap: 0 }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                cursor: state === 'completed' ? 'pointer' : 'default',
              }}
              onClick={
                state === 'completed'
                  ? () => onStepClick(step.key)
                  : undefined
              }
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    state === 'completed'
                      ? '#10B981'
                      : state === 'active'
                        ? '#D3010A'
                        : '#E2E8F0',
                  color: state === 'pending' ? '#94A3B8' : '#FFFFFF',
                  transition: 'all 0.2s ease',
                }}
              >
                {state === 'completed' ? (
                  <Check size={18} />
                ) : (
                  <StepIcon size={18} />
                )}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: state === 'active' ? 700 : 500,
                  color:
                    state === 'active'
                      ? '#D3010A'
                      : state === 'completed'
                        ? '#10B981'
                        : '#94A3B8',
                }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 48,
                  height: 2,
                  backgroundColor:
                    i < currentIndex ? '#10B981' : '#E2E8F0',
                  margin: '0 6px',
                  marginBottom: 24,
                  transition: 'background-color 0.2s ease',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
