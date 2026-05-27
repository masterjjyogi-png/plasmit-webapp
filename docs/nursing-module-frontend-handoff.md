# Nursing Module Frontend Handoff

Generated for: Plasmit Hospital HMS frontend team  
Scope: Nursing module only  
Last updated: 23 May 2026

## 1. Purpose

This document explains the new Nursing module frontend implementation so another frontend developer can patch, extend, or connect it to backend APIs without touching unrelated HMS modules.

The module currently provides two main functional areas:

- Nursing Assessments
- Nursing Care Plans

The implementation uses local React state and static mock data. It is structured so the same UI can later be connected to real APIs with minimal changes.

## 2. Do Not Touch Boundary

Only these areas are part of the Nursing module:

- `src/features/nursing/**`
- `src/app/(app)/nurse/**`
- Sidebar menu entry already added in `src/data/navigation.ts`

Avoid changing unrelated modules such as auth, radiology, patient, IPD, OPD, billing, theme, or global providers unless a future task explicitly requires it.

## 3. Route Files

### `src/app/(app)/nurse/page.tsx`

Route: `/nurse`

Purpose:

- Entry page for the Nursing module.
- Renders `NursingDashboardPage`.

Uses:

- Imports from `src/features/nursing/nursing-pages.tsx`.

### `src/app/(app)/nurse/assessments/page.tsx`

Route: `/nurse/assessments`

Purpose:

- Main Nursing Assessment documentation screen.
- Loads the screen-level wrapper `AssessmentUserScreen`.

Uses:

- `src/features/nursing/assessments/assessment-user-screen.tsx`

### `src/app/(app)/nurse/assessments/configuration/page.tsx`

Route: `/nurse/assessments/configuration`

Purpose:

- Nursing assessment configuration screen.
- Lets user manage assessment master rows and view example assessment definitions.

Uses:

- `src/features/nursing/assessments/assessment-configuration-screen.tsx`

### `src/app/(app)/nurse/care-plans/page.tsx`

Route: `/nurse/care-plans`

Purpose:

- Main Nursing Care Plan documentation screen.
- Provides document care plan, progress notes, and overview tabs.

Uses:

- `src/features/nursing/care-plans/care-plan-documentation-screen.tsx`

### `src/app/(app)/nurse/care-plans/configuration/page.tsx`

Route: `/nurse/care-plans/configuration`

Purpose:

- Care plan template configuration screen.
- Lets user add, edit, and delete reusable care plan templates.

Uses:

- `src/features/nursing/care-plans/care-plan-configuration-screen.tsx`

## 4. Screen Wrapper Files

These files provide clean screen-wise entry points. They are intentionally thin wrappers so routing and feature implementation remain separated.

### `src/features/nursing/assessments/assessment-user-screen.tsx`

Exports:

- `AssessmentUserScreen`

Purpose:

- Wraps and renders `NursingAssessmentsPage`.
- Use this file as the import target for the assessment user route.

### `src/features/nursing/assessments/assessment-configuration-screen.tsx`

Exports:

- `AssessmentConfigurationScreen`

Purpose:

- Wraps and renders `NursingAssessmentConfigurationPage`.
- Use this file as the import target for the assessment configuration route.

### `src/features/nursing/care-plans/care-plan-documentation-screen.tsx`

Exports:

- `CarePlanDocumentationScreen`

Purpose:

- Wraps and renders `NursingCarePlansPage`.
- Use this file as the import target for the care-plan documentation route.

### `src/features/nursing/care-plans/care-plan-configuration-screen.tsx`

Exports:

- `CarePlanConfigurationScreen`

Purpose:

- Wraps and renders `NursingCarePlanConfigurationPage`.
- Use this file as the import target for the care-plan configuration route.

## 5. Shared Nursing Infrastructure

### `src/features/nursing/nursing-shared.tsx`

Purpose:

- Shared UI shell and access logic for all Nursing screens.

Main exports:

- `nursingAccessRoles`
- `nursingFullAccessRoles`
- `useNursingAccess`
- `ProtectedNursing`
- `NursingShell`
- `NursingStatus`
- `NursingQuickNav`
- `NursingPatientStrip`
- `FieldLabel`

Important behavior:

- `ProtectedNursing` checks the active role from `useRole`.
- Read-only warning is shown for roles without full nursing access.
- `NursingShell` renders common page header and section navigation.
- Section navigation highlights the current Nursing page.
- `NursingPatientStrip` shows static patient context and quick action links.

Patch notes:

- For backend access control, replace role arrays or connect them to server permissions.
- If patient context becomes dynamic, replace hard-coded patient values inside `NursingPatientStrip` with props or context.

## 6. Nursing Data Model

### `src/features/nursing/nursing-data.ts`

Purpose:

- Stores all static Nursing data and TypeScript types.

Important types:

