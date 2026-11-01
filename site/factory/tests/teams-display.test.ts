import { describe, expect, it } from 'vitest';
import {
  getTeamDisplays,
  teamDisplayReason,
  toDisplayStatus,
} from '@/lib/factory-dashboard/teams';
import { TEAM_CONTRACTS } from '@/lib/factory/teams/registry';

// Dashboard teams display must show real registry states, never
// invented data: six teams, no runs recorded, and exactly one team
// (content) marked ready, limited to a manual dashboard run with no
// model calls. Every assertion reads the real registry.

describe('dashboard teams display shows real states', () => {
  it('lists exactly the six registry teams, in registry order', () => {
    const displays = getTeamDisplays();
    expect(displays.map((d) => d.teamKey)).toEqual(
      TEAM_CONTRACTS.map((c) => c.team_key),
    );
  });

  it('marks only content ready, and only for a limited manual run', () => {
    const displays = getTeamDisplays();
    const byKey = new Map(displays.map((d) => [d.teamKey, d]));
    expect(byKey.get('content')?.displayStatus).toBe('ready');
    expect(byKey.get('content')?.reason).toMatch(/دستی/);
    expect(byKey.get('content')?.reason).toMatch(/بدون فراخوان مدل/);
    expect(byKey.get('content')?.reason).toMatch(/تأیید انسانی/);
    for (const key of [
      'product_leader',
      'tour_manager',
      'seo',
      'design',
      'development',
    ]) {
      expect(byKey.get(key)?.displayStatus).toBe('configured_not_active');
    }
  });

  it('gives every team a non-empty PM-understandable reason', () => {
    for (const contract of TEAM_CONTRACTS) {
      const reason = teamDisplayReason(contract);
      expect(reason.length).toBeGreaterThan(0);
      expect(toDisplayStatus(contract)).toBe(
        getTeamDisplays().find((d) => d.teamKey === contract.team_key)
          ?.displayStatus,
      );
    }
  });

  it('records no runs and no successes for any team', () => {
    for (const display of getTeamDisplays()) {
      expect(display.lastRun).toBeNull();
      expect(display.lastSuccess).toBeNull();
      expect(display.blockedReason).toBeNull();
      expect(display.enabledEnvironment).toBe('staging');
    }
  });

  it('never marks seo, design, or development active', () => {
    for (const display of getTeamDisplays()) {
      if (['seo', 'design', 'development'].includes(display.teamKey)) {
        expect(display.displayStatus).not.toBe('active');
      }
    }
  });
});
