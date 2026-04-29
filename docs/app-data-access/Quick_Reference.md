# app-data-access - Quick Reference Card

**TL;DR Version - Copy & Paste Ready**

---

## Cheat Sheet

### 1. Get Team Summary (FASTEST)
```javascript
const context = await fetch('http://localhost:8888/api/teams/{team_id}/context');
const data = await context.json();

// Returns: members, SOP signal, task breakdown, kanbans
console.log(data.task_summary); // { total, by_status, by_priority, overdue }
console.log(data.sop.has_sop); // true/false
```

### 2. List All Teams
```javascript
const response = await fetch('http://localhost:8888/api/teams');
const teams = await response.json();

teams.data.forEach(t => console.log(t.name, t.member_count, t.task_count));
```

### 3. Get All Tasks in Team
```javascript
const response = await fetch(
  'http://localhost:8888/api/teams/{team_id}/tasks?status=todo&sort=due_date'
);
const tasks = await response.json();

tasks.data.forEach(t => {
  console.log(t.title, t.due_date, t.assigned_to);
});
```

### 4. Get Overdue Tasks
```javascript
const response = await fetch(
  'http://localhost:8888/api/teams/{team_id}/tasks?due_before=2026-04-25&status=todo,in_progress'
);
const overdue = await response.json();

console.log(`${overdue.data.length} tasks overdue`);
```

### 5. Check SOP Compliance
```javascript
const context = await fetch('http://localhost:8888/api/teams/{team_id}/context');
const data = await context.json();

if (data.sop.has_sop) {
  const sop = data.sop.primary_document;
  console.log(`Team has SOP: ${sop.name}`);
  // Read full SOP content if needed
  const sopDoc = await fetch(`http://localhost:8888/api/documents/${sop.id}`);
} else {
  console.log('⚠️ No SOP document found');
}
```

### 6. Get Activity Log (Audit Trail)
```javascript
const response = await fetch(
  'http://localhost:8888/api/teams/{team_id}/activity-logs?action=task_created,task_assigned&since=2026-04-20'
);
const logs = await response.json();

logs.data.forEach(log => {
  console.log(`${log.user.name}: ${log.description} (${log.created_at})`);
});
```

### 7. Search Team Data
```javascript
const response = await fetch('http://localhost:8888/api/teams/{team_id}/search?query=OC1');
const results = await response.json();

console.log(results.tasks);      // Tasks matching "OC1"
console.log(results.documents);  // Documents matching "OC1"
console.log(results.members);    // Members matching "OC1"
```

---

## Common Parameters

### Pagination
```
?page=1&per_page=50
```

### Filtering
```
?status=todo,in_progress          (comma-separated values)
?priority=high,urgent
?assignee_id=1
?due_before=2026-04-30
?due_after=2026-04-20
?search=keyword
?type=sop,guide
?is_sop=true
```

### Sorting
```
?sort=due_date&order=asc
?sort=created_at&order=desc
?sort=title&order=asc
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/teams` | GET | List all teams |
| `/api/teams/{id}` | GET | Get team details |
| `/api/teams/{id}/context` | GET | **⭐ Team snapshot** |
| `/api/teams/{id}/members` | GET | Team members |
| `/api/teams/{id}/tasks` | GET | All team tasks |
| `/api/tasks/{id}` | GET | Single task detail |
| `/api/teams/{id}/documents` | GET | All documents |
| `/api/documents/{id}` | GET | Single document |
| `/api/teams/{id}/announcements` | GET | Team announcements |
| `/api/teams/{id}/activity-logs` | GET | Audit trail |
| `/api/teams/{id}/search` | GET | Search |
| `/api/teams/{id}/entity-map` | GET | All entities |

---

## Error Handling

```javascript
async function safeGet(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Error ${response.status}: ${response.statusText}`);
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error('API error:', err.message);
    return null;
  }
}

const data = await safeGet('http://localhost:8888/api/teams');
if (data) {
  // Process data
}
```

---

## Real-World Examples

### Example 1: Team Audit Report
```javascript
async function auditTeam(teamId) {
  const context = await fetch(`http://localhost:8888/api/teams/${teamId}/context`)
    .then(r => r.json());

  console.log(`\n📊 TEAM: ${context.team.name}`);
  console.log(`Members: ${context.members.length}`);
  console.log(`Tasks: ${context.task_summary.total}`);
  console.log(`  - TODO: ${context.task_summary.by_status.todo}`);
  console.log(`  - DONE: ${context.task_summary.by_status.done}`);
  console.log(`  - Overdue: ${context.task_summary.overdue}`);
  console.log(`SOP: ${context.sop.has_sop ? 'YES ✅' : 'NO ❌'}`);
}

