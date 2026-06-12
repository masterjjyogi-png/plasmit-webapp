"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { MessageSquareText, Plus, Search, Star, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  assessmentGroups,
  preferredAssessmentIds,
  type AssessmentGroup,
  type AssessmentRow,
  type NursingFieldType,
  type NursingSelectable,
} from "@/features/nursing/nursing-data";
import { FieldLabel, NursingPatientStrip, NursingShell, NursingStatus } from "@/features/nursing/nursing-shared";

type AssessmentValues = Record<string, string>;
type CommentTarget = { row: AssessmentRow; comment: string };
type IntakeOutputEntry = {
  rowId: string;
  rowLabel: string;
  groupName: string;
  time: string;
  value: string;
  flow: "Intake" | "Output";
  patientId: string;
  patientName: string;
  visitId: string;
  documentedAt: string;
};
type CascadeRule = { parentId: string; value: string };
type MasterRow = {
  id: string;
  row: string;
  display: string;
  type: "Grouper" | "Content";
  active: boolean;
  parentId?: string;
  fieldType?: NursingFieldType;
  selectable?: NursingSelectable;
  options?: string;
  formula?: string;
  commentBox?: boolean;
  commentNote?: string;
  cascadeParentId?: string;
  cascadeValue?: string;
  cascadeRules?: CascadeRule[];
  intake?: boolean;
  output?: boolean;
};

const assessmentMasterRowsStorageKey = "nursing-assessment-master-rows";
const assessmentIntakeOutputStorageKey = "nursing-assessment-intake-output-map";

function sortAssessmentGroups(groups: AssessmentGroup[]) {
  return [...groups].sort((first, second) => first.displayName.localeCompare(second.displayName));
}

function buildMasterRows(): MasterRow[] {
  return sortAssessmentGroups(assessmentGroups).flatMap((group) => [
    { id: group.id, row: group.name, display: group.displayName, type: "Grouper" as const, active: group.active },
    ...group.rows.map((row) => ({
      id: row.id,
      row: row.label,
      display: row.label,
      type: "Content" as const,
      active: true,
      parentId: group.id,
      fieldType: row.fieldType,
      selectable: row.selectable,
      options: row.options?.join(", ") ?? "",
      formula: row.formula,
      commentBox: Boolean(row.commentBox),
      intake: Boolean(row.intake),
      output: Boolean(row.output),
    })),
  ]);
}

function readStoredMasterRows() {
  if (typeof window === "undefined") return buildMasterRows();

  try {
    const savedRows = window.localStorage.getItem(assessmentMasterRowsStorageKey);
    if (!savedRows) return buildMasterRows();
    const parsedRows = JSON.parse(savedRows);
    if (!Array.isArray(parsedRows)) return buildMasterRows();
    const defaultRows = buildMasterRows();
    return (parsedRows as MasterRow[]).map((row) => ({
      ...row,
      commentBox: row.commentBox ?? defaultRows.find((defaultRow) => defaultRow.id === row.id)?.commentBox ?? false,
      intake: row.intake ?? defaultRows.find((defaultRow) => defaultRow.id === row.id)?.intake ?? false,
      output: row.output ?? defaultRows.find((defaultRow) => defaultRow.id === row.id)?.output ?? false,
      formula: row.formula ?? defaultRows.find((defaultRow) => defaultRow.id === row.id)?.formula,
    }));
  } catch {
    return buildMasterRows();
  }
}

function saveStoredMasterRows(rows: MasterRow[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(assessmentMasterRowsStorageKey, JSON.stringify(rows));
  window.dispatchEvent(new Event("nursing-assessment-master-updated"));
}

function getAssessmentGroupsFromMasterRows(masterRows: MasterRow[]) {
  return masterRows
    .filter((row) => row.type === "Grouper" && row.active)
    .map((group): AssessmentGroup => ({
      id: group.id,
      name: group.row,
      displayName: group.display || group.row,
      active: group.active,
      rows: masterRows
        .filter((row) => row.type === "Content" && row.active && row.parentId === group.id)
        .map((row) => ({
          id: row.id,
          group: group.row,
          label: row.display || row.row,
          fieldType: row.fieldType ?? "Free text",
          selectable: row.selectable ?? "None",
          options: row.options?.split(",").map((option) => option.trim()).filter(Boolean),
          formula: row.formula,
          commentBox: Boolean(row.commentBox),
          cascadeParentId: row.cascadeParentId,
          cascadeValue: row.cascadeValue,
          cascadeRules: row.cascadeRules,
          intake: Boolean(row.intake),
          output: Boolean(row.output),
        })),
    }))
    .filter((group) => group.rows.length > 0);
}

function FieldTypeGuidance({ fieldType }: { fieldType?: NursingFieldType }) {
  if (fieldType === "Dropdown") {
    return (
      <div className="rounded-md border border-info/30 bg-info/10 p-3 text-xs text-info">
        Dropdown options will appear in the user screen. Use option values for calculation when needed, for example: Yes=1, No=0. Single selectable allows one option; Multiple allows more than one option.
      </div>
    );
  }
  if (fieldType === "Free text") {
    return <div className="rounded-md border border-info/30 bg-info/10 p-3 text-xs text-info">Free text rows will show a text box in the user screen.</div>;
  }
  if (fieldType === "Number") {
    return <div className="rounded-md border border-info/30 bg-info/10 p-3 text-xs text-info">Number rows will show a numeric input in the user screen.</div>;
  }
  if (fieldType === "Calculated") {
    return <div className="rounded-md border border-info/30 bg-info/10 p-3 text-xs text-info">Calculation rows use formulas with Row IDs. Example: [Row ID 1] + [Row ID 2] - [Row ID 3].</div>;
  }
  return null;
}

function timeColumnLabel(index: number) {
  return `TIME ${String(index + 1).padStart(2, "0")}`;
}

const nonNegativeAssessmentRows = new Set(["Urine assessment:Urine Volume (in ml)", "Urine assessment:Diaper weight (in ml)", "Stool assessment:Stool (ml)", "Emesis Assessment:Emesis (in ml)", "NG Aspiration assessment:Volume (ml)"]);

function scoreFromSelectedOption(value: string) {
  const score = Number(value.split("=").at(-1));
  return Number.isFinite(score) ? score : 0;
}

function parseDropdownOption(option: string) {
  const [label = "", optionValue] = option.split("=");
  return {
    label: label.trim() || option.trim(),
    value: option.trim(),
    rowValue: optionValue?.trim() ?? "",
  };
}

function getOptionRows(options = "") {
  const parsedOptions = options.split(",").map((option) => option.trim()).filter(Boolean).map(parseDropdownOption);
  return parsedOptions.length ? parsedOptions : [{ label: "", rowValue: "", value: "" }];
}

function buildOptionsFromRows(optionRows: { label: string; rowValue: string }[]) {
  return optionRows
    .map((option) => {
      const label = option.label.trim();
      const rowValue = option.rowValue.trim();
      if (!label) return "";
      return rowValue ? `${label}=${rowValue}` : label;
    })
    .filter(Boolean)
    .join(", ");
}

function numericValueFromDocumentation(value: string) {
  if (!value.trim()) return 0;
  return value.split(",").reduce((total, item) => total + scoreFromSelectedOption(item.trim()), 0);
}

function getFormulaRowIds(formula: string) {
  return Array.from(formula.matchAll(/\[([^\]]+)\]/g), (match) => match[1].trim()).filter(Boolean);
}