- `NursingFieldType`
- `NursingSelectable`
- `CareProblemStatus`
- `GoalProgress`
- `AssessmentRow`
- `AssessmentGroup`
- `CareIntervention`
- `CareGoal`
- `CareProblem`
- `CarePlan`

Important exports:

- `assessmentGroups`
- `assessmentTimes`
- `preferredAssessmentIds`
- `carePlans`
- `carePlanProgressNotes`
- `carePlanTemplates`

Assessment groups currently included:

- Abdominal Assessment
- Braden Scale
- Cardiovascular Assessment
- Daily Living Activities
- Emesis Assessment
- Fluid Balance
- Metabolic Assessment
- Morse Fall Risk
- Neuro Assessment
- NG Aspiration
- Oxygen Therapy
- Respiratory Assessment
- Sepsis Assessment
- Stool Assessment
- Urine Assessment
- Ventilation Assessment

Patch notes:

- Replace `assessmentGroups` with API data from an assessment-master endpoint.
- Replace `carePlans` with patient-visit care plan data.
- Replace `carePlanTemplates` with care plan template master data.
- Keep the current type shapes if possible; they match the UI requirements closely.

## 7. Nursing Assessment Screen

### `src/features/nursing/nursing-assessments.tsx`

Main exports:

- `NursingAssessmentsPage`
- `NursingAssessmentConfigurationPage`

Main internal helpers:

- `sortAssessmentGroups`
- `timeColumnLabel`
- `AssessmentField`
- `AssessmentTable`
- `buildMasterRows`
- `ExampleList`

### `NursingAssessmentsPage`

Route:

- `/nurse/assessments`

Purpose:

- Main documentation screen for nursing assessment entries.

Current functionality:

- Searchable assessment selector.
- All assessments remain available in the search list.
- Assessments are displayed alphabetically.
- Preference list with add/remove behavior.
- Time columns named `TIME 01`, `TIME 02`, etc.
- Fixed `NOW` column.
- `Add column` button between `NOW` and `Comment`.
- Clicking a time header opens a compact popup.
- Time popup supports:
  - editing time label
  - duplicate label validation
  - deleting a time column
  - warning if the column has documented values
  - preventing delete when only one TIME column remains
- Clicking `NOW` opens delete popup for the NOW column.
- Deleting NOW hides the NOW column and clears its values.
- Every row supports comments.
- Comment drawer supports:
  - add
  - edit
  - save
  - clear
- Field input rendering depends on `AssessmentRow.fieldType`:
  - Dropdown
  - Free text
  - Number
  - Calculated
  - Date and time

State used:

- `selectedGroupId`
- `assessmentSearch`
- `assessmentSearchOpen`
- `times`
- `showNow`
- `values`
- `comments`
- `preferenceIds`
- `commentTarget`

Patch notes:

- `values` should become an API payload keyed by row id and time column id.
- Time columns should eventually have stable IDs, not display labels.
- Comments should eventually store author, timestamp, row id, and note text.
- The current local key format is `${row.id}-${time}`.

### `NursingAssessmentConfigurationPage`

Route:

- `/nurse/assessments/configuration`

Purpose:

- Configure assessment master rows and inspect example assessment definitions.

Current functionality:

- Tabs:
  - Assessments master
  - Example list
- Search master rows by row id, row name, or display name.
- Add content row.
- Add grouper row.
- Toggle active/inactive state.
- Edit row in drawer.
- Edit supports:
  - row id
  - row name
  - display name
  - type: Grouper or Content
  - field type
  - selectable mode
  - dropdown options
- Example list shows clinical content rows, field types, options, formula, and comment state.

State used:

- `rows`
- `search`
- `draft`

Patch notes:

- `rows` should be backed by an assessment-master API.
- Validation should be added for duplicate row ids before API save.
- Dropdown options should become structured records with option label and value.

## 8. Nursing Care Plan Screen

### `src/features/nursing/nursing-care-plans.tsx`

Main exports:

- `NursingCarePlansPage`
- `NursingCarePlanConfigurationPage`

Main internal helpers/components:

- `stamp`
- `mapPlans`
- `InterventionRow`
- `GoalBlock`
- `ProblemBlock`
- `ProgressNotes`
- `Overview`

### `NursingCarePlansPage`

Route:

- `/nurse/care-plans`

Purpose:

- Document active patient care plans.

Current functionality:

- Visit care plan selector.
- Add new care plan.
- Tabs:
  - Document care plan
  - Care plan progress notes
  - Overview
- Add problem.
- Add goal under a problem.
- Add intervention under a goal.
- Problem status dropdown:
  - Active
  - Adequate for discharge
  - Resolved
- Resolved problems are hidden from active document screen.
- Goal progress dropdown:
  - Pending
  - Achieved
  - Partially achieved
  - Achieved and completed
- Add intervention to worklist.
- Complete intervention.
- Completion drawer captures note.
- Completion creates a progress note.
- Progress notes tab supports search.
- Overview tab summarizes problem status, goal progress, recent notes, and intervention states.

