# IOU dApp

## Project Overview
- IOU dApp lets people create and track simple promises (records) between peers.
- Each record captures a logical commitment or reminder; it is not a financial instrument.
- Creating an IOU does **not** move Pi or any other asset—no payment is executed during record creation.

## Core Principles
- **Utility before value:** The focus is on usefulness of recording promises rather than token movement.
- **Non-custodial by design:** The app does not hold funds or manage balances on behalf of users.
- **Optional Pi integration:** Pi Network tools are available but not required to use the app.

## Current Functionality (Pre-Listing)
- Guest mode is supported for immediate use.
- Users can create IOUs and keep them persisted for reference.
- No Pi transactions are performed anywhere in the flow.
- Login is optional; basic usage does not require authentication.

## Data & Security Notes
- The database is not publicly exposed; it is reachable only through server-side APIs that rely on service role keys.
- No personal or financial data is stored; records only represent logical promises.
- Row-Level Security (RLS) is intentionally disabled during this pre-listing phase.

## Guest Mode Explanation
- Guest identity is device-based; the app ties records to the current device context.
- Data persists only on the same device and may be lost if the device is reset or storage is cleared.
- Signing in will be required later for cross-device continuity or migration.

## Pi Network Integration Status
- The Pi SDK is integrated but not enforced for basic usage.
- Login will be required only for future settlement actions when applicable.
- Sandbox mode is enabled for Pi SDK interactions.
- No Pi payments occur without explicit user action and approval.

## Language & Terminology
- The app intentionally avoids financial terminology.
- It uses terms like **promise**, **record**, **reminder**, and **settlement** rather than debt or credit language.

## Roadmap (High-Level, Non-Committal)
- Optional Pi-based settlement after required approvals.
- Migration path from guest usage to signed-in Pi users when available.
- No timelines or guarantees are provided for these items.

## Disclaimer
- This app does not provide financial services.
- It does not operate as a wallet, lender, or payment processor.
