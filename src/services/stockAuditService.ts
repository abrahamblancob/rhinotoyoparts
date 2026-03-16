import { query, supabase } from './base.ts';
import type {
  StockAudit,
  StockAuditItem,
  StockAuditItemStatus,
  StockAuditType,
  InventoryStock,
} from '@/types/warehouse.ts';

// ── Queries ──

export async function getAudits(warehouseId: string) {
  return query<StockAudit[]>((sb) =>
    sb
      .from('stock_audits')
      .select('*, auditor:profiles!stock_audits_audited_by_profiles_fkey(full_name, email), warehouse:warehouses!stock_audits_warehouse_id_fkey(name, code)')
      .eq('warehouse_id', warehouseId)
      .order('created_at', { ascending: false }),
  );
}

export async function getAuditById(id: string) {
  return query<StockAudit & { items: StockAuditItem[] }>((sb) =>
    sb
      .from('stock_audits')
      .select(
        '*, auditor:profiles!stock_audits_audited_by_profiles_fkey(full_name, email), warehouse:warehouses!stock_audits_warehouse_id_fkey(name, code), items:stock_audit_items(*, location:warehouse_locations!stock_audit_items_location_id_fkey(code, level, position), rack:warehouse_racks!stock_audit_items_rack_id_fkey(code, name))',
      )
      .eq('id', id)
      .single(),
  );
}

export async function getExpectedStock(locationIds: string[]) {
  if (locationIds.length === 0) return { data: [], error: null };
  return query<InventoryStock[]>((sb) =>
    sb
      .from('inventory_stock')
      .select('*, product:products!product_id(name, sku, brand), location:warehouse_locations!location_id(code)')
      .in('location_id', locationIds),
  );
}

// ── Mutations ──

export async function createAudit(data: {
  org_id: string;
  warehouse_id: string;
  audited_by: string;
  audit_type: StockAuditType;
  location_count: number;
}) {
  return query<StockAudit>((sb) =>
    sb.from('stock_audits').insert(data).select().single(),
  );
}

export async function createAuditItems(
  auditId: string,
  items: {
    location_id: string;
    rack_id: string;
    product_id: string | null;
    product_name: string | null;
    product_sku: string | null;
    expected_quantity: number;
  }[],
) {
  const rows = items.map((item) => ({
    audit_id: auditId,
    ...item,
  }));
  return query<StockAuditItem[]>((sb) =>
    sb.from('stock_audit_items').insert(rows).select(),
  );
}

export async function updateAuditItem(
  itemId: string,
  actualQuantity: number,
) {
  // Compute status based on quantities
  const { data: item } = await supabase
    .from('stock_audit_items')
    .select('expected_quantity')
    .eq('id', itemId)
    .single();

  const expected = item?.expected_quantity ?? 0;
  let status: StockAuditItemStatus;
  if (actualQuantity === 0 && expected === 0) {
    status = 'empty';
  } else if (actualQuantity === expected) {
    status = 'match';
  } else {
    status = 'discrepancy';
  }

  return query<StockAuditItem>((sb) =>
    sb
      .from('stock_audit_items')
      .update({
        actual_quantity: actualQuantity,
        status,
        audited_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single(),
  );
}

export async function completeAudit(
  auditId: string,
  matchCount: number,
  discrepancyCount: number,
  emailSentTo?: string,
) {
  return query<StockAudit>((sb) =>
    sb
      .from('stock_audits')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        match_count: matchCount,
        discrepancy_count: discrepancyCount,
        ...(emailSentTo ? { email_sent_to: emailSentTo } : {}),
      })
      .eq('id', auditId)
      .select()
      .single(),
  );
}

export async function sendAuditEmail(auditId: string, email: string) {
  const { data, error } = await supabase.functions.invoke('send-audit-email', {
    body: { audit_id: auditId, email },
  });
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

// ── Org Summaries (for OrgSelectorGrid) ──

export interface OrgAuditSummary {
  id: string;
  name: string;
  type: string;
  totalAudits: number;
  warehouseCount: number;
  lastAuditDate: string | null;
}

export async function getOrgAuditSummaries(): Promise<OrgAuditSummary[]> {
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, type')
    .in('type', ['aggregator', 'associate'])
    .eq('status', 'active')
    .order('type')
    .order('name');

  if (!orgs) return [];

  return Promise.all(
    orgs.map(async (org) => {
      const [auditsRes, whRes] = await Promise.all([
        supabase
          .from('stock_audits')
          .select('id, created_at', { count: 'exact' })
          .eq('org_id', org.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('warehouses')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', org.id)
          .eq('is_active', true),
      ]);
      return {
        id: org.id,
        name: org.name,
        type: org.type,
        totalAudits: auditsRes.count ?? 0,
        warehouseCount: whRes.count ?? 0,
        lastAuditDate: auditsRes.data?.[0]?.created_at ?? null,
      };
    }),
  );
}
