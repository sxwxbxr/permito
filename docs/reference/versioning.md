---
title: Versioning and support
description: How Permito versions are numbered, how long a release gets fixes, and how to report a security problem.
---

## Versioning

Permito follows [semantic versioning](https://semver.org). From 1.0.0:

- **Patch** releases (1.0.x) fix bugs and correct wording. They never change the stable API.
- **Minor** releases (1.x.0) add features. They never remove or change something listed as stable in [API status](api-status.md). Service templates and translations can be added; the default category of an existing template does not change.
- **Major** releases (2.0.0) can remove or change the stable API. Everything removed was marked `@deprecated` in at least one earlier minor release and is named in the release notes with a migration hint.

`@permitojs/core` and `@permitojs/react` share one version number and are released together.

The stored decision has its own schema number. A change to it comes with a migration that keeps existing decisions where it can, and is named in the release notes.

## Support

The latest minor release of the current major version gets bug fixes and security fixes. When a new major version appears, the last minor release of the previous major keeps getting security fixes for 6 months.

There is no response-time guarantee for free issues. Permito Pro has its own terms.

## Security problems

Report vulnerabilities privately through GitHub Security Advisories on the repository ("Report a vulnerability" on the Security tab). Do not open a public issue. We aim to acknowledge a report within 5 working days and to publish a fixed release and an advisory once a fix is available.
