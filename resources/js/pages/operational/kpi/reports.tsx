import DynamicReportsList from '@/components/kpi/dynamic-reports-list';
import type { ReportsPageProps } from '@/components/kpi/dynamic-reports-list';

export default function OperationalKpiReports(props: ReportsPageProps) {
  return <DynamicReportsList area="operational" {...props} />;
}
