import { describe, expect, it } from 'vitest';
import {
  adaptToolCallForTick,
  adaptWorkItemForTick,
} from '@/lib/factory/tick/adapter';
import {
  FORBIDDEN_TOOLS,
  TEAM_CONTRACTS,
  type TeamKey,
} from '@/lib/factory/teams/registry';

// The Tick adapter must enforce the shared team Tool Policy at its
// entry gate: forbidden tools are rejected for every team first, then
// the team's own allowed list decides. Nothing here is faked: every
// assertion reads the real registry and the real policy through the
// adapter's gate function.

const TEAM_KEYS: readonly TeamKey[] = TEAM_CONTRACTS.map((c) => c.team_key);

describe('adaptToolCallForTick enforces the shared Tool Policy', () => {
  it('rejects every forbidden tool for every team', () => {
    for (const teamKey of TEAM_KEYS) {
      for (const tool of FORBIDDEN_TOOLS) {
        const decision = adaptToolCallForTick(teamKey, tool);
        expect(decision.allowed).toBe(false);
        expect(decision.reason).toBe('forbidden tool for every team');
      }
    }
  });

  it('allows each team only its own contract tools', () => {
    for (const contract of TEAM_CONTRACTS) {
      for (const tool of contract.allowed_tools) {
        expect(adaptToolCallForTick(contract.team_key, tool).allowed).toBe(true);
      }
      // A tool allowed for another team is not allowed here.
      const other = TEAM_CONTRACTS.find((c) => c.team_key !== contract.team_key);
      if (other) {
        const foreign = other.allowed_tools.find(
          (t) => !contract.allowed_tools.includes(t),
        );
        if (foreign) {
          const decision = adaptToolCallForTick(contract.team_key, foreign);
          expect(decision.allowed).toBe(false);
          expect(decision.reason).toBe('tool not in team allowed list');
        }
      }
    }
  });

  it('rejects unknown tools and unknown teams fail-closed', () => {
    expect(adaptToolCallForTick('content', 'not_a_tool').allowed).toBe(false);
    expect(
      adaptToolCallForTick('no_such_team' as TeamKey, 'read_evidence').allowed,
    ).toBe(false);
  });

  it('does not change the existing work-item gate decisions', () => {
    expect(
      adaptWorkItemForTick({
        execution_mode: 'tick_managed',
        workflow_version: 'source_shadow_v1',
        created_at: '2026-11-01T00:00:00Z',
      }),
    ).toBe('deferred');
    expect(
      adaptWorkItemForTick({
        execution_mode: 'manual',
        workflow_version: 'guide_content_v1',
        created_at: '2026-11-01T00:00:00Z',
      }),
    ).toBe('manual_or_legacy');
  });
});
