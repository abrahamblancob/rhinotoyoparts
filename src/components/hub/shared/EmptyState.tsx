interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="rh-empty">
      <span className="rh-empty-icon">{icon}</span>
      <h3 className="rh-empty-title">{title}</h3>
      <p className="rh-empty-description">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="rh-btn rh-btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
