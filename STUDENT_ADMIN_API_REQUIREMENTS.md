# Student admin API requirements

The current frontend integration contract does not expose an admin endpoint for listing students. To add a student-management tab equivalent to teacher applications, provide:

## List students

`GET /api/v1/students?page=1&limit=20&status=active`

The response should include `data` as an array plus `page`, `limit`, `total`, and `hasNextPage`. Each row should include the student id, full name, email, status, createdAt, parent summary, curriculum, grade, subjects, package, payment status, and registration mode.

## Student details

`GET /api/v1/students/:studentId`

Return the full student profile, parent contact details, enrollment/package information, subjects, payment status, and created/updated dates.

If student accounts need approval, also provide:

`PATCH /api/v1/students/:studentId/status`

```json
{ "status": "active" }
```

All endpoints must require an admin bearer token. Please provide the exact response examples and allowed status values before wiring this tab into the frontend.
