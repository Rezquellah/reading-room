import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Brain,
  Languages,
  Sprout,
  Check,
  Plus,
} from "lucide-react";
import { PublicSite, SiteCTA } from "@/components/public-site";

export default function Page() {
  return (
    <PublicSite>
      <main id="main">
        <section className="site-hero site-width">
          <div className="hero-copy">
            <span className="site-kicker">
              <span className="small-star">✳</span> FOR THE ETERNALLY CURIOUS
            </span>
            <h1>
              Don’t just
              <br />
              turn pages.
              <br />
              <em>
                Turn ideas
                <br className="mobile-break" /> into you.
              </em>
            </h1>
            <p>
              A home for what you read, what you learn, and what you put into
              practice. Gather your notes. Revisit the good ideas. Make them
              part of your life.
            </p>
            <div className="hero-actions">
              <Link className="site-button" href="/app?auth=signup">
                Start your reading room <ArrowUpRight size={19} />
              </Link>
              <Link className="site-text-link" href="/app?auth=login">
                Already a reader? Sign in
              </Link>
            </div>
            <a className="hero-scroll" href="#how-it-works">
              <ArrowDown size={15} /> A slower, deeper way to learn
            </a>
          </div>
          <div
            className="hero-art"
            role="img"
            aria-label="Illustration: a learning notebook surrounded by vocabulary and review cards. Example content."
          >
            <div className="art-orbit" />
            <span className="art-spark">✳</span>
            <span className="art-caption">A SMALL COLLECTION OF BIG IDEAS</span>
            <div className="art-book book-back">
              <span>
                THE ART OF
                <br />
                PAYING ATTENTION
              </span>
              <BookOpen size={30} strokeWidth={1} />
            </div>
            <div className="art-notebook">
              <div className="notebook-top">
                <span>MY READING NOTES</span>
                <span>01 / 04</span>
              </div>
              <h2>
                Good ideas deserve
                <br />a second life.
              </h2>
              <p>
                Understanding begins when you put an idea into your own words.
              </p>
              <div className="notebook-highlight">
                Read → Reflect → Remember
              </div>
              <div className="notebook-lines" />
              <span className="notebook-bottom">
                Leave room for a new perspective.
              </span>
            </div>
            <div className="art-word">
              <span className="card-eyebrow">A WORD WORTH KEEPING</span>
              <strong>curiosity</strong>
              <span>/ˌkjʊəriˈɒsɪti/ · noun</span>
              <p>The desire to know a little more.</p>
            </div>
            <div className="art-review">
              <span>
                <Brain size={17} /> A MOMENT OF RECALL
              </span>
              <p>
                What’s one idea you could
                <br />
                put into practice today?
              </p>
              <div>
                <span className="review-dot" /> Make it yours{" "}
                <ArrowUpRight size={15} />
              </div>
            </div>
            <span className="art-label">
              Illustrative study cards · your content goes here
            </span>
          </div>
        </section>
        <div className="site-ribbon">
          <span>Less scattered learning.</span>
          <span aria-hidden="true">✳</span>
          <span>More lasting understanding.</span>
          <span aria-hidden="true">✳</span>
          <span>A library that grows with you.</span>
        </div>
        <section className="site-section site-width" id="how-it-works">
          <div className="section-heading-public">
            <div>
              <span className="site-kicker">01 — THE READING RITUAL</span>
              <h2>
                From a passing thought
                <br />
                to something that stays.
              </h2>
            </div>
            <p>
              Your learning can happen anywhere.
              <br />
              Give it a place to come together.
            </p>
          </div>
          <div className="ritual-grid">
            {[
              [
                "01",
                "Bring your curiosity.",
                "Organize books, articles, and chapters into personal workspaces. Choose what you want to understand, prepare for, or put into practice.",
              ],
              [
                "02",
                "Make sense of it.",
                "Write your own notes or use a personalized prompt to study in ChatGPT. Bring your lesson back as a Markdown (.md) file.",
              ],
              [
                "03",
                "Keep it alive.",
                "Preview the import, save your notes and terms, revisit review cards, and turn useful ideas into practical exercises.",
              ],
            ].map(([n, title, body]) => (
              <article key={n}>
                <span className="ritual-number">{n}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="site-features">
          <div className="site-width">
            <div className="section-heading-public">
              <div>
                <span className="site-kicker">
                  02 — A PLACE FOR EVERY DISCOVERY
                </span>
                <h2>
                  One lesson.
                  <br />
                  <em>Four ways to make it yours.</em>
                </h2>
              </div>
              <p>
                A connected study space, from the first
                <br />
                “aha” to the moment you use it.
              </p>
            </div>
            <div className="feature-grid">
              <article className="feature-card">
                <div className="feature-heading">
                  <BookOpen />
                  <span>01 / NOTES</span>
                </div>
                <div className="feature-sample note-sample">
                  <span>THE IDEA IN MY OWN WORDS</span>
                  <p>
                    Understanding is more than
                    <br />
                    <mark>recognizing the answer.</mark>
                  </p>
                  <div className="sample-rule" />
                  <div className="sample-rule short" />
                </div>
                <h3>Think on the page.</h3>
                <p>
                  Keep rich notes, images, and lessons alongside the reading
                  that inspired them.
                </p>
              </article>
              <article className="feature-card">
                <div className="feature-heading">
                  <Languages />
                  <span>02 / VOCABULARY</span>
                </div>
                <div className="feature-sample word-sample">
                  <span>ADD TO YOUR UNDERSTANDING</span>
                  <p>
                    active recall <Plus size={18} />
                  </p>
                  <small>
                    Retrieving an idea from memory,
                    <br />
                    rather than simply rereading it.
                  </small>
                </div>
                <h3>Find the right words.</h3>
                <p>
                  Build a collection of useful terms, definitions, and examples
                  you can return to.
                </p>
              </article>
              <article className="feature-card">
                <div className="feature-heading">
                  <Brain />
                  <span>03 / REVIEW</span>
                </div>
                <div className="feature-sample recall-sample">
                  <span>PAUSE. THINK. REMEMBER.</span>
                  <p>
                    Can you explain the idea
                    <br />
                    without looking?
                  </p>
                  <span className="sample-pill">
                    A question for your future self
                  </span>
                </div>
                <h3>Remember with intention.</h3>
                <p>
                  Test your understanding with recall cards and reviews
                  scheduled from your responses.
                </p>
              </article>
              <article className="feature-card">
                <div className="feature-heading">
                  <Sprout />
                  <span>04 / PRACTICE</span>
                </div>
                <div className="feature-sample practice-sample">
                  <span>TAKE IT INTO THE REAL WORLD</span>
                  <p>
                    <span className="sample-check">
                      <Check size={15} />
                    </span>{" "}
                    Choose one useful idea
                  </p>
                  <p>
                    <span className="sample-check unchecked" /> Try it in a real
                    situation
                  </p>
                  <p>
                    <span className="sample-check unchecked" /> Reflect on what
                    happened
                  </p>
                </div>
                <h3>Let learning become doing.</h3>
                <p>
                  Save exercises, plan small actions, and record what happens
                  when you apply an idea.
                </p>
              </article>
            </div>
            <p className="samples-caption">
              Illustrative examples. Your library starts with your own content.
            </p>
          </div>
        </section>
        <section className="site-section site-width companion-section">
          <div className="companion-symbol" aria-hidden="true">
            <BookOpen size={62} strokeWidth={1} />
            <span>+</span>
            <span className="companion-star">✳</span>
          </div>
          <div>
            <span className="site-kicker">
              YOUR STUDY COMPANION, YOUR CHOICE
            </span>
            <h2>
              Learn in ChatGPT.
              <br />
              <em>Keep it in Reading Room.</em>
            </h2>
            <p>
              Choose your learning goal, language, and level of detail. Copy
              your study prompt into ChatGPT, learn at your own pace, then
              import the Markdown export here.
            </p>
            <p className="companion-note">
              You move the lesson yourself. Reading Room does not connect to
              your ChatGPT account or include an AI subscription. Imports use
              the content in your file and flag missing study sections before
              you save.
            </p>
            <Link className="site-text-link" href="/about">
              Meet the idea behind Reading Room <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
        <section className="site-section site-width faq-section">
          <div>
            <span className="site-kicker">A FEW THINGS YOU MIGHT WONDER</span>
            <h2>A little clarity.</h2>
          </div>
          <div>
            {[
              [
                "Do I need ChatGPT to use Reading Room?",
                "No. You can organize your reading, write notes, add vocabulary, create review cards, and plan practice directly. The ChatGPT workflow is an optional way to bring lessons into your library.",
              ],
              [
                "What happens when I upload a Markdown lesson?",
                "You see a preview of your note and any recognized vocabulary, answered review questions, and practice exercises. You choose what to save. Missing sections are flagged; vocabulary definitions can also become recall cards when no answered review questions are present.",
              ],
              [
                "Is this only for language learning?",
                "No. Use it to understand a difficult book, prepare for an exam, explore a new subject, or apply ideas at work. Optional language coaching fits alongside your main learning goal.",
              ],
              [
                "Can I take my learning with me?",
                "Yes. Export your work as PDFs or download a JSON backup from Settings. Backups retain image references; image files remain in your account’s storage.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <Plus size={18} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <SiteCTA />
      </main>
    </PublicSite>
  );
}
