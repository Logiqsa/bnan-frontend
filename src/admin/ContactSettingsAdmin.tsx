import { useEffect, useState } from "react";
import { GripVertical, Loader2, Mail, Phone, Plus, Save, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { contactSettingsApi, type ContactEmail, type ContactPhone, type SocialLink } from "@/api/contactSettingsApi";
import SocialPlatformIcon, { socialPlatforms } from "@/components/SocialPlatformIcon";
import { useContactSettings } from "@/contexts/ContactSettingsContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const newPhone = (): ContactPhone => ({ label: "", value: "", isWhatsapp: false, isPrimary: false });
const newEmail = (): ContactEmail => ({ label: "", value: "", isPrimary: false });
const newSocial = (order: number): SocialLink => ({ platform: "instagram", url: "", isActive: true, order });

export default function ContactSettingsAdmin() {
  const { refresh } = useContactSettings();
  const [phones, setPhones] = useState<ContactPhone[]>([]);
  const [emails, setEmails] = useState<ContactEmail[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    contactSettingsApi.admin()
      .then((result) => { setPhones(result.phones || []); setEmails(result.emails || []); setSocialLinks(result.socialLinks || []); })
      .catch(() => toast.error("تعذر تحميل وسائل التواصل."))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const cleanPhones = phones.map((item) => ({ ...item, label: item.label.trim(), value: item.value.trim() })).filter((item) => item.value);
    const cleanEmails = emails.map((item) => ({ ...item, label: item.label.trim(), value: item.value.trim().toLowerCase() })).filter((item) => item.value);
    const cleanSocialLinks = socialLinks.map((item, order) => ({ ...item, url: item.url.trim(), order })).filter((item) => item.url);
    if (!cleanPhones.length && !cleanEmails.length) return toast.error("أضف رقم هاتف أو بريدًا إلكترونيًا واحدًا على الأقل.");
    if (cleanEmails.some((item) => !/^\S+@\S+\.\S+$/.test(item.value))) return toast.error("راجع صيغة عناوين البريد الإلكتروني.");
    setSaving(true);
    try {
      const result = await contactSettingsApi.update({ phones: cleanPhones, emails: cleanEmails, socialLinks: cleanSocialLinks });
      setPhones(result.phones); setEmails(result.emails); setSocialLinks(result.socialLinks || []);
      await refresh();
      toast.success("تم حفظ وسائل التواصل.");
    } catch {
      toast.error("تعذر حفظ وسائل التواصل.");
    } finally { setSaving(false); }
  };

  const setPrimaryPhone = (index: number) => setPhones((items) => items.map((item, i) => ({ ...item, isPrimary: i === index })));
  const setPrimaryEmail = (index: number) => setEmails((items) => items.map((item, i) => ({ ...item, isPrimary: i === index })));

  return <DashboardLayout><main className="mx-auto max-w-5xl space-y-6" dir="rtl">
    <div><h1 className="text-3xl font-bold">وسائل التواصل</h1><p className="mt-1 text-muted-foreground">الأرقام والإيميلات الظاهرة في الفوتر وصفحة التواصل.</p></div>
    {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : <>
      <Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" />أرقام الهاتف</CardTitle><Button variant="outline" onClick={() => setPhones((items) => [...items, newPhone()])}><Plus className="ml-2 h-4 w-4" />إضافة رقم</Button></CardHeader><CardContent className="space-y-4">
        {phones.map((phone, index) => <div key={phone.id || index} className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1fr_1fr_auto]">
          <div><Label>اسم الرقم</Label><Input className="mt-2" placeholder="مثال: خط السعودية" value={phone.label} onChange={(e) => setPhones((items) => items.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} /></div>
          <div><Label>رقم الهاتف</Label><Input className="mt-2 text-left" dir="ltr" type="tel" placeholder="+966..." value={phone.value} onChange={(e) => setPhones((items) => items.map((item, i) => i === index ? { ...item, value: e.target.value } : item))} /></div>
          <Button aria-label="حذف الرقم" variant="ghost" size="icon" className="self-end text-destructive" onClick={() => setPhones((items) => items.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
          <div className="flex flex-wrap gap-5 md:col-span-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={phone.isWhatsapp} onChange={(e) => setPhones((items) => items.map((item, i) => i === index ? { ...item, isWhatsapp: e.target.checked } : item))} />متاح على واتساب</label><label className="flex items-center gap-2 text-sm"><input type="radio" name="primary-phone" checked={phone.isPrimary} onChange={() => setPrimaryPhone(index)} />الرقم الأساسي</label></div>
        </div>)}
        {!phones.length && <p className="text-center text-sm text-muted-foreground">لا توجد أرقام مضافة.</p>}
      </CardContent></Card>
      <Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />البريد الإلكتروني</CardTitle><Button variant="outline" onClick={() => setEmails((items) => [...items, newEmail()])}><Plus className="ml-2 h-4 w-4" />إضافة بريد</Button></CardHeader><CardContent className="space-y-4">
        {emails.map((email, index) => <div key={email.id || index} className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1fr_1fr_auto]">
          <div><Label>اسم البريد</Label><Input className="mt-2" placeholder="مثال: الدعم" value={email.label} onChange={(e) => setEmails((items) => items.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} /></div>
          <div><Label>البريد الإلكتروني</Label><Input className="mt-2 text-left" dir="ltr" type="email" value={email.value} onChange={(e) => setEmails((items) => items.map((item, i) => i === index ? { ...item, value: e.target.value } : item))} /></div>
          <Button aria-label="حذف البريد" variant="ghost" size="icon" className="self-end text-destructive" onClick={() => setEmails((items) => items.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
          <label className="flex items-center gap-2 text-sm md:col-span-3"><input type="radio" name="primary-email" checked={email.isPrimary} onChange={() => setPrimaryEmail(index)} />البريد الأساسي</label>
        </div>)}
        {!emails.length && <p className="text-center text-sm text-muted-foreground">لا توجد عناوين بريد مضافة.</p>}
      </CardContent></Card>
      <Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5" />روابط السوشيال</CardTitle><Button variant="outline" onClick={() => setSocialLinks((items) => [...items, newSocial(items.length)])}><Plus className="ml-2 h-4 w-4" />إضافة منصة</Button></CardHeader><CardContent className="space-y-4">
        {socialLinks.map((social, index) => <div key={social.id || index} className="grid items-end gap-3 rounded-xl border p-4 md:grid-cols-[180px_1fr_auto]">
          <div><Label>المنصة</Label><Select value={social.platform} onValueChange={(platform) => setSocialLinks((items) => items.map((item, i) => i === index ? { ...item, platform: platform as SocialLink["platform"] } : item))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{socialPlatforms.map((platform) => <SelectItem key={platform.value} value={platform.value}><span className="flex items-center gap-2"><SocialPlatformIcon platform={platform.value} />{platform.label}</span></SelectItem>)}</SelectContent></Select></div>
          <div><Label>الرابط الكامل</Label><Input className="mt-2 text-left" dir="ltr" type="url" placeholder="https://..." value={social.url} onChange={(e) => setSocialLinks((items) => items.map((item, i) => i === index ? { ...item, url: e.target.value } : item))} /></div>
          <Button aria-label="حذف رابط السوشيال" variant="ghost" size="icon" className="text-destructive" onClick={() => setSocialLinks((items) => items.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
          <div className="flex flex-wrap items-center gap-4 md:col-span-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={social.isActive} onChange={(e) => setSocialLinks((items) => items.map((item, i) => i === index ? { ...item, isActive: e.target.checked } : item))} />إظهار في الموقع</label><span className="flex items-center gap-1 text-xs text-muted-foreground"><GripVertical className="h-4 w-4" />الترتيب حسب ترتيب العناصر في القائمة</span><div className="mr-auto flex gap-1"><Button type="button" size="sm" variant="outline" disabled={index === 0} onClick={() => setSocialLinks((items) => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })}>لأعلى</Button><Button type="button" size="sm" variant="outline" disabled={index === socialLinks.length - 1} onClick={() => setSocialLinks((items) => { const next = [...items]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; })}>لأسفل</Button></div></div>
        </div>)}
        {!socialLinks.length && <p className="text-center text-sm text-muted-foreground">لا توجد روابط سوشيال مضافة.</p>}
      </CardContent></Card>
      <div className="flex justify-end"><Button size="lg" disabled={saving} onClick={() => void save()}>{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}حفظ التغييرات</Button></div>
    </>}
  </main></DashboardLayout>;
}
