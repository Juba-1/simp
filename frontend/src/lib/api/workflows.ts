import { apiFetch } from './client';

export interface WorkflowDecisionPayload {
  comments?: string;
  unitRate?: number;
  lineAmount?: number;
}

export function submitFormWorkflow(
  token: string,
  formId: string,
  payload?: WorkflowDecisionPayload,
) {
  return apiFetch(`/workflows/forms/${formId}/submit`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload ?? {}),
  });
}

export function approveInternal(
  token: string,
  formId: string,
  payload?: WorkflowDecisionPayload,
) {
  return apiFetch(`/workflows/forms/${formId}/approve-internal`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload ?? {}),
  });
}

export function rejectInternal(
  token: string,
  formId: string,
  payload?: WorkflowDecisionPayload,
) {
  return apiFetch(`/workflows/forms/${formId}/reject-internal`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload ?? {}),
  });
}

export function approveExternal(
  token: string,
  formId: string,
  payload?: WorkflowDecisionPayload,
) {
  return apiFetch(`/workflows/forms/${formId}/approve-external`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload ?? {}),
  });
}

export function rejectExternal(
  token: string,
  formId: string,
  payload?: WorkflowDecisionPayload,
) {
  return apiFetch(`/workflows/forms/${formId}/reject-external`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload ?? {}),
  });
}

export function fetchWorkflowHistory(token: string, formId: string) {
  return apiFetch(`/workflows/forms/${formId}/history`, { token });
}

export function resubmitFormWorkflow(
  token: string,
  formId: string,
  payload?: WorkflowDecisionPayload,
) {
  return apiFetch(`/workflows/forms/${formId}/resubmit`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload ?? {}),
  });
}
