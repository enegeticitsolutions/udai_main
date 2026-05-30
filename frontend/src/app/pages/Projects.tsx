const projects = [
  {
    id: "special-school",
    title: "Special School",
    description:
      "Our Special School is dedicated to educating Children with Special Needs (CWSN) and young adults through a personalized and inclusive approach. We focus on understanding each child's unique abilities and provide structured support to help them grow, learn, and thrive.",
    body: [
      "We follow an Individualized Education Plan (IEP), supported by carefully designed teaching methods, adaptive learning materials, specialized equipment, and an accessible environment to ensure effective learning outcomes.",
      "Student-Teacher Ratio: 6:2",
    ],
    sections: [
      {
        heading: "Class Groups",
        intro: "Our classes are designed to cater to different age groups:",
        items: [
          "Pearl - 2 to 5 years",
          "Ruby - 5 to 9 years",
          "Gold - 9 to 13 years",
          "Emerald - 14 to 18 years",
          "Diamond - Above 18 years",
        ],
      },
      {
        heading: "Early Intervention",
        intro:
          "UDAI's Early Intervention Program is one of its core strengths. It is designed for children aged 0 to 7 years, focusing on addressing developmental delays at an early stage.",
        items: [
          "Physical",
          "Cognitive",
          "Communication",
          "Social & Emotional",
          "Adaptive Skills",
        ],
        outro:
          "Our goal is to build foundational skills and prepare children for school readiness and mainstream inclusion.",
      },
      {
        heading: "School Readiness Program",
        intro:
          "We offer a structured School Readiness Program to help children transition smoothly into mainstream education.",
        items: [
          "Social skills development",
          "Communication and language skills",
          "Academic readiness",
        ],
        outro:
          "We also provide continued support to children already enrolled in mainstream schools, helping them cope with academic and social challenges.",
      },
      {
        heading: "Pre-Vocational Training",
        intro:
          "At UDAI, we emphasize life skills and independence through our Pre-Vocational Training Program.",
        items: [
          "Art & craft for creative expression",
          "Skill-based activities for productivity",
          "Emotional and social development",
        ],
        outro:
          "Training is personalized based on each child's abilities. Specialized teaching aids, developed by our multidisciplinary team, are used to address specific learning needs identified through detailed assessments.",
      },
      {
        heading: "NIOS (Remedial Education)",
        intro:
          "We offer a dedicated learning center for children with learning disabilities such as:",
        items: [
          "Reading difficulties",
          "Writing challenges",
          "Spelling and comprehension issues",
        ],
        outro:
          "Our trained educators support students in preparing for Class 10th and 12th examinations conducted by the National Institute of Open Schooling (NIOS).",
      },
    ],
  },
];

export function Projects() {
  return (
    <div className="bg-[#f7f4ef]">
      <section className="pb-16 sm:pb-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          {projects.map((project) => (
            <article
              key={project.id}
              id={project.id}
              className="scroll-mt-32 rounded-[1.4rem] border border-[#e8dfd7] bg-white p-5 shadow-[0_14px_30px_rgba(36,24,18,0.06)] sm:rounded-[1.8rem] sm:p-7"
            >
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d36f47]">
              Project
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#2b1b15]">
              {project.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#7b706a] sm:text-base sm:leading-8">{project.description}</p>
            {project.id === "special-school" ? (
              <div className="mt-8 space-y-8">
                <div className="rounded-[1.4rem] bg-[#fbf7f2] p-4 sm:p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d36f47]">
                    Special School (Janakpuri)
                  </p>
                  <p className="mt-4 text-base leading-8 text-[#5f554f]">{project.body?.[0]}</p>
                  <p className="mt-4 text-base leading-8 text-[#5f554f]">{project.body?.[1]}</p>
                </div>

                {project.sections?.map((section) => (
                  <section key={section.heading} className="rounded-[1.4rem] border border-[#eee4db] p-4 sm:p-6">
                    <h3 className="text-xl font-semibold tracking-tight text-[#2b1b15]">
                      {section.heading}
                    </h3>
                    <p className="mt-3 text-base leading-8 text-[#5f554f]">{section.intro}</p>
                    <ul className="mt-4 space-y-2 text-base leading-8 text-[#5f554f]">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#d36f47]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    {section.outro ? <p className="mt-4 text-base leading-8 text-[#5f554f]">{section.outro}</p> : null}
                  </section>
                ))}

                <div className="rounded-[1.4rem] bg-[#111111] px-6 py-5 text-white">
                  <p className="text-base font-medium leading-8">
                    Empowering every child with the skills, confidence, and support they need to lead an independent and fulfilling life.
                  </p>
                </div>
              </div>
            ) : null}
          </article>
          ))}
        </div>
      </section>
    </div>
  );
}
