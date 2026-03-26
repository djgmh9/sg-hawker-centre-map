import { buildStatusMessage } from "./searchView.js";

export function renderStatusMessage(statusElement, statusState) {
  statusElement.textContent = buildStatusMessage(statusState);
}
