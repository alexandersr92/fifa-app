import { z } from 'zod';

// Schema to create a session (friendly or tournament)
export const CreateSessionSchema = z.object({
  type: z.enum(['friendly', 'tournament']),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  iconUrl: z.string().url().optional(),
  teamFilter: z
    .object({
      countries: z.array(z.string()).optional(),
      minStars: z.number().min(1).max(5).optional(),
      maxStars: z.number().min(1).max(5).optional(),
    })
    .partial()
    .optional(),
  tFormat: z.enum(['league', 'single_elim', 'groups_cup', 'double_elim']).optional(),
  minPlayers: z.number().min(2).max(64).optional(),
  maxPlayers: z.number().min(2).max(64).optional(),
});

// Schema to join a session as guest
export const JoinGuestSchema = z.object({
  displayName: z.string().min(2).max(40),
});

// Schema to submit a score
export const SubmitScoreSchema = z.object({
  home_goals: z.number().int().min(0),
  away_goals: z.number().int().min(0),
  went_penalties: z.boolean().optional(),
  home_pen: z.number().int().min(0).optional(),
  away_pen: z.number().int().min(0).optional(),
});

// Schema to start a tournament. Assignments is required.
export const StartTournamentSchema = z.object({
  assignments: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        teamId: z.number(),
      }),
    )
    .min(2),
});