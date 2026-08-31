import { z } from "zod";

export const schoolIdBodySchema = z.object({
  schoolId: z.string().min(1),
});

export const schoolCookieBodySchema = z.object({
  schoolId: z.string().min(1),
  cookie: z.string().min(1),
  username: z.string().optional(),
});

export const schoolLibraryJwtBodySchema = z.object({
  schoolId: z.string().min(1),
  libraryJwt: z.string().min(1),
  username: z.string().optional(),
});

export const schoolUsernameBodySchema = z.object({
  schoolId: z.string().min(1),
  username: z.string().optional(),
});
