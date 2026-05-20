# care_appointment_plug

> A CARE plug that auto-issues an invoice and opens the payment sheet when
> an appointment with linked **charge items** is confirmed.

When the user confirms an appointment, the plug replaces care_fe's
`BookAppointmentDetails` component with its own `BookAppointmentDetails` component. The clone wraps the
same booking UI, then on a successful `createAppointment`:

1. Lists charge items linked to the new appointment.
2. Finds an active, billable account for the patient.
3. Creates a draft invoice and immediately moves it to `issued`.
4. Navigates to the invoice page with the payment sheet auto-opened.

If the appointment has no charge items or the patient has no open account,
the plug falls through to care_fe's default post-create navigation.

## How it works

This plug uses care_fe's **component override registry**
(`src/lib/override/` in care_fe). The bridge `window.__careOverrides` is
installed by care_fe at bootstrap; the plug calls
`addComponent("BookAppointmentDetails", { component, condition })` to
register its fork.

The fork is scoped by `condition.custom` to the two care_fe routes that mount
`BookAppointmentSheet`:

- `PatientHome` → `/facility/:facilityId/patients/home`
- `PatientProfile` → `/patient/:id[/:tab]` and
  `/facility/:facilityId/patient/:id[/:tab]`

Anywhere else (including future consumers of `BookAppointmentDetails`),
the override is skipped and the core's base component renders.

## Layout

```
src/
├── componentOverrides.ts                    # one-line registration: which key → which component
├── manifest.tsx                             # plug manifest; imports componentOverrides as a side-effect
├── lib/
│   ├── hostOverrides.ts                     # typed wrapper around window.__careOverrides (copy-paste-ready for new plugs)
│   └── invoiceFlow.ts                       # the business logic: list → find account → create → issue
├── pages/Appointments/BookAppointment/
│   └── BookAppointmentDetails.tsx           # fork of care_fe component; calls runInvoiceFlow on success
├── types/billing/                           # cloned care_fe types (account, chargeItem, invoice, …)
└── Utils/request/                           # cloned care_fe request layer (query, mutate, errorHandler)
```

Only two files contain plug-specific logic: `componentOverrides.ts` (the
intent) and `lib/invoiceFlow.ts` (the behaviour). Everything else is either
the forked component, the typed bridge to care_fe, or cloned care_fe
modules.

## Getting started

```bash
npm install
npm run dev          # vite preview + vite build --watch on :4173
```

Run CARE locally (see care_fe repo) with this plug cloned into care_fe's
`apps/` folder. care_fe's vite config picks it up automatically.

## Writing a new plug

Use this repo as a reference. The minimum set of files a new plug needs:

1. `src/lib/hostOverrides.ts` — copy verbatim. Plug-agnostic.
2. `src/componentOverrides.ts` — replace the map with your own
   `{ key: { component, condition? } }` entries.
3. `src/Utils/request/` — copy verbatim if your override calls care_fe APIs.
4. The forked component(s) themselves, plus any business helpers.
5. `manifest.tsx` and `vite.config.ts` federation/manifest plumbing.

### Scoping an override

Every entry accepts an optional `condition`. care_fe evaluates it on
every navigation; the override only applies when the condition passes.

```ts
defineComponentOverrides({
  MyComponent: {
    component: MyFork,
    condition: {
      // URL match — uses care_fe's OverrideContext.route (= usePath())
      custom: ({ route }) => route?.startsWith("/facility/") ?? false,

      // Other supported fields (all optional, all AND-ed):
      // page: "facility" | ["facility", "patient"],
      // userRole: "doctor",
      // facilityType: "hospital",
      // stackPath: ["ParentComponent", "MyComponent"],   // requires ancestors to be register()-wrapped in care_fe
    },
  },
});
```

Omit `condition` to override globally.

### Falling through to care_fe's base

Override components receive care_fe's original implementation as
`props.__base`. Use it when your override should only kick in for some
prop shapes:

```tsx
export function MyFork({
  __base,
  ...props
}: Props & { __base?: ComponentType }) {
  if (!shouldFork(props) && __base) return <__base {...props} />;
  return <MyImpl {...props} />;
}
```
