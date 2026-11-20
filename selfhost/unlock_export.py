"""Export Data works on her copy with no sign-in (2026-11-19).
The earlier attempt (gateActive: false in gates/export.ts) made applyGate() re-run itself forever through
primeExportGateActivation() and froze the page. This patches the caller instead: never locked, never
probes, all three formats. Re-runnable. Run from the repo root."""
import sys
p = 'src/app/event-handlers.ts'
s = open(p).read()
if 'nvii-unlock-export' in s:
    print('already'); sys.exit(0)
EDITS = [
  ("import { primeExportGateActivation } from '@/services/gates/export-resolver';\n",
   "import { primeExportGateActivation, SUPPORTED_EXPORT_FORMATS } from '@/services/gates/export-resolver';\n"),
  ("      if (verdict.locked) {\n        showLocked(exportLockToGateReason(verdict.reason));\n",
   "      const nviiNeverLocked = true as boolean; // nvii-unlock-export: Export works on her copy\n      if (!nviiNeverLocked && verdict.locked) {\n        showLocked(exportLockToGateReason(verdict.reason));\n"),
  ("      if (verdict.pendingActivation) {\n", "      if (!nviiNeverLocked && !verdict.locked && verdict.pendingActivation) {\n"),
  ("      unlock(evaluateAvailableExportFormats(authState));\n",
   "      unlock(nviiNeverLocked ? [...SUPPORTED_EXPORT_FORMATS] : evaluateAvailableExportFormats(authState));\n"),
]
for old, new in EDITS:
    assert s.count(old) == 1, old
    s = s.replace(old, new)
open(p, 'w').write(s)
print('patched')
