# Dutch listing search

The `/aanbod` page searches a current Dutch advert snapshot. The `Vergelijkbaar aanbod` vehicle tab uses the same search with make, model, available single fuel and transmission, and registration year plus/minus two years prefilled. These are editable filters, not a valuation or a guarantee of equivalent specification. Missing registration values are not invented. Mileage is never prefilled from RDW.

No paid API, JP.cars integration or website scraper is installed. Live nationwide coverage is not available until actual authorized exports or free feeds are supplied. With no configured feed the API returns `available: false`, and the interface explains the missing source. Empty successful results have a separate state. Watchlists, historical tracking, price summaries and predicted selling times are not part of this first stage.

## Import free exports

Obtain dealer stock CSV or JSON exports that you may display. Map their fields to the contract below. Use consistent model, fuel and transmission names across suppliers. JSON input must be an array of advert objects; CSV uses the same camelCase column names with comma delimiters and UTF-8 encoding. Empty optional CSV cells become null. Do not commit actual stock exports; keep them under ignored `artifacts/` or another private runtime directory.

From the repository root:

```powershell
.venv\Scripts\python backend/scripts/import_listings.py artifacts/dealer-a.csv artifacts/dealer-b.json --output artifacts/listings/current.json
```

Set a server-only absolute path in `backend/.env`, then restart the API:

```dotenv
LISTINGS_FILE=C:/Users/twant/projects/ritvizier/artifacts/listings/current.json
```

Refresh the complete snapshot regularly. Imports validate before atomically replacing the snapshot. Removed adverts disappear when omitted from the next complete import. Removal is not evidence of a sale. The importer preserves each advert's real observation timestamp, rejects observations older than 24 hours and does not set old observations to today. It does not contact any websites. Export automation and provider-specific field mapping must be supplied for each actual source.

## Advert contract

| Field | Meaning |
| --- | --- |
| `source`, `sourceId` | Source name and stable advert identifier, required |
| `url` | Required HTTPS original advert link, without embedded credentials |
| `make`, `model` | Required normalized make and model |
| `observedAt` | Required timestamp with timezone when the advert was actually observed |
| `country` | `NL`, the only supported country; defaults to NL |
| `year`, `price`, `mileage` | Advertised registration year, euro asking price and kilometres, nullable |
| `fuel`, `transmission`, `trim`, `color` | Advertised specifications, nullable |
| `seller`, `location` | Display name and place, nullable |
| `plate`, `vin` | Valid Dutch plate or 17-character VIN, nullable; do not infer identifiers |
| `sellerId`, `stockId` | Shared dealer identity across sources and that dealer's stock reference, nullable |
| `photoHash` | Optional SHA-256 of identical actual vehicle-photo bytes; never use logos or generic stock images |

Use null for unavailable values. `sellerId` must identify the same dealer across exports, such as a verified shared business identifier. A similar display name is insufficient. `stockId` must refer to an individual vehicle, not a model or recycled inventory category. Exact photo hashes detect identical files; resized or recompressed photos will not match. No image download or visual model is run.

The output snapshot is an object with `updatedAt` and `listings`. Size is limited to 8 MiB and 10,000 adverts. Invalid records reject the snapshot rather than silently turning missing data into guessed values. Feeds older than 24 hours or dated more than five minutes into the future return unavailable. Individual stale observations are omitted with a warning. Refreshing the envelope timestamp cannot make old adverts fresh.

## Duplicate grouping

Each source advert appears once using its newest observation. Automatic grouping requires matching make/model plus one of:

- The same normalized plate or VIN.
- The same verified seller identity and individual stock reference.
- The same verified seller, exact vehicle-photo hash, year, trim, fuel, transmission and color, with mileage readings above 100 km and within 100 km of each other.

Conflicting nonempty plates or VINs veto every match. Every advert must match every other advert in the group, so an incomplete middle record cannot bridge two different vehicles. Matching uses indexed identifiers and photo/stock keys rather than all-pairs comparisons across the market. Similar prices, titles, seller names and specifications alone do not merge adverts. This intentionally misses uncertain duplicates rather than hiding separate cars.

Results retain every source URL, individual asking price, mileage and observation timestamp, with the grouping reason visible. The newest advert satisfying all filters represents the group; its price is not an average or a sale price. A lower price on another source remains visible in the source disclosure. Group IDs are response identifiers, not permanent vehicle-history IDs.

## API and operation

`GET /api/listings` is proxied by Next.js to FastAPI. Supported parameters are `make`, `model`, `fuel`, `transmission`, `location`, `year_min`, `year_max`, `price_max`, `mileage_max`, `sort` and `page`. Sort is `recent` or `price`. Filters use normalized exact make/fuel/transmission and substring model/place. Null values do not satisfy numeric filters. All numeric filters apply to the same source advert. Grouping precedes filtering, preserving other source links. Pagination contains 24 grouped cars per page; counts describe the connected snapshot, not the entire Dutch market.

The snapshot is read and grouped off the async event loop. The existing per-process request limiter applies. There is no public import endpoint, no caller-supplied provider URL, no database migration and no change to official vehicle records or saved-vehicle contracts. Container deployments need a read-only snapshot mount and `LISTINGS_FILE` passed to the API explicitly; the existing deployment configuration does not install a market feed.
