import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { PublicSite, SiteCTA } from "@/components/public-site";
export const metadata: Metadata = {
  title: "Our story — Reading Room",
  description: "A home for curious people and the ideas they want to keep.",
};
export default function About() {
  return (
    <PublicSite>
      <main id="main">
        <section className="site-width about-hero">
          <span className="site-kicker">THE IDEA BEHIND THE ROOM</span>
          <h1>
            Some books end.
            <br />
            <em>Their ideas shouldn’t.</em>
          </h1>
          <p>
            Reading Room is built around a simple belief: the best part of
            reading is what stays with you after you close the book.
          </p>
          <span className="about-flower" aria-hidden="true">
            ✳
          </span>
        </section>
        <section className="site-width about-story">
          <div>
            <span className="site-kicker">A FAMILIAR FEELING</span>
            <h2>
              “I know I read
              <br />
              something about that…”
            </h2>
          </div>
          <div>
            <p>
              A sentence catches your attention. A chapter changes how you see
              something. You highlight it, promise to remember it, and move on.
            </p>
            <p>
              Then the note gets lost. The conversation disappears into a chat
              history. The idea that felt so clear becomes difficult to explain.
            </p>
            <p>
              Reading Room gives those moments a home. A place to connect your
              books with your notes, revisit what you learned, and take the next
              small step toward using it.
            </p>
          </div>
        </section>
        <section className="about-manifesto">
          <div className="site-width">
            <span className="site-kicker">WHAT WE MAKE ROOM FOR</span>
            <h2>
              Curiosity over completion.
              <br />
              Understanding over collecting.
              <br />
              <em>Small actions over good intentions.</em>
            </h2>
            <p>
              You don’t have to read faster or finish more books.
              <br />
              You just need space to make something of the ones you read.
            </p>
          </div>
        </section>
        <section className="site-section site-width">
          <div className="section-heading-public">
            <div>
              <span className="site-kicker">
                BUILT FOR YOUR WAY OF LEARNING
              </span>
              <h2>There isn’t one kind of reader.</h2>
            </div>
          </div>
          <div className="ritual-grid">
            <article>
              <span className="ritual-number">I.</span>
              <h3>The curious explorer.</h3>
              <p>
                Follow a subject that interests you. Gather the language,
                questions, and connections that help it make sense.
              </p>
            </article>
            <article>
              <span className="ritual-number">II.</span>
              <h3>The focused student.</h3>
              <p>
                Break a big subject into manageable lessons. Explain it in your
                own words and return to the questions that need another look.
              </p>
            </article>
            <article>
              <span className="ritual-number">III.</span>
              <h3>The everyday practitioner.</h3>
              <p>
                Take an idea from a page into a meeting, a project, or a
                conversation. Keep track of what you tried and what you learned.
              </p>
            </article>
          </div>
        </section>
        <section className="site-width about-letter">
          <span className="site-kicker">AN OPEN DOOR</span>
          <h2>This room is still growing.</h2>
          <p>
            Reading Room is an independent project by Rezquellah. If something
            feels missing, confusing, or unexpectedly useful, we’d love to hear
            it. Thoughtful feedback helps shape what comes next.
          </p>
          <a className="site-text-link" href="mailto:contact@rezquellah.com">
            Write to us <ArrowUpRight size={17} />
          </a>
        </section>
        <SiteCTA />
      </main>
    </PublicSite>
  );
}
