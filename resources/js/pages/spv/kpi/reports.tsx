import DynamicReportsList from '@/components/kpi/dynamic-reports-list';
import type { ReportsPageProps } from '@/components/kpi/dynamic-reports-list';

export default function SpvKpiReports(props: ReportsPageProps) {
  return <DynamicReportsList area="spv" {...props} />;
}
