import DynamicReportForm from '@/components/kpi/dynamic-report-form';
import type { ReportTemplate, ReportField, ExistingReportData } from '@/components/kpi/dynamic-report-form';

interface Props {
  template: ReportTemplate;
  reportFields: ReportField[];
  existingReport: ExistingReportData | null;
  canSubmit: boolean;
  isEditing?: boolean;
  reportId?: string;
  selectedDate?: string;
}

export default function OperationalKpiReportForm(props: Props) {
  return (
    <DynamicReportForm
      area="operational"
      areaLabel="Manager Operasional"
      {...props}
    />
  );
}
