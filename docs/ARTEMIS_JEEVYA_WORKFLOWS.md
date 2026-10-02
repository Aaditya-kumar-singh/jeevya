# ARTEMIS Jeevya Release Workflow

## Test prompt template

Launch Jeevya and run the specified Jeevya regression scenario from start to finish.

Requirements:
- Stay inside the Jeevya application unless the scenario explicitly requires a system permission screen.
- Use visible UI state to locate controls.
- Verify each stated checkpoint rather than assuming success.
- If an action fails, inspect the current UI and recover when safe.
- Record crashes, unexpected dialogs, navigation loops, missing data, incorrect totals, stale data, and unresponsive controls.
- At the end, report every checkpoint as passed, failed, or inconclusive.

## Critical smoke test

Open Jeevya, verify the dashboard loads, open Tasks, create a test task named "ARTEMIS Smoke Test", mark it complete, open Health, return to Dashboard, and verify the app remains responsive and the completed task is represented in today's progress. Report any crash, unexpected dialog, broken navigation, or missing state update.

## Diagnostic escalation

For a failed smoke test:
1. Inspect the ARTEMIS trace.
2. Capture the final screenshot and UI hierarchy.
3. Inspect stderr/logcat.
4. Reproduce the smallest failing workflow.
5. Fix Jeevya.
6. Repeat the same workflow.
