import DynamicReportsList from '@/components/kpi/dynamic-reports-list';
import type { ReportsPageProps } from '@/components/kpi/dynamic-reports-list';

export default function HrKpiReports(props: ReportsPageProps) {
  return <DynamicReportsList area="hr" {...props} />;
}
