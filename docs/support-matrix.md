# Browser and accessibility support matrix

Required evidence for release candidates of the public Papaya site.

## Browsers

| Surface                  | Minimum evidence                                      |
| ------------------------ | ----------------------------------------------------- |
| Chromium (Playwright CI) | `pnpm test:e2e` green on the candidate commit         |
| Desktop viewport         | Home, primary nav, and one secondary page             |
| Narrow/mobile viewport   | Home and primary CTA remain usable without horizontal |

## Accessibility

| Check                      | Minimum evidence                                   |
| -------------------------- | -------------------------------------------------- |
| Automated axe (Playwright) | No serious/critical violations on covered journeys |
| Keyboard                   | Primary nav and CTAs reachable and operable        |
| Focus visibility           | Focus not obscured on primary controls             |

Record command, result, date (UTC), and tested commit/environment in the PR
handoff. Expand coverage when forms or authenticated flows are introduced.
