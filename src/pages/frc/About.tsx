import { Helmet } from 'react-helmet-async';
import { FrcSiteHeader } from '@/components/site/FrcSiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

const CONTRIBUTORS = [
  { name: '27272', role: 'Build Lead' },
  { name: '27272', role: 'Code Lead' },
];

const FrcAbout = () => {
  return (
    <>
      <Helmet>
        <title>TheFirstBlueprint | FRC About</title>
        <meta
          name="description"
          content="Learn about the team behind the FRC planning tools."
        />
      </Helmet>
      <div className="min-h-screen bg-background field-container flex flex-col">
        <FrcSiteHeader />
        <main className="mx-auto w-full max-w-5xl px-6 py-10 flex-1">
          <section className="panel">
            <div className="panel-header">About TheFirstBlueprint - FRC</div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>TheFirstBlueprint helps robotics teams plan visually and communicate clearly.</p>
              <p>FRC mode provides a field-scaled space to coordinate alliance strategy and robot roles.</p>
            </div>
          </section>

          <section className="panel mt-8">
            <div className="panel-header">Contributors</div>
            <div className="grid gap-4 md:grid-cols-2">
              {CONTRIBUTORS.map((contributor) => (
                <div
                  key={`${contributor.name}-${contributor.role}`}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <h3 className="text-base font-semibold text-foreground">{contributor.name}</h3>
                  <p className="text-xs text-muted-foreground">{contributor.role}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel mt-8">
            <div className="panel-header">Contact Us</div>
            <p className="text-sm text-muted-foreground">
              Reach out for questions, collaborations, or updates.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition hover:border-primary/60"
                rel="noreferrer"
                target="_blank"
              >
                <svg
                  className="h-5 w-5 text-foreground"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M23 7.5c0-2-1.6-3.5-3.6-3.5H4.6C2.6 4 1 5.5 1 7.5v9c0 2 1.6 3.5 3.6 3.5h14.8c2 0 3.6-1.5 3.6-3.5v-9zm-13 7.1V9.4l5.6 2.6L10 14.6z" />
                </svg>
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    YouTube
                  </p>
                  <p className="text-sm text-foreground">Coming soon!</p>
                </div>
              </a>
              <a
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition hover:border-primary/60"
                rel="noreferrer"
                target="_blank"
              >
                <svg
                  className="h-5 w-5 text-foreground"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5.2A3.8 3.8 0 1 0 12 19.8 3.8 3.8 0 0 0 12 8.2zm6-1.8a1 1 0 1 0-1 1 1 1 0 0 0 1-1zM12 10a2 2 0 1 1-2 2 2 2 0 0 1 2-2z" />
                </svg>
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Instagram
                  </p>
                  <p className="text-sm text-foreground">Coming soon!</p>
                </div>
              </a>
            </div>
          </section>

          <section className="panel mt-8">
            <div className="panel-header">Terms Of Service</div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">Purpose of the Website</p>
                <p>
                  Thefirstblueprint is a non-commercial platform intended for robotics strategy planning,
                  visualization, and team communication. The tools are provided for educational and
                  competitive planning purposes only.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Acceptable Use</p>
                <p>
                  You agree to use the website only for lawful purposes and in a way that does not disrupt,
                  damage, or interfere with the site or other users. You may not attempt to reverse-engineer,
                  exploit, overload, or misuse any part of the website or its services.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Content and Assets</p>
                <p>
                  Field images, diagrams, and reference materials may be sourced from publicly available
                  resources under Creative Commons or similar reuse allowances. All original site design,
                  layout, and tool implementations remain the property of Thefirstblueprint unless otherwise
                  stated.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">User Submissions</p>
                <p>
                  If you submit feedback, bug reports, or contact information, you grant permission for that
                  information to be used solely for improving the website. You are responsible for the content
                  you submit and must not submit harmful, abusive, or misleading material.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Availability and Changes</p>
                <p>
                  The website is provided "as is" and may be modified, updated, or taken offline at any time
                  without notice. Features and functionality may change as development continues.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">No Warranties</p>
                <p>
                  We make no guarantees that the website will be error-free, uninterrupted, or fully accurate
                  at all times. Use of the tools is at your own discretion and responsibility.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Limitation of Liability</p>
                <p>
                  Thefirstblueprint is not responsible for any losses, damages, or competitive outcomes
                  resulting from the use of the planning tools or reliance on generated strategies.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Third-Party Links</p>
                <p>
                  The website may include links to external services or resources. We are not responsible for
                  the content, policies, or practices of third-party websites.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Privacy</p>
                <p>
                  Use of the website is also governed by the Privacy Policy, which explains how standard
                  website data is collected and used.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Updates to These Terms</p>
                <p>
                  These Terms of Use may be updated as the website evolves. Continued use of the website after
                  updates constitutes acceptance of the revised terms.
                </p>
              </div>
            </div>
          </section>

          <section className="panel mt-8">
            <div className="panel-header">Credits / Third Party Assets</div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                This tool includes field map images from the Pedro-Pathing Visualizer project, licensed under
                the Apache License, Version 2.0.
              </p>
              <p>Field images have been modified from the original assets.</p>
              <p>A copy of the Apache 2.0 License is shown below:</p>
              <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{`Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.

"License" shall mean the terms and conditions for use, reproduction,
and distribution as defined by Sections 1 through 9 of this document.

"Licensor" shall mean the copyright owner or entity authorized by
the copyright owner that is granting the License.

"Legal Entity" shall mean the union of the acting entity and all
other entities that control, are controlled by, or are under common
control with that entity. For the purposes of this definition,
"control" means (i) the power, direct or indirect, to cause the
direction or management of such entity, whether by contract or
otherwise, or (ii) ownership of fifty percent (50%) or more of the
outstanding shares, or (iii) beneficial ownership of such entity.

"You" (or "Your") shall mean an individual or Legal Entity
exercising permissions granted by this License.

"Source" form shall mean the preferred form for making modifications,
including but not limited to software source code, documentation
source, and configuration files.

"Object" form shall mean any form resulting from mechanical
transformation or translation of a Source form, including but
not limited to compiled object code, generated documentation,
and conversions to other media types.

"Work" shall mean the work of authorship, whether in Source or
Object form, made available under the License, as indicated by a
copyright notice that is included in or attached to the work
(an example is provided in the Appendix below).

"Derivative Works" shall mean any work, whether in Source or Object
form, that is based on (or derived from) the Work and for which the
editorial revisions, annotations, elaborations, or other modifications
represent, as a whole, an original work of authorship. For the purposes
of this License, Derivative Works shall not include works that remain
separable from, or merely link (or bind by name) to the interfaces of,
the Work and Derivative Works thereof.

"Contribution" shall mean any work of authorship, including
the original version of the Work and any modifications or additions
to that Work or Derivative Works thereof, that is intentionally
submitted to Licensor for inclusion in the Work by the copyright owner
or by an individual or Legal Entity authorized to submit on behalf of
the copyright owner. For the purposes of this definition, "submitted"
means any form of electronic, verbal, or written communication sent
to the Licensor or its representatives, including but not limited to
communication on electronic mailing lists, source code control systems,
and issue tracking systems that are managed by, or on behalf of, the
Licensor for the purpose of discussing and improving the Work, but
excluding communication that is conspicuously marked or otherwise
designated in writing by the copyright owner as "Not a Contribution."

"Contributor" shall mean Licensor and any individual or Legal Entity
on behalf of whom a Contribution has been received by Licensor and
subsequently incorporated within the Work.

2. Grant of Copyright License. Subject to the terms and conditions of
this License, each Contributor hereby grants to You a perpetual,
worldwide, non-exclusive, no-charge, royalty-free, irrevocable
copyright license to reproduce, prepare Derivative Works of,
publicly display, publicly perform, sublicense, and distribute the
Work and such Derivative Works in Source or Object form.

3. Grant of Patent License. Subject to the terms and conditions of
this License, each Contributor hereby grants to You a perpetual,
worldwide, non-exclusive, no-charge, royalty-free, irrevocable
(except as stated in this section) patent license to make, have made,
use, offer to sell, sell, import, and otherwise transfer the Work,
where such license applies only to those patent claims licensable
by such Contributor that are necessarily infringed by their
Contribution(s) alone or by combination of their Contribution(s)
with the Work to which such Contribution(s) was submitted. If You
institute patent litigation against any entity (including a
cross-claim or counterclaim in a lawsuit) alleging that the Work
or a Contribution incorporated within the Work constitutes direct
or contributory patent infringement, then any patent licenses
granted to You under this License for that Work shall terminate
as of the date such litigation is filed.

4. Redistribution. You may reproduce and distribute copies of the
Work or Derivative Works thereof in any medium, with or without
modifications, and in Source or Object form, provided that You
meet the following conditions:

(a) You must give any other recipients of the Work or
    Derivative Works a copy of this License; and

(b) You must cause any modified files to carry prominent notices
    stating that You changed the files; and

(c) You must retain, in the Source form of any Derivative Works
    that You distribute, all copyright, patent, trademark, and
    attribution notices from the Source form of the Work,
    excluding those notices that do not pertain to any part of
    the Derivative Works; and

(d) If the Work includes a "NOTICE" text file as part of its
    distribution, then any Derivative Works that You distribute must
    include a readable copy of the attribution notices contained
    within such NOTICE file, excluding those notices that do not
    pertain to any part of the Derivative Works, in at least one of
    the following places: within a NOTICE text file distributed as
    part of the Derivative Works; within the Source form or
    documentation, if provided along with the Derivative Works; or,
    within a display generated by the Derivative Works, if and
    wherever such third-party notices normally appear. The contents
    of the NOTICE file are for informational purposes only and do not
    modify the License. You may add Your own attribution notices within
    Derivative Works that You distribute, alongside or as an addendum
    to the NOTICE text from the Work, provided that such additional
    attribution notices cannot be construed as modifying the License.

You may add Your own copyright statement to Your modifications and
may provide additional or different license terms and conditions
for use, reproduction, or distribution of Your modifications, or
for any such Derivative Works as a whole, provided Your use,
reproduction, and distribution of the Work otherwise complies with
the conditions stated in this License.

5. Submission of Contributions. Unless You explicitly state otherwise,
any Contribution intentionally submitted for inclusion in the Work
by You to the Licensor shall be under the terms and conditions of
this License, without any additional terms or conditions.
Notwithstanding the above, nothing herein shall supersede or modify
the terms of any separate license agreement you may have executed
with Licensor regarding such Contributions.

6. Trademarks. This License does not grant permission to use the trade
names, trademarks, service marks, or product names of the Licensor,
except as required for reasonable and customary use in describing the
origin of the Work and reproducing the content of the NOTICE file.

7. Disclaimer of Warranty. Unless required by applicable law or
agreed to in writing, Licensor provides the Work (and each
Contributor provides its Contributions) on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied, including, without limitation, any warranties or conditions
of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
PARTICULAR PURPOSE. You are solely responsible for determining the
appropriateness of using or redistributing the Work and assume any
risks associated with Your exercise of permissions under this License.

8. Limitation of Liability. In no event and under no legal theory,
whether in tort (including negligence), contract, or otherwise,
unless required by applicable law (such as deliberate and grossly
negligent acts) or agreed to in writing, shall any Contributor be
liable to You for damages, including any direct, indirect, special,
incidental, or consequential damages of any character arising as a
result of this License or out of the use or inability to use the Work
(including but not limited to damages for loss of goodwill,
work stoppage, computer failure or malfunction, or any and all other
commercial damages or losses), even if such Contributor has been
advised of the possibility of such damages.

9. Accepting Warranty or Additional Liability. While redistributing
the Work or Derivative Works thereof, You may choose to offer,
and charge a fee for, acceptance of support, warranty, indemnity,
or other liability obligations and/or rights consistent with this
License. However, in accepting such obligations, You may act only on
Your own behalf and on Your sole responsibility, not on behalf of any
other Contributor, and only if You agree to indemnify, defend, and hold
each Contributor harmless for any liability incurred by, or claims
asserted against, such Contributor by reason of your accepting any
such warranty or additional liability.

END OF TERMS AND CONDITIONS

APPENDIX: How to apply the Apache License to your work.

To apply the Apache License to your work, attach the following
boilerplate notice, with the fields enclosed by brackets "[]"
replaced with your own identifying information. (Don't include
the brackets!) The text should be enclosed in the appropriate
comment syntax for the file format. We also recommend that a
file or class name and description of purpose be included on the
same "printed page" as the copyright notice for easier
identification within third-party archives.

Copyright [yyyy] [name of copyright owner]

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`}</pre>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
};

export default FrcAbout;
