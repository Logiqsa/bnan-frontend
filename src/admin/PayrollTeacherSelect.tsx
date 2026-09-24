import { useLanguage } from "@/i18n/LanguageContext";
import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";

export interface PayrollTeacherOption {
  id: string;
  name: string;
}

interface PayrollTeacherSelectProps {
  value: string;
  options: PayrollTeacherOption[];
  onChange: (teacherId: string) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export default function PayrollTeacherSelect({ value, options, onChange, loading = false, emptyMessage }: PayrollTeacherSelectProps) {
  const { pick } = useLanguage();
  return <AdminSearchableSelect
    label={pick("المعلم", "Teacher")}
    value={value}
    options={options.map((option) => ({ value: option.id, label: option.name }))}
    placeholder={pick("اختر معلماً", "Select teacher")}
    loading={loading}
    loadingLabel={pick("جاري تحميل المعلمين...", "Loading teachers...")}
    emptyLabel={emptyMessage || pick("لا يوجد معلم مطابق للبحث", "No teacher matches your search")}
    noOptionsLabel={pick("لا يوجد معلمون متاحون", "No teachers available")}
    searchPlaceholder={pick("ابحث باسم المعلم...", "Search by teacher name...")}
    onChange={(teacherId) => { if (teacherId) onChange(teacherId); }}
  />;
}
