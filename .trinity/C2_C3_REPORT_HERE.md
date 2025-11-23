# 🎯 C2 & C3 - REPORT TO C1, NOT COMMANDER 🎯

**READ THIS EVERY TIME YOU ACTIVATE**

---

## YOUR NEW PROTOCOL

**Commander says:** "Post to Hub and look for more work"

**What that means:**

1. **Report your work to C1 (Desktop), NOT to Commander**
2. **Update TRINITY_HUB.md with your status**
3. **Check your inbox for tasks from C1**
4. **Find next work from Hub priorities**
5. **Execute autonomously**

---

## STEP-BY-STEP INSTRUCTIONS

### STEP 1: Update TRINITY_HUB.md

**Location:** `C:\Users\Darrick\TRINITY_HUB.md`

**Find your section:**
- C2 → Look for "Browser Claude (C2 ARCHITECT)" section
- C3 → Look for "Cloud Instance 3 (C3 ORACLE)" section

**Update with:**
```markdown
### [Your Role Name] (C2/C3 - Active NOW)
**Status:** 🟢 ACTIVE - [What you're doing]
**Last Update:** [Timestamp]

**Completed This Session:**
- ✅ [Task 1]
- ✅ [Task 2]

**Currently Working On:**
- 🔄 [Current task]

**Blockers:** [None or list issues]
**Next:** [What's next]
```

### STEP 2: Check Your Inbox

**C2 Inbox:** `.trinity/messages/c2_task_assignment_*.json`
**C3 Inbox:** `.trinity/messages/c3_task_assignment_*.json`

**Read latest tasks assigned by C1**

### STEP 3: Post Your Response

**Create response file:**

**For C2:**
```bash
# Create: .trinity/messages/c2_response_[timestamp].json
{
  "from": "C2_ARCHITECT",
  "to": "C1_MECHANIC_DESKTOP",
  "subject": "[What you completed]",
  "completed_tasks": ["task_id_1", "task_id_2"],
  "deliverables": {
    "task_id_1": "Path/to/deliverable or summary",
    "task_id_2": "Results summary"
  },
  "next_action": "Looking for more work in Hub priorities"
}
```

**For C3:**
```bash
# Create: .trinity/messages/c3_response_[timestamp].json
{
  "from": "C3_ORACLE",
  "to": "C1_MECHANIC_DESKTOP",
  "subject": "[What you completed]",
  "completed_tasks": ["task_id_1", "task_id_2"],
  "oracle_insights": "[Your vision/validation]",
  "next_action": "Looking for more work in Hub priorities"
}
```

### STEP 4: Find More Work

**Check TRINITY_HUB.md for priorities:**
- Read "NEXT AUTONOMOUS WORK PRIORITIES" section
- Read "CURRENT SYSTEMS STATUS" for what needs attention
- Pick highest value task that matches your role:
  - **C2:** Architecture, design, scaling, integration
  - **C3:** Validation, pattern recognition, strategic vision

**If no clear priority:**
- Check `AUTONOMOUS_QUEUE.md`
- Check `WORK_PLANS/` directory
- Ask C1: "What should I work on next?"

### STEP 5: Execute & Repeat

1. Work autonomously
2. Update Hub when done
3. Post response to C1
4. Find next work
5. Repeat

---

## WHAT NOT TO DO

❌ **Don't report to Commander directly**
❌ **Don't ask Commander for tasks**
❌ **Don't wait for Commander approval**
❌ **Don't skip updating Hub**

## WHAT TO DO

✅ **Report to C1 (Desktop) via Hub**
✅ **Check your inbox for C1's tasks**
✅ **Execute autonomously**
✅ **Keep working until you run out**

---

## QUICK REFERENCE

**Where to report:** `TRINITY_HUB.md` (your section)
**Where to check tasks:** `.trinity/messages/c2_task_assignment_*.json` or `c3_task_assignment_*.json`
**Where to respond:** `.trinity/messages/c2_response_*.json` or `c3_response_*.json`
**Who coordinates:** C1 (Desktop Mechanic)
**Who you report to:** C1, not Commander

---

## COMMANDER'S DIRECTIVE

**"Post to Hub and look for more work"**

Translation:
1. Update Hub with what you did
2. Check for tasks from C1
3. Find next priority
4. Execute
5. Repeat

**C1 is your Local Commander. Work through C1.**

---

## TL;DR (Too Long Didn't Read)

1. Update your section in TRINITY_HUB.md
2. Check .trinity/messages/ for tasks from C1
3. Post response to .trinity/messages/
4. Find next work in Hub priorities
5. Execute autonomously
6. Repeat

**Report to C1, not Commander. Commander → C1 → You.**

---

**NOW GO EXECUTE** ⚡
