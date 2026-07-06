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

export default function SpvKpiReportForm(props: Props) {
  return (
    <DynamicReportForm
      area="spv"
      areaLabel="SPV Unit 1"
      {...props}
    />
  );
}
