import { useNavigate } from 'react-router-dom';
import { CollapsibleSection } from '@/components/hub/shared/CollapsibleSection.tsx';
import { PickingMiniMap } from '@/features/picking/PickingMiniMap.tsx';
import { formatDateTime } from '@/utils/dateUtils.ts';
import type { PickList, PickListItem } from '@/types/warehouse.ts';

interface OrderPickingSectionProps {
  pickList: PickList;
  pickListItems: PickListItem[];
}

function ProgressBar({ picked, total, completed }: { picked: number; total: number; completed: boolean }) {
  if (total === 0) return null;
  const pct = Math.round((picked / total) * 100);

  return (
    <div style={{ width: 80, height: 6, borderRadius: 3, backgroundColor: completed ? '#BBF7D0' : '#E2E8F0', overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%', borderRadius: 3,
        backgroundColor: picked === total ? '#10B981' : '#F97316',
      }} />
    </div>
  );
}

export function OrderPickingSection({ pickList, pickListItems }: OrderPickingSectionProps) {
  const navigate = useNavigate();
  const isCompleted = pickList.status === 'completed';

  const title = isCompleted
    ? 'Picking Completado'
    : `Pick List — ${pickList.status === 'in_progress' ? 'En progreso' : pickList.status === 'assigned' ? 'Asignado' : 'Pendiente'}`;

  const subtitleParts = [`${pickList.picked_items} / ${pickList.total_items} items recogidos`];
  if (pickList.assignee?.full_name) subtitleParts.push(pickList.assignee.full_name);
  if (isCompleted && pickList.completed_at) subtitleParts.push(formatDateTime(pickList.completed_at));

  return (
    <CollapsibleSection
      title={title}
      subtitle={subtitleParts.join(' · ')}
      icon={isCompleted ? '✅' : '📦'}
      variant={isCompleted ? 'completed' : 'pending'}
      trailing={<ProgressBar picked={pickList.picked_items} total={pickList.total_items} completed={isCompleted} />}
    >
      {!isCompleted && (
        <div style={{ padding: '14px 20px', background: '#fff' }}>
          <button
            className="rh-btn rh-btn-primary"
            onClick={() => navigate(`/hub/picking/${pickList.id}`)}
            style={{ fontSize: 12, padding: '6px 14px', backgroundColor: '#F97316' }}
          >
            Ver Pick List →
          </button>
        </div>
      )}
      {isCompleted && pickList.warehouse_id && (
        <PickingMiniMap
          warehouseId={pickList.warehouse_id}
          locationIds={pickListItems.map((i) => i.source_location_id).filter(Boolean)}
          pickedLocationIds={pickListItems.filter((i) => i.status === 'picked').map((i) => i.source_location_id).filter(Boolean)}
        />
      )}
    </CollapsibleSection>
  );
}
