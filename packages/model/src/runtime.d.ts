/**
 * Globals the model needs beyond ES2022. Every runtime that runs the model must provide them
 * (browsers, Node 16+, Deno and Hermes do; QuickJS gets a shim in the Android runner).
 * Keep this list short: each entry is a portability requirement (ADR 4).
 */

/** Base64 decoding of the generated AACGM grid (aacgm.ts). */
declare function atob(data: string): string;
