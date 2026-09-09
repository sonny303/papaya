# Public-site support matrix

Papaya targets current evergreen browsers. The rows below separate automated
engine coverage from testing in actual branded browsers and assistive
technologies. Passing automated CI is necessary, but it does not complete the
human release gate.

| Surface           | Automated CI evidence                                                                                           | Required hosted release evidence                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Chromium          | Playwright-bundled Chromium on an Ubuntu 24.04 GitHub-hosted runner at 320, 390, 768, 1024, and 1440 CSS pixels | Keyboard-only review in current Chrome and Edge on desktop                                       |
| Firefox           | Playwright-bundled Firefox on an Ubuntu 24.04 GitHub-hosted runner at the same widths                           | Current Firefox with NVDA on Windows                                                             |
| WebKit            | Playwright-bundled WebKit on an Ubuntu 24.04 GitHub-hosted runner; this is not Safari, macOS, or iOS evidence   | Current Safari with VoiceOver on macOS and iOS                                                   |
| Reflow            | 320 CSS pixels is a narrow-width proxy only                                                                     | Actual browser zoom at 200% with no clipped content, lost controls, or two-dimensional scrolling |
| Reduced motion    | Automated `prefers-reduced-motion: reduce` behavior in all three engines                                        | Confirm the hosted candidate remains understandable without animation                            |
| Visual regression | Reviewed full-page Chromium baselines at representative widths and layout transitions on canonical Linux        | Visual review of the exact hosted release candidate                                              |

Before production promotion, record the release commit, exact candidate URL,
test date, tester, OS, browser and assistive-technology versions, result for
each human row, and links to any defects. Automated engine checks do not verify
screen-reader announcements, operating-system keyboard preferences, actual
Safari or iOS behavior, or browser zoom.
