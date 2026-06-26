## Goal
Remove the gray description/one-liner line that appears under each startup name in the Pipeline table, since it takes too much space. Keep everything else unchanged.

## Change
In `src/routes/_authenticated/dashboard.tsx`, inside the `StartupRow` component, the startup name cell currently renders:

```text
Startup name
+ (if oneLiner exists) a small gray line with the description
```

Remove the `startup.oneLiner` paragraph block so only the bold startup name shows. The detail page (when clicking a startup) is untouched and still shows full info.

## Result
- Pipeline rows become single-line and more compact/clean.
- No data or logic changes — purely presentational on the dashboard list.