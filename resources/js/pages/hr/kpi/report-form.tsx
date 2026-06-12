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

export default function HrKpiReportForm(props: Props) {
  return (
    <DynamicReportForm
      area="hr"
      areaLabel="Manager HR"
      {...props}
    />
  );
}
