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
