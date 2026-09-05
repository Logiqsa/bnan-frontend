import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { coursesApi, type CourseInput } from "@/api/coursesApi";
import { courseError } from "@/lib/courseUi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import CourseForm from "./CourseForm";

export default function CourseEditorAdmin(){const {courseId}=useParams();const edit=!!courseId;const nav=useNavigate();const cache=useQueryClient();const [busy,setBusy]=useState(false);const q=useQuery({queryKey:["admin-course",courseId],queryFn:()=>coursesApi.getAdmin(courseId!),enabled:edit});
 const save=async(body:CourseInput,imageFile?:File)=>{setBusy(true);try{const finalBody=imageFile?{...body,image:(await coursesApi.uploadImage(imageFile)).path}:body;const saved=edit?await coursesApi.update(courseId!,finalBody):await coursesApi.create(finalBody);await cache.invalidateQueries({queryKey:["admin-courses"]});toast.success(edit?"تم حفظ الدورة":"تم إنشاء الدورة");nav(`/admin/courses/${saved.id}`);}catch(e){toast.error(courseError(e));}finally{setBusy(false);}};
 return <DashboardLayout><div className="mx-auto max-w-6xl space-y-6"><div><h1 className="text-3xl font-bold">{edit?"تعديل الدورة":"إنشاء دورة"}</h1><p className="mt-1 text-muted-foreground">أدخل بيانات الدورة وراجع شكلها قبل الحفظ.</p></div>{q.isLoading?<Card><CardContent className="py-8"><p>جاري التحميل...</p></CardContent></Card>:q.error?<Card><CardContent className="py-8"><p className="text-destructive">{courseError(q.error)}</p></CardContent></Card>:<CourseForm course={q.data} submitting={busy} onSubmit={save}/>}</div></DashboardLayout>}
