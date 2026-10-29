import type { Metadata } from "next";
import Link from "next/link";
import { PublicSite } from "@/components/public-site";
export const metadata: Metadata = {
  title: "Privacy — Reading Room",
  description:
    "How Reading Room handles your account, study content, and preferences.",
};
export default function Privacy() {
  return (
    <PublicSite>
      <main id="main" className="site-width privacy-page">
        <header className="privacy-intro">
          <span className="site-kicker">YOUR SPACE, YOUR INFORMATION</span>
          <h1>
            Privacy,
            <br />
            <em>in plain language.</em>
          </h1>
          <p>
            This page describes how Reading Room, an independent project by
            Rezquellah, handles information when you use the website and study
            app.
          </p>
          <span className="privacy-date">Last updated: October 29, 2026</span>
        </header>
        <div className="privacy-summary">
          <strong>The essentials</strong>
          <p>
            Your account holds your study content. We use Supabase to store it
            and manage sign-in, and Vercel to host the website. The ChatGPT
            workflow is a manual transfer you control. We do not sell your study
            content or run advertising trackers in the app.
          </p>
        </div>
        <div className="privacy-layout">
          <nav aria-label="Privacy sections">
            <a href="#information">01 / Information</a>
            <a href="#purpose">02 / How it’s used</a>
            <a href="#providers">03 / Service providers</a>
            <a href="#preferences">04 / Cookies & preferences</a>
            <a href="#control">05 / Your choices</a>
            <a href="#contact">06 / Contact</a>
          </nav>
          <div className="privacy-content">
            <section id="information">
              <h2>01. What we handle</h2>
              <p>
                <strong>Account information.</strong> Your email address and
                authentication information are handled through Supabase when you
                register, sign in, or reset your password.
              </p>
              <p>
                <strong>Study content.</strong> This includes workspaces, book
                and article details, chapters, notes, vocabulary, review cards
                and review history, practice exercises, saved study preferences
                (including your registration language, learning purpose,
                interests, and preferred session length), and images you upload.
              </p>
              <p>
                <strong>Technical information.</strong> Requests to the service
                may produce hosting and security logs, such as IP addresses,
                request paths, timestamps, and error details. If you email us,
                we receive your address and the information in your message.
              </p>
            </section>
            <section id="purpose">
              <h2>02. Why we use it</h2>
              <p>
                We use this information to authenticate your account, save and
                display your library, schedule reviews based on your responses,
                provide exports and backups, troubleshoot problems, protect the
                service, and respond to support requests.
              </p>
              <p>
                Markdown lessons are parsed by Reading Room to identify notes,
                terms, review questions, and practice. Importing a file does not
                send it to an AI model through Reading Room.
              </p>
            </section>
            <section id="providers">
              <h2>03. Where information goes</h2>
              <p>
                <strong>Supabase</strong> provides authentication, database
                storage, and uploaded-image storage. Account access rules limit
                study records to their authenticated owner.{" "}
                <a href="https://supabase.com/privacy">
                  Supabase privacy information ↗
                </a>
              </p>
              <p>
                <strong>Vercel</strong> hosts the website and processes requests
                needed to run it.{" "}
                <a href="https://vercel.com/legal/privacy-policy">
                  Vercel privacy information ↗
                </a>
              </p>
              <p>
                Our service providers may process information in countries other
                than yours. Necessary administrative access may be used to
                operate the service or investigate support and security issues.
                No online service can promise absolute security.
              </p>
              <p>
                <strong>ChatGPT is separate.</strong> Reading Room does not
                access your ChatGPT account or automatically retrieve your
                conversations. Anything you paste into ChatGPT is handled by
                that service under its own terms and privacy policy. Reading
                Room is not affiliated with OpenAI.
              </p>
              <p>
                Images or links from external websites can cause your browser to
                contact those websites when displayed or opened. Their own
                privacy practices apply.
              </p>
            </section>
            <section id="preferences">
              <h2>04. Cookies and local preferences</h2>
              <p>
                Authentication cookies keep you signed in. Your browser also
                stores appearance, language, and print preferences locally. Your
                saved library is stored in Supabase, not in browser local
                storage.
              </p>
              <p>
                The app does not currently include advertising cookies or a
                third-party marketing analytics SDK. Hosting providers may still
                process operational logs. Clearing browser storage may sign you
                out or reset your preferences.
              </p>
            </section>
            <section id="control">
              <h2>05. Your content and your choices</h2>
              <p>
                You can edit and delete study entries in the app. Settings
                includes a JSON backup download; PDF export is also available.
                JSON backups contain image references, not copies of the image
                files.
              </p>
              <p>
                Content is generally retained while it remains in your account.
                Deleting a note does not necessarily delete its uploaded image
                files. Operational logs, backups, or records needed for security
                or legal obligations may remain separately; we do not promise
                instant removal from every system.
              </p>
              <p>
                For account deletion, removal of stored images, or an access or
                correction request you cannot complete in the app, email{" "}
                <a href="mailto:contact@rezquellah.com">
                  contact@rezquellah.com
                </a>{" "}
                from your account email. We may ask you to verify ownership
                before acting. Available privacy rights depend on where you
                live.
              </p>
            </section>
            <section id="contact">
              <h2>06. Questions and updates</h2>
              <p>
                Contact Rezquellah, the operator of Reading Room, at{" "}
                <a href="mailto:contact@rezquellah.com">
                  contact@rezquellah.com
                </a>{" "}
                with privacy or support questions. Please avoid sending
                passwords or unnecessary sensitive information.
              </p>
              <p>
                When the service changes, we may update this page and its date.
                Material changes will be described here.
              </p>
              <Link className="site-text-link" href="/app">
                Return to Reading Room →
              </Link>
            </section>
          </div>
        </div>
      </main>
    </PublicSite>
  );
}
