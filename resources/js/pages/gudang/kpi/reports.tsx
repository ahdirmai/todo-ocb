import DynamicReportsList from '@/components/kpi/dynamic-reports-list';
import type { ReportsPageProps } from '@/components/kpi/dynamic-reports-list';

export default function GudangKpiReports(props: ReportsPageProps) {
  return <DynamicReportsList area="gudang" {...props} />;
}