auditTeam('019da952-d23a-72af-bb21-cfdc5b29926d'); // SPV UNIT 1
```

Output:
```
📊 TEAM: SPV UNIT 1
Members: 8
Tasks: 17
  - TODO: 17
  - DONE: 0
  - Overdue: 6
SOP: NO ❌
```

---

### Example 2: Find & Report Overdue Tasks
```javascript
async function reportOverdue(teamId) {
  const tasks = await fetch(
    `http://localhost:8888/api/teams/${teamId}/tasks?due_before=2026-04-25&status=todo,in_progress`
  ).then(r => r.json());

  console.log(`\n🚨 OVERDUE TASKS: ${tasks.data.length}`);
  
  tasks.data.forEach(task => {
    const daysLate = Math.floor((new Date() - new Date(task.due_date)) / (1000 * 86400));
    console.log(`  • ${task.title} (${daysLate} days late)`);
    console.log(`    Assigned to: ${task.assigned_to.map(u => u.name).join(', ') || 'UNASSIGNED'}`);
  });
}

reportOverdue('019da952-d23a-72af-bb21-cfdc5b29926d');
```

Output:
```
🚨 OVERDUE TASKS: 6
  • OC31, 22 APRIL 2026 (3 days late)
    Assigned to: UNASSIGNED
  • OC1, 22 April 2026 (2 days late)
    Assigned to: UNASSIGNED
  ...
```

---

### Example 3: Check SOP & Get Content
```javascript
async function readSOP(teamId) {
  const context = await fetch(`http://localhost:8888/api/teams/${teamId}/context`)
    .then(r => r.json());

  if (!context.sop.has_sop) {
    console.log('❌ No SOP found');
    return;
  }

  const sopId = context.sop.primary_document.id;
  const sop = await fetch(`http://localhost:8888/api/documents/${sopId}`)
    .then(r => r.json());

  console.log(`📄 SOP: ${sop.name}`);
  console.log(`Created by: ${sop.created_by.name}`);
  console.log(`\nContent:\n${sop.content}`);
  console.log(`\nComments: ${sop.comments.length}`);
  sop.comments.forEach(c => {
    console.log(`  - ${c.user.name}: ${c.content}`);
  });
}

readSOP('019db371-33bd-7318-86b6-83cf2223b31d'); // SDM-HR Recruitment
```

---

### Example 4: Get Team Members & Their Tasks
```javascript
async function teamMembersSummary(teamId) {
  const context = await fetch(`http://localhost:8888/api/teams/${teamId}/context`)
    .then(r => r.json());

  console.log(`\n👥 TEAM MEMBERS:\n`);
  
  for (const member of context.members) {
    const memberTasks = await fetch(
      `http://localhost:8888/api/teams/${teamId}/tasks?assignee_id=${member.id}`
    ).then(r => r.json());

    const completed = memberTasks.data.filter(t => t.status === 'done').length;
    const pending = memberTasks.data.filter(t => t.status !== 'done').length;

    console.log(`${member.name} (${member.role})`);
    console.log(`  - Assigned: ${memberTasks.data.length} tasks`);
    console.log(`  - Completed: ${completed}`);
    console.log(`  - Pending: ${pending}`);
  }
}

teamMembersSummary('019da952-d23a-72af-bb21-cfdc5b29926d');
```

---

## Performance Tips

✅ **DO:**
- Use `/context` endpoint for team overview (all-in-one)
- Filter at API level (`?status=todo` not fetch all + filter)
- Cache team structure (rarely changes)
- Use pagination (`per_page=25` not `100`)
- Batch requests (use `resolve-references` for bulk lookups)

❌ **DON'T:**
- Make 10 API calls when 1 would suffice
- Load all rows without pagination
- Query database directly (use API first)
- Trust client-side filtering
- Forget error handling

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| 404 on team | UUID format wrong, or team deleted |
| Empty tasks array | Team might have no tasks, or filter too strict |
| No SOP found | `has_sop: false` means no document flagged `is_sop=true` |
| Timeout on activity-logs | Add date range: `?since=2026-04-20` |
| Large response | Use pagination: `?page=1&per_page=25` |

---

## Useful Links

- **Full Documentation:** `SKILL.md`
- **Schema Diagram:** `references/schema-diagram.md`
- **Common Queries:** See "Common Data Access Queries" in SKILL.md
- **Error Codes:** See "Error Handling" in SKILL.md

---

**Version:** 1.0.0  
**Last Updated:** Sat 2026-04-25 12:50 GMT+8  
**Status:** ✅ Ready to Use