function validateFormula(formula: string, availableRowIds: Set<string>) {
  const formulaTrimmed = formula.trim();
  if (!formulaTrimmed) return "Formula is required for calculation row.";
  const rowIds = getFormulaRowIds(formulaTrimmed);
  if (!rowIds.length) return "Formula should include at least one Row ID in square brackets.";
  const missingRowId = rowIds.find((rowId) => !availableRowIds.has(rowId));
  if (missingRowId) return `Invalid Row ID in formula: ${missingRowId}.`;
  const expression = formulaTrimmed.replace(/\[([^\]]+)\]/g, "1");
  if (!/^[\d+\-*/().\s]+$/.test(expression)) return "Formula can only use Row IDs, numbers, +, -, *, /, and brackets.";

  try {
    const result = Function(`"use strict"; return (${expression});`)();
    return Number.isFinite(result) ? "" : "Formula result is not a valid number.";
  } catch {
    return "Formula syntax is invalid.";
  }
}

function evaluateFormula(formula: string, getValueForRowId: (rowId: string) => string) {
  const expression = formula.replace(/\[([^\]]+)\]/g, (_match, rowId: string) => String(numericValueFromDocumentation(getValueForRowId(rowId.trim()))));
  if (!/^[\d+\-*/().\s]+$/.test(expression)) return "Formula error";

  try {
    const result = Function(`"use strict"; return (${expression});`)();
    return Number.isFinite(result) ? String(result) : "Formula error";
  } catch {
    return "Formula error";
  }
}

function saveIntakeOutputEntries(entries: IntakeOutputEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(assessmentIntakeOutputStorageKey, JSON.stringify(entries));
}

function formatDateTimeDisplay(value: string) {
  if (!value) return "";
  const [date = "", time = ""] = value.split("T");
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return value.replace("T", "   ");
  return `${day}/${month}/${year}   ${time}`;
}

