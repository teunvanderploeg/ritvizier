import { z } from "zod";

const text = z.string().nullable();
const number = z.number().nullable();
const safeUrl = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  });
export const listingSchema = z.object({
  source: z.string(),
  sourceId: z.string(),
  url: safeUrl,
  make: z.string(),
  model: z.string(),
  year: number,
  price: number,
  mileage: number,
  fuel: text,
  transmission: text,
  trim: text,
  color: text,
  seller: text,
  location: text,
  observedAt: z.string(),
});
export const listingResultsSchema = z.object({
  available: z.boolean(),
  reason: text,
  updatedAt: text,
  groups: z.array(
    z.object({
      id: z.string(),
      listing: listingSchema,
      offers: z.array(listingSchema),
      matchReasons: z.array(z.string()),
    }),
  ),
  total: z.number(),
  advertCount: z.number(),
  page: z.number(),
  pageSize: z.number(),
  warnings: z.array(z.string()),
});
export type ListingResults = z.infer<typeof listingResultsSchema>;
