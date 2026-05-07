# care_appointment_plug

> A CARE plug that adds invoicing on top of appointment booking.
>
> When a user confirms an appointment that has linked **charge items**, this
> plug intercepts the host's `createAppointment` call and:
>
> 1. lets the host create the appointment as usual,
> 2. fetches the charge items linked to that appointment,
> 3. finds an active billable account for the patient,
> 4. creates a draft invoice and issues it,
> 5. navigates to the invoice page with the payment sheet auto-opened.
>
> If no charge items or no billable account exist, the plug falls through
> and the host's normal "appointment created" flow runs unchanged.

## How it works

The plug **does not override any UI**. It registers a single API-route
override against the host's appointment-creation endpoint via
`window.__careApiOverrides`. The host's `mutate(scheduleApi.slots.createAppointment, …)`
detects the override and routes through the plug's handler.

See [`src/apiOverrides.ts`](./src/apiOverrides.ts) for the handler and
[CARE Apps Override Architecture](../../docs/care-apps-override-architecture.md)
for the override framework.

## Layout

```
src/
├── apiOverrides.ts      # the override handler (the entire plug, basically)
├── manifest.tsx         # plug manifest; imports apiOverrides as a side-effect
├── lib/
│   └── request.ts       # minimal fetch wrapper used by the override
└── types/api/           # typed route definitions (path + method + types)
    ├── accountApi.ts
    ├── appointmentApi.ts
    ├── chargeItemApi.ts
    └── invoiceApi.ts
```

## Getting started

```bash
npm install
npm run dev          # vite preview + vite build --watch on :4173
```

## Local CARE setup

1. Run CARE locally (see the host repo).
2. Open the CARE Admin Dashboard → **Apps** → **Add New Config**.
3. Use a slug of your choice and the following meta:

   ```json
   {
     "url": "http://localhost:4173/assets/remoteEntry.js",
     "name": "care-appointment-plug"
   }
   ```

4. Save and reload CARE. Book an appointment whose schedule has charge
   items attached — confirming it should land you on the invoice page
   with the payment sheet open.

## Customising the trigger

The override only fires when `window.location.pathname` includes
`/book-appointment`. Adjust the guard in `apiOverrides.ts` to suit other
flows, or remove it to fire on every appointment creation.
