<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Protect school pages under the integration-managed authenticated layout and check the protected owner role before mounting school state; no first-user or user-metadata ownership claim is allowed, because real records belong exclusively to the explicitly verified owner.
- Keep uploaded personal records out of browser bundles and public asset storage; import them into access-controlled Cloud tables only after the owner's identity is confirmed.
- Read and save school students through authenticated server functions and owner-scoped RLS, with paginated initial reads and a shared query cache; preserve unknown amounts and contract dates rather than fabricating them.
- School reports reuse the protected shared student and monthly revenue queries; absent expenses and event dates remain unknown, and contractual tuition is not payment history.
- Revenue forecasts use a client-safe tested helper averaging up to twelve recorded completed months, require at least three observations, exclude missing/current months, and stay distinct from actual annual revenue.
- CRM uses owner-scoped authenticated server functions and a separate shared query; database triggers normalize and deduplicate phones, audit lead changes, and convert matches against student/responsible phone fields so all student write paths behave consistently.
- Financial launch dates synchronize the existing month key in a database trigger; classification catalogs normalize names and propagate renames/merges transactionally while preserving monetary fields, so existing monthly reports remain compatible.
- Pedagogical catalogs and enrollment records preserve legacy text; student and enrollment updates use an owner-checked transactional RPC, while follow-ups use a separate shared protected query and photos use owner-only private storage.
- Keep student editing in the shared AlunoForm and dashboard concealment presentation-only with inert hidden content, so all entry points share layout and privacy does not alter stored records.
- Energy and provider controls render independently in Financeiro and share protected cached queries; provider payments close a work month transactionally with a single linked cash entry, and hourly rates are snapshots on daily lessons to preserve history.
- Cash reconciliation reuses lancamentos with owner-bound accounts, integer-cent helpers and protected transactional RPCs; initial balances are closing positions and audit trails preserve changes affecting closed checks.
- Selected student, CRM, financial, pedagogy and provider save handlers project editable fields through write-fields before database writes; request spreads must never set audit, import, ownership or payment-link fields.

- Birthdays reuse the protected student cache and a client-safe age/filter helper; imported birthdates and contacts match both code and normalized full name and never overwrite populated contacts.
- Tuition installments live in their own owner-only table; settling goes through a transactional RPC that creates the linked income entry, so payments and Financeiro stay consistent.
- Extra tuition schedules use a separate batch UUID in the existing installments table and an owner-checked idempotent RPC; uniqueness stays per original contract or extra batch, allowing overlapping months without replacing existing installments or enrollment fees.
- Settlement suggestions use the shared client-safe helper and current student form values; derive the amount from the selected date unless manually overridden, so discount edits and early payments are reflected immediately.
- Monthly revenue uses a protected aggregate of realized non-transfer cash income plus preserved historical/manual offsets; transactional edits snapshot the cash baseline, and cash-cache refreshes invalidate the shared revenue query to avoid duplicate tuition and enrollment revenue.
- Dashboard completion forecasts reuse the protected tuition cache and a tested client-safe grouping helper keyed by the last non-cancelled tuition reference, so contract-only students never appear and settled installments remain eligible.
- Apply discount-day due-date suggestions through the shared student form setter and a client-safe helper; do not rewrite existing installments or override stored contracts merely by opening the form, preserving renegotiations.
- Paginate the student table after shared-cache filtering and sorting, and retain its page-size preference locally; this limits rendered rows without truncating reports, filters or next-code calculation.
- Keep financial value/description drafts in form-local inputs and precompute catalog usage counts; this avoids rebuilding transaction tables for every keystroke, while isolated settlement/contract forms retain reactive calculations.
- Group the visible financial list by launch date with a memoized client-safe integer-cent helper; preserve filters, ordering and rows. Daily net uses visible rows; monthly accumulated movement uses the full cached list from month start through each date, resets monthly and is independent of display order and filters, not an account balance.
- Contas a pagar live in their own owner-only table; paying goes through a transactional RPC that creates one linked cash exit (estorno removes it), and recurring bills share a series UUID with pre-generated monthly due dates, so Financeiro and cash balances never double-count.
- Provider payments use prestador_pagar_completo: lessons + next-month bus fares + extras in one cash exit with chosen account; receipt is rendered client-side from the stored payment breakdown.
- Energy controls and their linked cash exit stay synchronized both ways (energia_salvar updates the lancamento; a lancamentos trigger updates energia_registros), so one bill never shows two values.
