import { useEffect, useMemo, useState } from "react";
import type { RegistrationMode } from "@/api/types";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";

export interface StageGradeOption { id: string; name: string }

const normalize = (value: string) => value.replace(/[أإآ]/g, "ا").replace(/ى/g, "ي");

const groupGradesByStage = (grades: StageGradeOption[], mode?: RegistrationMode) => {
  const definitions = mode === "egyptian"
    ? [
        { key: "primary", ar: "المرحلة الابتدائية", en: "Primary", keyword: "ابتدائي" },
        { key: "preparatory", ar: "المرحلة الإعدادية", en: "Preparatory", keyword: "اعدادي" },
        { key: "secondary", ar: "المرحلة الثانوية", en: "Secondary", keyword: "ثانوي" },
      ]
    : [
        { key: "primary", ar: "المرحلة الابتدائية", en: "Primary", keyword: "ابتدائي" },
        { key: "middle", ar: "المرحلة المتوسطة", en: "Middle", keyword: "متوسط" },
        { key: "secondary", ar: "المرحلة الثانوية", en: "Secondary", keyword: "ثانوي" },
      ];
  const stages = definitions.map((stage) => ({ ...stage, grades: grades.filter((grade) => normalize(grade.name).includes(stage.keyword)) })).filter((stage) => stage.grades.length);
  const grouped = new Set(stages.flatMap((stage) => stage.grades.map((grade) => grade.id)));
  const other = grades.filter((grade) => !grouped.has(grade.id));
  return [...stages, ...(other.length ? [{ key: "other", ar: "مراحل أخرى", en: "Other stages", keyword: "", grades: other }] : [])];
};

interface GradeStageFilterProps {
  grades: StageGradeOption[];
  gradeId: string;
  onGradeChange: (gradeId: string) => void;
  mode?: RegistrationMode;
  disabled?: boolean;
  allowAll?: boolean;
}

export default function GradeStageFilter({ grades, gradeId, onGradeChange, mode, disabled, allowAll = false }: GradeStageFilterProps) {
  const { pick } = useLanguage();
  const emptyValue = allowAll ? "all" : "";
  const stages = useMemo(() => groupGradesByStage(grades, mode), [grades, mode]);
  const stageForGrade = stages.find((stage) => stage.grades.some((grade) => grade.id === gradeId));
  const [stageKey, setStageKey] = useState(allowAll ? "all" : "");
  const selectedStage = stages.find((stage) => stage.key === stageKey);

  useEffect(() => {
    if (stageForGrade) setStageKey(stageForGrade.key);
    else if (!stages.some((stage) => stage.key === stageKey)) setStageKey(allowAll ? "all" : "");
  }, [allowAll, stageForGrade, stageKey, stages]);

  return <>
    <div className="space-y-2">
      <Label>{pick("المرحلة", "Stage")}</Label>
      <Select value={stageKey} onValueChange={(value) => { setStageKey(value); onGradeChange(emptyValue); }} disabled={disabled || !grades.length}>
        <SelectTrigger><SelectValue placeholder={pick("اختر المرحلة", "Choose stage")} /></SelectTrigger>
        <SelectContent>{allowAll && <SelectItem value="all">{pick("كل المراحل", "All stages")}</SelectItem>}{stages.map((stage) => <SelectItem key={stage.key} value={stage.key}>{pick(stage.ar, stage.en)}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label>{pick("الصف", "Grade")}</Label>
      <Select value={gradeId || emptyValue} onValueChange={onGradeChange} disabled={disabled || !selectedStage}>
        <SelectTrigger><SelectValue placeholder={pick("اختر الصف", "Choose grade")} /></SelectTrigger>
        <SelectContent>{allowAll && <SelectItem value="all">{pick("كل الصفوف", "All grades")}</SelectItem>}{selectedStage?.grades.map((grade) => <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  </>;
}
