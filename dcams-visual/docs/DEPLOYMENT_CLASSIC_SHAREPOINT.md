# DCAMS – Visual Maps Deployment (SharePoint Classic)

## Overview
This module is a client-side HTML/CSS/JS solution designed for SharePoint Server (on-prem) Classic pages. It runs inside a Script Editor Web Part (SEWP) or a Content Editor Web Part (CEWP). All assets are same-origin and intranet-safe (no external CDNs).

## Recommended Library Path
Upload the entire `/dcams-visual/` folder to a document library such as:

```
/SiteAssets/dcams-visual/
```

Ensure the library allows serving JS/CSS/SVG/JSON files and that users have read access.

## Option A: Script Editor Web Part (Preferred)
1. Go to the classic page and **Edit**.
2. Add a **Script Editor Web Part**.
3. Paste the minimal embed snippet below and save the page.

```html
<div id="dcams-root"></div>
<link rel="stylesheet" href="/SiteAssets/dcams-visual/styles.css" />
<script src="/SiteAssets/dcams-visual/app.js" defer></script>
```

## Option B: Content Editor Web Part (CEWP)
1. Upload `embed.html` to `/SiteAssets/dcams-visual/`.
2. Add a **Content Editor Web Part**.
3. Choose **Edit Web Part** → **Content Link** and point it to:

```
/SiteAssets/dcams-visual/embed.html
```

## Switching DATA_SOURCE
Open `app.js` and set the data source:

```js
DATA_SOURCE: 'json' // or 'sharepoint'
```

When using SharePoint lists, update `LIST_TITLES` if your list names differ.

## SharePoint List Schemas
The module expects the following list titles and columns:

- **DCAMS_Racks**: RackId (Title), LocationX, LocationY, TotalSlots, PowerCapacity, PhysicalCapacity, Notes
- **DCAMS_Assets**: AssetId (Title), RackId, SlotFrom, SlotTo, DeviceType, Brand, Model, Serial, PowerLoadKW, PhysicalLoadKG, Consumption, Status, UpdatedAt
- **DCAMS_Connections**: ConnectionId (Title), FromAssetId, ToEndpointLabel, CableType, PortFrom, PortTo, PathPoints(JSON), Notes, Status
- **DCAMS_UPS**: UpsId (Title), LocationX, LocationY, CapacityKVA, Status, LastUpdated, Notes
- **DCAMS_UPS_Batteries**: BatteryId (Title), UpsId, CapacityPct, Health, InspectorComment, UpdatedBy, UpdatedAt
- **DCAMS_AuditLog**: ActionType, EntityType, EntityId, PerformedBy, PerformedAt, Details(JSON)

## RBAC (Group Membership)
The module checks SharePoint group membership:
- **DCAMS Inspectors** → can update UPS battery entries
- **DCAMS Supervisors** → read-only
- **DCAMS Viewers** → read-only

If the user is not in any of these groups, the module displays an access warning.

## Cache Busting
To avoid stale scripts in classic pages, update the querystring when you deploy a new version:

```
<script src="/SiteAssets/dcams-visual/app.js?v=1.0.3" defer></script>
<link rel="stylesheet" href="/SiteAssets/dcams-visual/styles.css?v=1.0.3" />
```

## Troubleshooting Classic Issues
- **MDS (Minimal Download Strategy)**: If scripts do not load, disable MDS or append `?disablemds=1` while testing.
- **Page caching**: Use cache busting querystrings when updating files.
- **Script restrictions**: Ensure the library allows JS/SVG/JSON files and the page allows Script Editor or CEWP.
- **Mixed content**: Keep all URLs relative and same-origin for intranet safety.
- **Legacy browsers**: The module includes Promise/fetch polyfills in `app.js` for IE11-era classic environments.

## Customizing SVG Layouts
- Update `assets/svg/dc-layout.svg` and `assets/svg/ups-layout.svg`.
- Ensure rack IDs follow the pattern `rack-R01` and UPS IDs follow `ups-UPS01`.
- Adjust connection paths in `data/sampleData.json` (or your SharePoint list) by editing `PathPoints` arrays.

## Notes
- The module polls for updates every 10–15 seconds (configurable in `app.js`).
- The UPS update modal writes to `DCAMS_UPS_Batteries` via SharePoint REST with a request digest.
- For local previews without a server (opening `index.html` directly), the app uses embedded sample data to avoid `file://` fetch restrictions.