State used:

- `plans`
- `notes`
- `planId`
- `addTarget`
- `addValue`
- `completeTarget`
- `completeNote`
- `newPlanOpen`
- `newPlanName`

Patch notes:

- `plans` should be loaded by patient visit/admission id.
- `notes` should come from nursing documentation/progress-note API.
- Worklist action should call task/worklist API.
- Completion should persist intervention documentation and audit trail.

### `NursingCarePlanConfigurationPage`

Route:

- `/nurse/care-plans/configuration`

Purpose:

- Manage reusable care plan templates.

Current functionality:

- List of care plan templates.
- New care plan template.
- Edit template in drawer.
- Delete template with compact confirmation popup.
- Template fields:
  - name
  - problem count
  - goal count
  - intervention count
  - active flag

State used:

- `templates`
- `draft`
- `deleteTarget`

Patch notes:

- Replace `templates` with care-plan-template API.
- Counts are placeholders; future implementation should store nested template structure:
  - care plan
  - problems
  - goals
  - interventions
- Delete should be soft delete if templates are referenced by patient records.

## 9. Nursing Dashboard

### `src/features/nursing/nursing-pages.tsx`

Main export:

- `NursingDashboardPage`

Route:

- `/nurse`

Purpose:

- Landing page for Nursing module.
- Shows quick metrics and links to Nursing screens.

Current functionality:

- Displays counts from static assessment groups, care plans, open interventions, and notes.
- Uses `NursingQuickNav` to link to all major Nursing screens.

Patch notes:

- Replace static counts with dashboard summary API.
- Add shift-wise workload, pending documentation, overdue interventions, and escalation metrics if required.

## 10. Functional Behavior Summary

### Assessment user screen

Works now:

- Search assessment
- Select assessment
- Add/remove preference
- Add time column
- Edit time column label
- Delete time column with condition
- Delete NOW column
- Enter assessment values
- Add/edit/clear comments for every row

### Assessment configuration

Works now:

- Search master rows
- Add row
- Add grouper
- Edit row
- Toggle active state
- View example list

### Care plan documentation

Works now:

- Select care plan
- Add care plan
- Add problem
- Add goal
- Add intervention
- Update problem status
- Update goal progress
- Add to worklist
- Complete intervention with note
- Search progress notes
- View overview

### Care plan configuration

Works now:

- Add template
- Edit template
- Delete template with confirmation

## 11. Suggested Backend API Contracts

Suggested endpoints for future integration:

- `GET /api/nursing/assessments/master`
- `POST /api/nursing/assessments/master`
- `PATCH /api/nursing/assessments/master/:rowId`
- `GET /api/nursing/assessments/visit/:visitId`
- `POST /api/nursing/assessments/visit/:visitId/entries`
- `POST /api/nursing/assessments/visit/:visitId/comments`
- `GET /api/nursing/care-plans/templates`
- `POST /api/nursing/care-plans/templates`
- `PATCH /api/nursing/care-plans/templates/:templateId`
- `DELETE /api/nursing/care-plans/templates/:templateId`
- `GET /api/nursing/care-plans/visit/:visitId`
- `POST /api/nursing/care-plans/visit/:visitId`
- `PATCH /api/nursing/care-plans/visit/:visitId/problems/:problemId`
- `PATCH /api/nursing/care-plans/visit/:visitId/goals/:goalId`
- `POST /api/nursing/care-plans/visit/:visitId/interventions/:interventionId/complete`
- `POST /api/nursing/worklist`

## 12. Testing and Verification

Commands used during development:

```bash
npx eslint src/features/nursing 'src/app/(app)/nurse'
curl -I http://localhost:3000/nurse/assessments
curl -I http://localhost:3000/nurse/assessments/configuration
curl -I http://localhost:3000/nurse/care-plans
curl -I http://localhost:3000/nurse/care-plans/configuration
```

Known unrelated issue:

- Full `npm run typecheck` currently fails in `src/features/auth/auth-pages.tsx`.
- That file is outside the Nursing module and was intentionally not changed.

## 13. Patch Guidance for Another Frontend Developer

Recommended patch order:

1. Keep route files under `src/app/(app)/nurse/**` as thin wrappers.
2. Update static data in `nursing-data.ts` first if fields or labels change.
3. Update screen logic in:
   - `nursing-assessments.tsx`
   - `nursing-care-plans.tsx`
4. Keep reusable shell/access/status behavior in `nursing-shared.tsx`.
5. Add API integration behind the current state operations.
6. Do not change unrelated modules unless explicitly required.

Important implementation notes:

- Assessment row comments are currently keyed by row id.
- Assessment values are currently keyed by row id plus time label.
- Time labels are editable, so backend integration should use stable column IDs.
- Care plan completion adds a local progress note immediately.
- Delete confirmation is local UI only; backend soft-delete rules should be implemented later.

