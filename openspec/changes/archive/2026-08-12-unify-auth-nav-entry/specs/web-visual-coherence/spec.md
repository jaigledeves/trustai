# Delta for web-visual-coherence

## ADDED Requirements

> Note: no existing requirement in
> `openspec/specs/web-visual-coherence/spec.md` currently governs the auth
> icon used in the public nav, so this is ADDED rather than a copy-edit of
> an existing block, even though `proposal.md` lists this capability under
> "Modified Capabilities" (the domain, not a specific requirement, is
> touched).

### Requirement: No Ambiguous Auth Icon in Public Nav

Public nav surfaces (landing `Nav`, `verify/[id]` layout) MUST NOT use the
`lucide-react` `LogIn` icon, or any icon visually mirroring the `LogOut`
icon used for sign-out, to represent the sign-in action. The sign-in
affordance MUST be a text-labeled action ("Acceder"), never an icon-only
control.

#### Scenario: LogIn icon is absent from public nav surfaces

- GIVEN the rendered markup of landing `Nav` and the `verify/[id]` layout
  header in their logged-out state
- WHEN inspected for icon usage
- THEN neither renders a `LogIn` icon or any icon-only sign-in control

#### Scenario: Sign-in action is a text label, not an icon

- GIVEN the logged-out state of landing `Nav` or the `verify/[id]` layout
  header
- WHEN the sign-in action renders
- THEN it displays the visible text "Acceder", not an icon-only button

#### Scenario: Sign-in and sign-out never share a mirrored icon pair

- GIVEN the logged-out sign-in action and the logged-in sign-out action
  across landing and verify nav
- WHEN both are inspected
- THEN sign-in uses no icon at all, ruling out any icon that could be
  mistaken as a mirror of the sign-out icon
