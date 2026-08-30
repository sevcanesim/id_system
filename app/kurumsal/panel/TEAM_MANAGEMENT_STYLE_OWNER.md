# Team management style ownership

`team-management.css` owns the final presentation rules for these corporate panel surfaces:

- employees list and operational attention states
- physical card inventory presentation
- employee detail drawer
- responsive behavior for the same surfaces

New visual changes for these surfaces should be made here instead of adding another `premium-ui-pass-N.css` file.

Existing overlapping selectors in legacy premium pass files should be removed incrementally after visual regression checks confirm parity.