function DateTimeFieldWithSave({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [draftValue, setDraftValue] = React.useState(value);

  function openPicker() {
    setDraftValue(value);
    setOpen(true);
  }

  return (
    <div className="relative">
      <Input readOnly value={formatDateTimeDisplay(value)} onClick={openPicker} onFocus={openPicker} placeholder="Document" />
      {open ? (
        <div className="fixed left-1/2 top-1/2 z-50 w-72 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-surface p-3 shadow-soft">
          <Input type="datetime-local" value={draftValue} onChange={(event) => setDraftValue(event.target.value)} />
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(draftValue);
                setOpen(false);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AssessmentField({ row, value, onChange }: { row: AssessmentRow; value: string; onChange: (value: string) => void }) {
  const disallowNegativeValue = nonNegativeAssessmentRows.has(`${row.group}:${row.label}`);
  const showDateTimeSave = row.group === "Oxygen therapy Assessment" && (row.label === "Start" || row.label === "End") && row.fieldType === "Date and time";

  if (row.fieldType === "Dropdown") {
    const parsedOptions = row.options?.map(parseDropdownOption) ?? [];

    if (row.selectable === "Multiple") {
      const selectedValues = value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
      return (
        <select
          multiple
          className="min-h-24 w-full min-w-[170px] rounded-md border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
          value={selectedValues}
          onChange={(event) => onChange(Array.from(event.target.selectedOptions).map((option) => option.value).join(", "))}
        >
          {parsedOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      );
    }

    return (
      <select className="h-9 w-full min-w-[150px] rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/20" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select</option>
        {parsedOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    );
  }
  if (row.fieldType === "Calculated") {
    return <div className="rounded-md border border-info/30 bg-info/10 px-2 py-2 text-sm text-info">{value || row.formula || "Auto calculated"}</div>;
  }
  if (showDateTimeSave) {
    return <DateTimeFieldWithSave value={value} onChange={onChange} />;
  }
  return (
    <Input
      min={disallowNegativeValue ? 0 : undefined}
      type={row.fieldType === "Number" ? "number" : row.fieldType === "Date and time" ? "datetime-local" : "text"}
      value={value}
      onChange={(event) => {
        const nextValue = event.target.value;
        onChange(disallowNegativeValue && Number(nextValue) < 0 ? "" : nextValue);
      }}
      placeholder="Document"
    />
  );
}

function AssessmentTable({
  group,
  times,
  showNow,
  values,
  comments,
  onAddColumn,
  onDeleteColumn,
  onDeleteNow,
  onRenameColumn,
  onValueChange,
  onComment,
}: {
  group: AssessmentGroup;
  times: string[];
  showNow: boolean;
  values: AssessmentValues;
  comments: Record<string, string>;
  onAddColumn: () => void;
  onDeleteColumn: (time: string) => void;
  onDeleteNow: () => void;
  onRenameColumn: (oldTime: string, newTime: string) => void;
  onValueChange: (rowId: string, time: string, value: string) => void;
  onComment: (row: AssessmentRow) => void;
}) {
  const [deleteTime, setDeleteTime] = React.useState<string | null>(null);
  const [draftTime, setDraftTime] = React.useState("");
  const [hoveredCommentRowId, setHoveredCommentRowId] = React.useState<string | null>(null);
  const deletingHasData = deleteTime ? group.rows.some((row) => Boolean(values[`${row.id}-${deleteTime}`]?.trim())) : false;
  const nowHasData = group.rows.some((row) => Boolean(values[`${row.id}-NOW`]?.trim()));
  const canDelete = times.length > 1;
  const draftTimeTrimmed = draftTime.trim();
  const duplicateDraftTime = Boolean(deleteTime && draftTimeTrimmed && draftTimeTrimmed !== deleteTime && times.includes(draftTimeTrimmed));

  function getMorseFallScore(time: string) {
    return ["ri4", "ri5", "ri6", "ri7", "ri8", "ri9"].reduce((total, rowId) => total + scoreFromSelectedOption(values[`${rowId}-${time}`] ?? ""), 0);
  }

  function getAssessmentValue(row: AssessmentRow, time: string) {
    if (group.id === "grp-fall" && row.id === "ri10") {
      return `r4+r5+r6+r7+r8+r9 = ${getMorseFallScore(time)}`;
    }
    if (row.fieldType === "Calculated" && row.formula) {
      return evaluateFormula(row.formula, (rowId) => values[`${rowId}-${time}`] ?? "");
    }
    return values[`${row.id}-${time}`] ?? "";
  }

  function conditionMatches(parentValue: string, cascadeValue: string) {
    return parentValue.split(",").map((item) => item.trim()).includes(cascadeValue);
  }

  function shouldShowRow(row: AssessmentRow) {
    const cascadeRules = row.cascadeRules?.length ? row.cascadeRules : row.cascadeParentId && row.cascadeValue ? [{ parentId: row.cascadeParentId, value: row.cascadeValue }] : [];
    if (!cascadeRules.length) return true;
    const timeKeys = showNow ? [...times, "NOW"] : times;
    return cascadeRules.every((rule) => timeKeys.some((time) => conditionMatches(values[`${rule.parentId}-${time}`] ?? "", rule.value)));
  }

  const visibleRows = group.rows.filter(shouldShowRow);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{group.displayName}</CardTitle>
          <CardDescription>Time-based documentation grid configured from assessment master rows.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead className="bg-surface-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="border-b border-border px-3 py-2 text-left">Content row</th>
                {times.map((time) => (
                  <th className="relative border-b border-border px-3 py-2 text-left" key={time}>
                    <button
                      className="rounded px-1 py-0.5 text-left hover:bg-background"
                      onClick={() => {
                        const nextTime = deleteTime === time ? null : time;
                        setDeleteTime(nextTime);
                        setDraftTime(nextTime ?? "");
                      }}
                    >
                      {time}
                    </button>
                    {deleteTime === time ? (
                      <div className="absolute left-2 top-9 z-40 w-80 rounded-lg border border-border bg-surface p-3 normal-case tracking-normal text-foreground shadow-soft">
                        <div className="text-sm font-semibold">Edit {time}</div>
                        <label className="mt-3 block text-xs font-medium text-muted-foreground">
                          Time label
                          <Input className="mt-1 h-8" value={draftTime} onChange={(event) => setDraftTime(event.target.value)} placeholder="Enter time or label" />
                        </label>
                        {duplicateDraftTime ? <div className="mt-1 text-xs text-danger">This time column already exists.</div> : null}
                        <div className="mt-1 text-xs text-muted-foreground">
                          {!canDelete ? "At least one TIME column is required." : deletingHasData ? "This column has documented values. Deleting will remove those values." : "This column has no documented values."}
                        </div>
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setDeleteTime(null); setDraftTime(""); }}>Cancel</Button>
                          <Button
                            size="sm"
                            disabled={!draftTimeTrimmed || duplicateDraftTime}
                            onClick={() => {
                              onRenameColumn(time, draftTimeTrimmed);
                              setDeleteTime(null);
                              setDraftTime("");
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={!canDelete}
                            onClick={() => {
                              onDeleteColumn(time);
                              setDeleteTime(null);
                              setDraftTime("");
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </th>
                ))}
                {showNow ? (
                  <th className="relative border-b border-border px-3 py-2 text-left">
                    <button className="rounded px-1 py-0.5 text-left hover:bg-background" onClick={() => setDeleteTime(deleteTime === "NOW" ? null : "NOW")}>NOW</button>
                    {deleteTime === "NOW" ? (
                      <div className="absolute left-2 top-9 z-40 w-72 rounded-lg border border-border bg-surface p-3 normal-case tracking-normal text-foreground shadow-soft">
                        <div className="text-sm font-semibold">Delete NOW?</div>
                        <div className="mt-1 text-xs text-muted-foreground">{nowHasData ? "NOW column has documented values. Deleting will remove those values." : "NOW column has no documented values."}</div>
                        <div className="mt-3 flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setDeleteTime(null)}>Cancel</Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              onDeleteNow();
                              setDeleteTime(null);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </th>
                ) : null}
                <th className="border-b border-border px-3 py-2 text-left">
                  <Button size="sm" onClick={onAddColumn}><Plus className="h-4 w-4" />Add column</Button>
                </th>
                <th className="border-b border-border px-3 py-2 text-left">Comment</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr className="border-b border-border last:border-b-0 hover:bg-surface-muted/60" key={row.id}>
                  <td className="px-3 py-2 align-top font-medium">{row.label}</td>
                  {times.map((time) => (
                    <td className="px-3 py-2 align-top" key={time}>
                      <AssessmentField row={row} value={getAssessmentValue(row, time)} onChange={(value) => onValueChange(row.id, time, value)} />
                    </td>
                  ))}
                  {showNow ? (
                    <td className="px-3 py-2 align-top">
                      <AssessmentField row={row} value={getAssessmentValue(row, "NOW")} onChange={(value) => onValueChange(row.id, "NOW", value)} />
                    </td>
                  ) : null}
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">New time slot</td>
                  <td className="px-3 py-2 align-top">
                    <div className="min-w-[160px] space-y-2">
                      {row.commentBox ? (
                        <div className="relative inline-flex">
                          <Button
                            size="icon"
                            variant={comments[row.id] ? "default" : "outline"}
                            onMouseEnter={() => setHoveredCommentRowId(row.id)}
                            onMouseLeave={() => setHoveredCommentRowId(null)}
                            onFocus={() => setHoveredCommentRowId(row.id)}
                            onBlur={() => setHoveredCommentRowId(null)}
                            onClick={() => onComment(row)}
                            aria-label={`Comment for ${row.label}`}
                          >
                            <MessageSquareText className="h-4 w-4" />
                          </Button>
                          {hoveredCommentRowId === row.id && comments[row.id] ? (
                            <div className="absolute left-10 top-0 z-50 w-64 rounded-md border border-border bg-surface p-2 text-xs text-foreground shadow-soft">
                              {comments[row.id]}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function NursingAssessmentsPage() {
  const [sortedGroups, setSortedGroups] = React.useState<AssessmentGroup[]>(() => getAssessmentGroupsFromMasterRows(readStoredMasterRows()));
  const firstGroup = sortedGroups[0];
  const [selectedGroupId, setSelectedGroupId] = React.useState(firstGroup?.id ?? "");
  const [assessmentSearch, setAssessmentSearch] = React.useState(firstGroup?.displayName ?? "");
  const [assessmentSearchOpen, setAssessmentSearchOpen] = React.useState(false);
  const [times, setTimes] = React.useState(["TIME 01", "TIME 02", "TIME 03", "TIME 04"]);
  const [showNow, setShowNow] = React.useState(true);
  const [values, setValues] = React.useState<AssessmentValues>({});
  const [comments, setComments] = React.useState<Record<string, string>>({});
  const [preferenceIds, setPreferenceIds] = React.useState(preferredAssessmentIds);
  const [commentTarget, setCommentTarget] = React.useState<CommentTarget | null>(null);
  const selected = sortedGroups.find((group) => group.id === selectedGroupId) ?? firstGroup;
  const preferences = sortedGroups.filter((group) => preferenceIds.includes(group.id));
  const filteredAssessmentGroups = sortedGroups.filter((group) => group.displayName.toLowerCase().includes(assessmentSearch.toLowerCase()) || group.name.toLowerCase().includes(assessmentSearch.toLowerCase()));

  React.useEffect(() => {
    function refreshMasterRows() {
      const nextGroups = getAssessmentGroupsFromMasterRows(readStoredMasterRows());
      setSortedGroups(nextGroups);
      setSelectedGroupId((currentId) => nextGroups.some((group) => group.id === currentId) ? currentId : nextGroups[0]?.id ?? "");
      setAssessmentSearch((currentSearch) => currentSearch || nextGroups[0]?.displayName || "");
    }

    window.addEventListener("storage", refreshMasterRows);
    window.addEventListener("focus", refreshMasterRows);
    window.addEventListener("nursing-assessment-master-updated", refreshMasterRows);
    return () => {
      window.removeEventListener("storage", refreshMasterRows);
      window.removeEventListener("focus", refreshMasterRows);
      window.removeEventListener("nursing-assessment-master-updated", refreshMasterRows);
    };
  }, []);

  React.useEffect(() => {
    const entries: IntakeOutputEntry[] = [];
    const timeKeys = showNow ? [...times, "NOW"] : times;

    sortedGroups.forEach((group) => {
      group.rows.forEach((row) => {
        if (!row.intake && !row.output) return;
        timeKeys.forEach((time) => {
          const value = values[`${row.id}-${time}`]?.trim();
          if (!value) return;
          const entryContext = {
            rowId: row.id,
            rowLabel: row.label,
            groupName: group.displayName,
            time,
            value,
            patientId: "PL-20418",
            patientName: "Aarav Sharma",
            visitId: "IPD-1188",
            documentedAt: new Date().toISOString(),
          };
          if (row.intake) entries.push({ ...entryContext, flow: "Intake" });
          if (row.output) entries.push({ ...entryContext, flow: "Output" });
        });
      });
    });

    saveIntakeOutputEntries(entries);
  }, [showNow, sortedGroups, times, values]);

  function togglePreference(groupId: string) {
    setPreferenceIds((ids) => ids.includes(groupId) ? ids.filter((id) => id !== groupId) : [...ids, groupId]);
  }

  function addColumn() {
    setTimes((current) => [...current, timeColumnLabel(current.length)]);
  }

  function deleteColumn(time: string) {
    setTimes((current) => current.filter((item) => item !== time));
    setValues((current) => {
      const next = { ...current };
      Object.keys(next).forEach((key) => {
        if (key.endsWith(`-${time}`)) delete next[key];
      });
      return next;
    });
  }

  function renameColumn(oldTime: string, newTime: string) {
    if (!newTime || oldTime === newTime || times.includes(newTime)) return;
    setTimes((current) => current.map((time) => time === oldTime ? newTime : time));
    setValues((current) => {
      const next = { ...current };
      Object.keys(current).forEach((key) => {
        if (!key.endsWith(`-${oldTime}`)) return;
        const renamedKey = `${key.slice(0, -oldTime.length)}${newTime}`;
        next[renamedKey] = current[key];
        delete next[key];
      });
      return next;
    });
  }

  function deleteNow() {
    setShowNow(false);
    setValues((current) => {
      const next = { ...current };
      Object.keys(next).forEach((key) => {
        if (key.endsWith("-NOW")) delete next[key];
      });
      return next;
    });
  }

  return (
    <NursingShell
      title="Nursing Assessments"
      description="Clinical assessment documentation with configurable rows, comments, preferences, and intake/output flags."
    >
      <NursingPatientStrip />
      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Assessment</CardTitle>
            <CardDescription>Select group or open a preference.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                value={assessmentSearch}
                onChange={(event) => {
                  setAssessmentSearch(event.target.value);
                  setAssessmentSearchOpen(true);
                }}
                onFocus={() => setAssessmentSearchOpen(true)}
                onClick={() => {
                  setAssessmentSearch("");
                  setAssessmentSearchOpen(true);
                }}
                placeholder="Search assessment"
              />
              {assessmentSearchOpen ? (
                <div className="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-surface shadow-soft">
                  {filteredAssessmentGroups.filter((group) => group.active).map((group) => (
                    <button
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-muted"
                      key={group.id}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setSelectedGroupId(group.id);
                        setAssessmentSearch(group.displayName);
                        setAssessmentSearchOpen(false);
                      }}
                    >
                      {group.displayName}
                    </button>
                  ))}
                  {!filteredAssessmentGroups.length ? <div className="px-3 py-2 text-sm text-muted-foreground">No assessment found</div> : null}
                </div>
              ) : null}
            </div>
            {selected ? (
              <Button className="w-full" variant={preferenceIds.includes(selected.id) ? "default" : "outline"} onClick={() => togglePreference(selected.id)}>
                <Star className="h-4 w-4" />{preferenceIds.includes(selected.id) ? "Preferred" : "Add to preference"}
              </Button>
            ) : null}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preference list</div>
                  {preferences.map((group) => (
                <div className="flex items-center gap-2" key={group.id}>
                  <button className="min-w-0 flex-1 rounded-md border border-border p-2 text-left text-sm hover:bg-surface-muted" onClick={() => { setSelectedGroupId(group.id); setAssessmentSearch(group.displayName); }}>{group.displayName}</button>
                  <Button size="icon" variant="ghost" onClick={() => togglePreference(group.id)} aria-label={`Remove ${group.displayName}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {selected ? (
          <AssessmentTable
            group={selected}
            times={times}
            showNow={showNow}
            values={values}
            comments={comments}
            onAddColumn={addColumn}
            onDeleteColumn={deleteColumn}
            onDeleteNow={deleteNow}
            onRenameColumn={renameColumn}
            onValueChange={(rowId, time, value) => setValues((current) => ({ ...current, [`${rowId}-${time}`]: value }))}
            onComment={(row) => setCommentTarget({ row, comment: comments[row.id] ?? "" })}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No active assessments</CardTitle>
              <CardDescription>Activate or add assessment master rows to document nursing assessments.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
      <Drawer open={Boolean(commentTarget)} onOpenChange={(open) => !open && setCommentTarget(null)} title="Assessment comment" description={commentTarget?.row.label}>
        <div className="space-y-3">
          <textarea className="min-h-36 w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring/20" value={commentTarget?.comment ?? ""} onChange={(event) => setCommentTarget((target) => target ? { ...target, comment: event.target.value } : target)} />
          <div className="flex flex-wrap gap-2">
            <Button className="flex-1" onClick={() => {
              if (!commentTarget) return;
              setComments((current) => ({ ...current, [commentTarget.row.id]: commentTarget.comment }));
              setCommentTarget(null);
            }}>Save comment</Button>
            <Button variant="outline" onClick={() => {
              if (!commentTarget) return;
              setComments((current) => {
                const next = { ...current };
                delete next[commentTarget.row.id];
                return next;
              });
              setCommentTarget(null);
            }}>Clear</Button>
          </div>
        </div>
      </Drawer>
    </NursingShell>
  );
}

export function NursingAssessmentConfigurationPage() {
  const [rows, setRows] = React.useState<MasterRow[]>(readStoredMasterRows);
  const [search, setSearch] = React.useState("");
  const [draft, setDraft] = React.useState<MasterRow | null>(null);
  const [draftOriginalId, setDraftOriginalId] = React.useState<string | null>(null);
  const [inactiveTarget, setInactiveTarget] = React.useState<MasterRow | null>(null);
  const [configCommentTarget, setConfigCommentTarget] = React.useState<{ row: MasterRow; comment: string } | null>(null);
  const filtered = rows.filter((row) => row.active && `${row.id} ${row.row} ${row.display}`.toLowerCase().includes(search.toLowerCase()));
  const draftId = draft?.id.trim() ?? "";
  const draftRowName = draft?.row.trim() ?? "";
  const duplicateDraftId = Boolean(draftId && rows.some((row) => row.id === draftId && row.id !== draftOriginalId));
  const availableFormulaRowIds = new Set(rows.filter((row) => row.type === "Content" && row.id !== draftOriginalId).map((row) => row.id));
  if (draftId && draft?.type === "Content") availableFormulaRowIds.add(draftId);
  const formulaValidationMessage = draft?.type === "Content" && draft.fieldType === "Calculated" ? validateFormula(draft.formula ?? "", availableFormulaRowIds) : "";
  const formulaPreview = draft?.type === "Content" && draft.fieldType === "Calculated" && draft.formula && !formulaValidationMessage
    ? evaluateFormula(draft.formula, () => "1")
    : "";
  const invalidCascadeRule = draft?.cascadeRules?.find((rule) => !rule.parentId || !rule.value.trim());
  const cascadeValidationMessage = draft?.type === "Content" && draft.cascadeParentId && !draft.cascadeValue?.trim()
    ? "Cascade condition value is required."
    : draft?.type === "Content" && invalidCascadeRule
      ? "Every cascade condition should have a parent row and condition value."
      : "";
  const canSaveDraft = Boolean(draftId && draftRowName && !duplicateDraftId && !formulaValidationMessage && !cascadeValidationMessage);
  const draftOptionRows = getOptionRows(draft?.options);
  const draftSiblingRows = draft?.type === "Content" && draft.parentId
    ? rows.filter((row) => row.type === "Content" && row.parentId === draft.parentId && row.id !== draftOriginalId)
    : rows.filter((row) => row.type === "Content" && row.id !== draftOriginalId);
  const cascadeParent = rows.find((row) => row.id === draft?.cascadeParentId);
  const cascadeParentOptions = cascadeParent?.options?.split(",").map((option) => option.trim()).filter(Boolean) ?? [];
  const formulaBuilderRows = rows.filter((row) => row.type === "Content" && row.id !== draftOriginalId);

  function updateRows(nextRows: React.SetStateAction<MasterRow[]>) {
    setRows((current) => {
      const updated = typeof nextRows === "function" ? nextRows(current) : nextRows;
      saveStoredMasterRows(updated);
      return updated;
    });
  }

  function createUniqueRowId(prefix: string) {
    let counter = rows.length + 1;
    let nextId = `${prefix}-${counter}`;
    while (rows.some((row) => row.id === nextId)) {
      counter += 1;
      nextId = `${prefix}-${counter}`;
    }
    return nextId;
  }

  function openNew(type: MasterRow["type"]) {
    setDraftOriginalId(null);
    setDraft({ id: createUniqueRowId(type === "Grouper" ? "grp" : "row"), row: "", display: "", type, active: true, fieldType: "Dropdown", selectable: "Single", options: "", commentBox: false, intake: false, output: false });
  }

  function openNewContentForGrouper(group: MasterRow) {
    setDraftOriginalId(null);
    setDraft({ id: createUniqueRowId("row"), row: "", display: "", type: "Content", active: true, parentId: group.id, fieldType: "Dropdown", selectable: "Single", options: "", commentBox: false, intake: false, output: false });
  }

  function openNewCascadeForRow(row: MasterRow) {
    const firstOption = row.options?.split(",").map((option) => option.trim()).filter(Boolean)[0] ?? "";
    setDraftOriginalId(null);
    setDraft({ id: createUniqueRowId("row"), row: "", display: "", type: "Content", active: true, parentId: row.parentId, fieldType: "Free text", selectable: "None", options: "", commentBox: false, intake: false, output: false, cascadeParentId: row.id, cascadeValue: firstOption });
  }

  function openEdit(row: MasterRow) {
    setDraftOriginalId(row.id);
    setDraft(row);
  }

  function updateDraftOption(index: number, key: "label" | "rowValue", value: string) {
    const nextRows = draftOptionRows.map((option, optionIndex) => optionIndex === index ? { ...option, [key]: value } : option);
    setDraft((current) => current ? { ...current, options: buildOptionsFromRows(nextRows) } : current);
  }

  function addDraftOption() {
    setDraft((current) => current ? { ...current, options: buildOptionsFromRows([...draftOptionRows, { label: "", rowValue: "" }]) } : current);
  }

  function removeDraftOption(index: number) {
    const nextRows = draftOptionRows.filter((_option, optionIndex) => optionIndex !== index);
    setDraft((current) => current ? { ...current, options: buildOptionsFromRows(nextRows.length ? nextRows : [{ label: "", rowValue: "" }]) } : current);
  }

  function appendFormulaToken(token: string) {
    setDraft((current) => current ? { ...current, formula: `${current.formula ? `${current.formula} ` : ""}${token}` } : current);
  }

  function updateCascadeRule(index: number, key: keyof CascadeRule, value: string) {
    const currentRules = draft?.cascadeRules?.length ? draft.cascadeRules : [];
    const nextRules = currentRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, [key]: value } : rule);
    setDraft((current) => current ? { ...current, cascadeRules: nextRules } : current);
  }

  function addCascadeRule() {
    setDraft((current) => current ? { ...current, cascadeRules: [...(current.cascadeRules ?? []), { parentId: "", value: "" }] } : current);
  }

  function removeCascadeRule(index: number) {
    setDraft((current) => current ? { ...current, cascadeRules: (current.cascadeRules ?? []).filter((_rule, ruleIndex) => ruleIndex !== index) } : current);
  }

  function saveDraft() {
    if (!draft || !canSaveDraft) return;
    const rowToSave = {
      ...draft,
      id: draftId,
      row: draftRowName,
      display: draft.display.trim() || draftRowName,
      selectable: draft.fieldType === "Dropdown" ? draft.selectable : "None",
      options: draft.fieldType === "Dropdown" ? draft.options : "",
      formula: draft.fieldType === "Calculated" ? draft.formula : "",
      cascadeValue: draft.cascadeParentId ? draft.cascadeValue : "",
      cascadeRules: draft.cascadeRules?.filter((rule) => rule.parentId && rule.value.trim()) ?? [],
    };
    updateRows((current) => {
      if (draftOriginalId) {
        return current.map((row) => {
          if (row.id === draftOriginalId) return rowToSave;
          if (draft.type === "Grouper" && row.parentId === draftOriginalId) return { ...row, parentId: rowToSave.id };
          return row;
        });
      }
      if (!rowToSave.parentId) return [rowToSave, ...current];
      let insertIndex = current.findIndex((row) => row.id === rowToSave.parentId);
      current.forEach((row, index) => {
        if (row.id === rowToSave.parentId || row.parentId === rowToSave.parentId) insertIndex = index;
      });
      return [...current.slice(0, insertIndex + 1), rowToSave, ...current.slice(insertIndex + 1)];
    });
    setDraftOriginalId(null);
    setDraft(null);
  }

  function confirmInactive() {
    if (!inactiveTarget) return;
    updateRows((current) => current.map((row) => row.id === inactiveTarget.id ? { ...row, active: false } : row));
    setInactiveTarget(null);
  }

  function saveConfigComment() {
    if (!configCommentTarget) return;
    updateRows((current) => current.map((row) => row.id === configCommentTarget.row.id ? { ...row, commentNote: configCommentTarget.comment } : row));
    setConfigCommentTarget(null);
  }

  return (
    <NursingShell title="Assessment Configuration" description="Configure grouper rows, content rows, field types, dropdown options, comments, and intake/output flags.">
      <Tabs defaultValue="master">
        <TabsList>
          <TabsTrigger value="master">Assessments master</TabsTrigger>
        </TabsList>
        <TabsContent value="master">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Assessments Master</CardTitle>
                <CardDescription>Only active rows appear in nursing documentation.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1 max-w-xs">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Search row ID or name" value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
                <Button onClick={() => openNew("Grouper")}><Plus className="h-4 w-4" />New grouper</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead className="bg-surface-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <tr>{["Row ID", "Row name", "Display name", "Type", "Active", "Comment box", "I/O", "Cascade", "Actions"].map((head) => <th className="border-b border-border px-3 py-2 text-left" key={head}>{head}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr className="border-b border-border last:border-b-0 hover:bg-surface-muted/60" key={row.id}>
                        <td className="px-3 py-2">{row.id}</td>
                        <td className="px-3 py-2">{row.row}</td>
                        <td className="px-3 py-2">{row.display}</td>
                        <td className="px-3 py-2"><NursingStatus status={row.type} /></td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={row.active}
                            onChange={(event) => {
                              if (!event.target.checked) setInactiveTarget(row);
                            }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          {row.type === "Content" ? (
                            row.commentBox ? (
                              <div className="flex items-center gap-2">
                                <span>Yes</span>
                                <Button
                                  size="icon"
                                  variant={row.commentNote ? "default" : "outline"}
                                  title={row.commentNote || "Add comment"}
                                  aria-label={`Comment for ${row.display || row.row}`}
                                  onClick={() => setConfigCommentTarget({ row, comment: row.commentNote ?? "" })}
                                >
                                  <MessageSquareText className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              "No"
                            )
                          ) : (
                            ""
                          )}
                        </td>
                        <td className="px-3 py-2">{row.type === "Content" ? [row.intake ? "Intake" : "", row.output ? "Output" : ""].filter(Boolean).join(", ") : ""}</td>
                        <td className="px-3 py-2">{row.type === "Content" && row.cascadeParentId ? `${row.cascadeParentId} = ${row.cascadeValue}` : ""}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            {row.type === "Grouper" ? <Button size="sm" onClick={() => openNewContentForGrouper(row)}><Plus className="h-4 w-4" />Add content</Button> : null}
                            {row.type === "Content" ? <Button size="sm" onClick={() => openNewCascadeForRow(row)}><Plus className="h-4 w-4" />Add cascade</Button> : null}
                            <Button size="sm" variant="outline" onClick={() => openEdit(row)}>Edit</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog.Root open={Boolean(draft)} onOpenChange={(open) => {
        if (open) return;
        setDraft(null);
        setDraftOriginalId(null);
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88dvh] w-[min(calc(100vw-2rem),560px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-soft outline-none">
            <div className="flex items-start justify-between gap-4 border-b border-border bg-surface px-4 py-3">
              <div>
                <Dialog.Title className="text-sm font-semibold text-foreground">{draft?.type === "Grouper" ? "Edit grouper row" : "Edit content row"}</Dialog.Title>
                <Dialog.Description className="mt-1 text-xs text-muted-foreground">Configure the assessment master row and save your changes.</Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button size="icon" variant="ghost" aria-label="Close modal">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
            <div className="max-h-[calc(88dvh-62px)] overflow-auto p-4">
              {draft ? (
                <div className="space-y-3">
                  <FieldLabel label="Row ID" value={<Input value={draft.id} onChange={(event) => setDraft({ ...draft, id: event.target.value })} placeholder="Row ID" />} />
                  {duplicateDraftId ? <div className="rounded-md border border-danger/30 bg-danger/10 p-2 text-sm font-bold text-black">Warning: Row ID must be unique.</div> : null}
                  <FieldLabel label="Row name" value={<Input value={draft.row} onChange={(event) => setDraft({ ...draft, row: event.target.value })} placeholder="Row name" />} />
                  <FieldLabel label="Display name" value={<Input value={draft.display} onChange={(event) => setDraft({ ...draft, display: event.target.value })} placeholder="Display name" />} />
                  <FieldLabel
                    label="Type"
                    value={
                      draft.type === "Content" ? (
                        <Input readOnly value="Content" />
                      ) : (
                        <select className="h-9 w-full rounded-md border border-input bg-background px-2" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as MasterRow["type"] })}>
                          <option value="Grouper">Grouper</option>
                          {!draftOriginalId ? <option value="Content">Content</option> : null}
                        </select>
                      )
                    }
                  />
                  {draft.type === "Content" ? (
                    <>
                      <FieldLabel label="Field type" value={<select className="h-9 w-full rounded-md border border-input bg-background px-2" value={draft.fieldType} onChange={(event) => setDraft({ ...draft, fieldType: event.target.value as NursingFieldType })}><option>Dropdown</option><option>Free text</option><option>Number</option><option value="Calculated">Calculation row</option></select>} />
                      <FieldTypeGuidance fieldType={draft.fieldType} />
                      {draft.fieldType === "Dropdown" ? (
                        <>
                          <FieldLabel label="Dropdown options" value={<Input value={draft.options ?? ""} onChange={(event) => setDraft({ ...draft, options: event.target.value })} placeholder="Yes=1, No=0, Unable to assess=0" />} />
                          <FieldLabel
                            label="Option row values"
                            value={
                              <div className="space-y-2">
                                {draftOptionRows.map((option, index) => (
                                  <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]" key={`${option.value}-${index}`}>
                                    <Input value={option.label} onChange={(event) => updateDraftOption(index, "label", event.target.value)} placeholder="Option" />
                                    <Input value={option.rowValue} onChange={(event) => updateDraftOption(index, "rowValue", event.target.value)} placeholder="Value" />
                                    <Button size="sm" variant="outline" onClick={() => removeDraftOption(index)}>Remove</Button>
                                  </div>
                                ))}
                                <Button size="sm" onClick={addDraftOption}><Plus className="h-4 w-4" />Add option</Button>
                              </div>
                            }
                          />
                          <FieldLabel label="Selectable" value={<select className="h-9 w-full rounded-md border border-input bg-background px-2" value={draft.selectable} onChange={(event) => setDraft({ ...draft, selectable: event.target.value as NursingSelectable })}><option>Single</option><option>Multiple</option></select>} />
                        </>
                      ) : null}
                      {draft.fieldType === "Calculated" ? (
                        <>
                          <FieldLabel label="Formula" value={<Input value={draft.formula ?? ""} onChange={(event) => setDraft({ ...draft, formula: event.target.value })} placeholder="[Row ID 1] + [Row ID 2] - [Row ID 3]" />} />
                          <FieldLabel
                            label="Formula builder"
                            value={
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  {formulaBuilderRows.map((row) => <Button size="sm" variant="outline" key={row.id} onClick={() => appendFormulaToken(`[${row.id}]`)}>{row.id}</Button>)}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {["+", "-", "*", "/", "(", ")"].map((operator) => <Button size="sm" variant="outline" key={operator} onClick={() => appendFormulaToken(operator)}>{operator}</Button>)}
                                </div>
                              </div>
                            }
                          />
                          {formulaValidationMessage ? <div className="rounded-md border border-danger/30 bg-danger/10 p-2 text-sm font-bold text-black">{formulaValidationMessage}</div> : null}
                          {formulaPreview ? <div className="rounded-md border border-info/30 bg-info/10 p-2 text-xs text-info">Preview with sample row values: {formulaPreview}</div> : null}
                        </>
                      ) : null}
                      <FieldLabel
                        label="Appears after documentation"
                        value={
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-4">
                              <label className="inline-flex items-center gap-2">
                                <input type="checkbox" checked={Boolean(draft.intake)} onChange={(event) => setDraft({ ...draft, intake: event.target.checked })} />
                                <span>Intake</span>
                              </label>
                              <label className="inline-flex items-center gap-2">
                                <input type="checkbox" checked={Boolean(draft.output)} onChange={(event) => setDraft({ ...draft, output: event.target.checked })} />
                                <span>Output</span>
                              </label>
                            </div>
                            <div className="text-xs text-muted-foreground">Selected rows can be shown after documentation in Intake/Output screens.</div>
                          </div>
                        }
                      />
                      <FieldLabel
                        label="Cascade parent row"
                        value={
                          <>
                            <select
                              className="h-9 w-full rounded-md border border-input bg-background px-2"
                              value={draft.cascadeParentId ?? ""}
                              onChange={(event) => setDraft({ ...draft, cascadeParentId: event.target.value || undefined, cascadeValue: "" })}
                            >
                              <option value="">Always show this row</option>
                              {draftSiblingRows.map((row) => <option key={row.id} value={row.id}>{row.display || row.row}</option>)}
                            </select>
                            <div className="mt-2 text-xs text-muted-foreground">Choose a parent row to show this row only when the condition value matches in the user screen.</div>
                          </>
                        }
                      />
                      {draft.cascadeParentId ? (
                        <FieldLabel
                          label="Cascade condition value"
                          value={
                            cascadeParentOptions.length ? (
                              <select className="h-9 w-full rounded-md border border-input bg-background px-2" value={draft.cascadeValue ?? ""} onChange={(event) => setDraft({ ...draft, cascadeValue: event.target.value })}>
                                <option value="">Select condition</option>
                                {cascadeParentOptions.map((option) => <option key={option}>{option}</option>)}
                              </select>
                            ) : (
                              <Input value={draft.cascadeValue ?? ""} onChange={(event) => setDraft({ ...draft, cascadeValue: event.target.value })} placeholder="Show when parent value equals" />
                            )
                          }
                        />
                      ) : null}
                      <FieldLabel
                        label="Additional cascade conditions"
                        value={
                          <div className="space-y-2">
                            {(draft.cascadeRules ?? []).map((rule, index) => {
                              const selectedParent = rows.find((row) => row.id === rule.parentId);
                              const selectedParentOptions = selectedParent?.options?.split(",").map((option) => option.trim()).filter(Boolean) ?? [];
                              return (
                                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" key={`${rule.parentId}-${index}`}>
                                  <select className="h-9 rounded-md border border-input bg-background px-2" value={rule.parentId} onChange={(event) => updateCascadeRule(index, "parentId", event.target.value)}>
                                    <option value="">Parent row</option>
                                    {draftSiblingRows.map((row) => <option key={row.id} value={row.id}>{row.display || row.row}</option>)}
                                  </select>
                                  {selectedParentOptions.length ? (
                                    <select className="h-9 rounded-md border border-input bg-background px-2" value={rule.value} onChange={(event) => updateCascadeRule(index, "value", event.target.value)}>
                                      <option value="">Condition</option>
                                      {selectedParentOptions.map((option) => <option key={option} value={option}>{parseDropdownOption(option).label}</option>)}
                                    </select>
                                  ) : (
                                    <Input value={rule.value} onChange={(event) => updateCascadeRule(index, "value", event.target.value)} placeholder="Condition value" />
                                  )}
                                  <Button size="sm" variant="outline" onClick={() => removeCascadeRule(index)}>Remove</Button>
                                </div>
                              );
                            })}
                            <Button size="sm" onClick={addCascadeRule}><Plus className="h-4 w-4" />Add condition</Button>
                          </div>
                        }
                      />
                      {cascadeValidationMessage ? <div className="rounded-md border border-danger/30 bg-danger/10 p-2 text-sm font-bold text-black">{cascadeValidationMessage}</div> : null}
                      <FieldLabel
                        label="Comment box"
                        value={
                          <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={Boolean(draft.commentBox)} onChange={(event) => setDraft({ ...draft, commentBox: event.target.checked })} />
                            <span>{draft.commentBox ? "Included" : "Not included"}</span>
                          </label>
                        }
                      />
                    </>
                  ) : null}
                  {draftOriginalId ? (
                    <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-black">
                      <div className="font-bold">Delete this configuration?</div>
                      <p className="mt-1 text-xs font-bold text-black">This will permanently remove the selected assessment row or grouper.</p>
                      <Button size="sm" variant="danger" onClick={() => {
                        updateRows((current) => current.filter((row) => row.id !== draftOriginalId));
                        setDraftOriginalId(null);
                        setDraft(null);
                      }}>
                        Delete configuration
                      </Button>
                    </div>
                  ) : null}
                  <Button className="w-full" disabled={!canSaveDraft} onClick={saveDraft}>Save configuration</Button>
                </div>
              ) : null}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={Boolean(inactiveTarget)} onOpenChange={(open) => !open && setInactiveTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),420px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface shadow-soft outline-none">
            <div className="border-b border-border px-4 py-3">
              <Dialog.Title className="text-sm font-semibold text-foreground">Make row inactive?</Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-muted-foreground">
                This assessment master row will be marked inactive and hidden from this screen.
              </Dialog.Description>
            </div>
            <div className="space-y-3 p-4">
              <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-black">
                <div className="font-bold">Warning</div>
                <p className="mt-1 text-xs font-bold text-black">
                  {inactiveTarget?.display || inactiveTarget?.row} will no longer appear in the active assessment master table.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.Close>
                <Button variant="danger" onClick={confirmInactive}>Inactive</Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={Boolean(configCommentTarget)} onOpenChange={(open) => !open && setConfigCommentTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),460px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface shadow-soft outline-none">
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
              <div>
                <Dialog.Title className="text-sm font-semibold text-foreground">Comment box note</Dialog.Title>
                <Dialog.Description className="mt-1 text-xs text-muted-foreground">{configCommentTarget?.row.display || configCommentTarget?.row.row}</Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button size="icon" variant="ghost" aria-label="Close comment popup">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
            <div className="space-y-3 p-4">
              <textarea
                className="min-h-32 w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring/20"
                value={configCommentTarget?.comment ?? ""}
                onChange={(event) => setConfigCommentTarget((target) => target ? { ...target, comment: event.target.value } : target)}
                placeholder="Write comment"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!configCommentTarget) return;
                    updateRows((current) => current.map((row) => row.id === configCommentTarget.row.id ? { ...row, commentNote: "" } : row));
                    setConfigCommentTarget(null);
                  }}
                >
                  Clear
                </Button>
                <Button onClick={saveConfigComment}>Save comment</Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </NursingShell>
  );
}
