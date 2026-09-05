import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { coursesApi, type CourseGroupStatus } from "@/api/coursesApi";
import { courseError } from "@/lib/courseUi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statuses: CourseGroupStatus[] = ["draft", "open", "full", "in_progress", "completed", "closed", "cancelled"];
const idOf = (value: unknown) => typeof value === "object" && value ? String((value as { id?: string; _id?: string }).id || (value as { _id?: string })._id || "") : typeof value === "string" ? value : "";

export default function CourseGroupsAdmin() {
  const { courseId = "" } = useParams();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const courseQuery = useQuery({ queryKey: ["admin-course", courseId], queryFn: () => coursesApi.getAdmin(courseId) });
  const groupsQuery = useQuery({ queryKey: ["admin-course-groups", courseId], queryFn: () => coursesApi.listGroups(courseId) });
  const refresh = () => client.invalidateQueries({ queryKey: ["admin-course-groups", courseId] });
  const create = useMutation({ mutationFn: () => coursesApi.createGroup(courseId, { name: name.trim(), ...(capacity ? { capacity: Number(capacity) } : {}) }), onSuccess: () => { setName(""); setCapacity(""); void refresh(); toast.success("تم إنشاء المجموعة"); }, onError: (error) => toast.error(courseError(error)) });
  const update = useMutation({ mutationFn: ({ id, status }: { id: string; status: CourseGroupStatus }) => coursesApi.updateGroupStatus(id, status), onSuccess: () => void refresh(), onError: (error) => toast.error(courseError(error)) });
  const submit = (event: FormEvent) => { event.preventDefault(); if (name.trim()) create.mutate(); };
  const course = courseQuery.data;

  return <DashboardLayout><div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">مجموعات {course?.name || "الدورة"}</h1><p className="text-sm text-muted-foreground">المجموعات تربط التسجيلات بالبنية الحالية للفصول.</p></div><Button variant="outline" asChild><Link to={`/admin/courses/${courseId}`}>تفاصيل الدورة</Link></Button></div>
    {course?.groupManagementMode === "manual" && <Card><CardHeader><CardTitle>إنشاء مجموعة يدوية</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="flex flex-wrap gap-3"><Input className="min-w-56 flex-1" value={name} onChange={(event) => setName(event.target.value)} placeholder="اسم المجموعة" required/><Input className="w-40" type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} placeholder="السعة"/><Button disabled={create.isPending}>إنشاء</Button></form></CardContent></Card>}
    {course && course.groupManagementMode !== "manual" && <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">تتم إدارة مجموعات هذه الدورة تلقائيًا؛ العرض فقط متاح هنا.</p>}
    {groupsQuery.isLoading ? <p>جاري تحميل المجموعات...</p> : groupsQuery.error ? <p className="text-destructive">{courseError(groupsQuery.error)}</p> : !groupsQuery.data?.length ? <Card><CardContent className="p-10 text-center text-muted-foreground">لا توجد مجموعات بعد.</CardContent></Card> : <div className="grid gap-4 md:grid-cols-2">{groupsQuery.data.map((group) => { const classroom = typeof group.classroom === "object" ? group.classroom : null; return <Card key={group.id}><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>{group.name}</CardTitle><Badge>{group.status}</Badge></div></CardHeader><CardContent className="space-y-4"><p>الطلاب: {group.studentsCount ?? 0}{group.capacity ? ` / ${group.capacity}` : ""}</p>{group.progress && <div><div className="mb-2 flex justify-between text-sm"><span>{group.progress.completedHours} / {group.progress.totalHours} ساعة</span><span>{group.progress.percentage}%</span></div><Progress value={group.progress.percentage}/></div>}{classroom && <Button variant="outline" asChild><Link to={`/admin/classrooms/${idOf(classroom)}/schedule`}>فتح الفصل: {classroom.name}</Link></Button>}{course?.groupManagementMode === "manual" && <Select value={group.status} onValueChange={(status) => update.mutate({ id: group.id, status: status as CourseGroupStatus })} disabled={update.isPending}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select>}</CardContent></Card>; })}</div>}
  </div></DashboardLayout>;
}
