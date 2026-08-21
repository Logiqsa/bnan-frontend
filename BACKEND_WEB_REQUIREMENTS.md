# Bnan Web Portal — Backend blockers

The frontend intentionally does not simulate these guarantees. `WEB_API_INTEGRATE.md` remains the source of truth.

**Status: all items below are resolved on the backend (492/492 tests passing) and require no frontend changes** — the web portal's code already expected the correct shapes (`activeSession.status`, `recordingUrl`, `summaryUrl`, `live`-only joinability) going in, so item 8 in particular ("ended" badge + recording/summary dialog in `src/portal/PortalSchedule.tsx`) should now work end-to-end without a redeploy of this repo.

1. **Scheduled start contract** — done. `sessionLifecycleService.startSession` validates teacher/classroom/subject, resolves the exact occurrence, enforces a Cairo `[-15min, +30min]` window, and is idempotent via a unique `occurrenceKey` index.
2. **Teacher Zoom host URL** — was already correct; confirmed. `meetingLink` is always `join_url`; `teacherStartUrl` is fetched live and returned only to the requesting teacher, never persisted.
3. **Trustworthy student live state** — fixed. `JOINABLE_STATUSES` is now `["live"]` only (was including `starting`).
4. **Teacher approval** — fixed. `protect` now re-checks `Teacher.status` on every request, not just at login.
5. **Gulf live aggregation** — fixed. Gulf schedule responses now include `activeSession` (live/ended, with `recordingUrl`/`summaryUrl` when ended) per occurrence.
6. **Socket hardening** — fixed. Socket auth now checks `User.status`/password-change like HTTP `protect` does (this also surfaced and fixed a pre-existing dead check in `protect` itself). `meetingLink` removed from `CLASS_STARTED` notification payloads — no frontend impact, the web portal doesn't consume the socket `notification` event today.
7. **Registration preparation** — was already covered. `/api/v1/curriculums`, `/api/v1/grades(/curriculum/:id)`, `/api/v1/subjects` are public GET and already used by the teacher signup form.
8. **Ended-session reporting** — fixed. Schedule endpoints now surface `{ status: "ended", recordingUrl, summaryUrl }` for any past occurrence in the requested week (Egyptian and Gulf), matched by `classroomSubject` + date instead of "today only".
