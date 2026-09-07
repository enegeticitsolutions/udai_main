import { 
  Baby, 
  BookOpenCheck, 
  Stethoscope, 
  GraduationCap, 
  Truck, 
  Briefcase, 
  Home, 
  Users, 
  UserCheck 
} from "lucide-react";

export interface ProjectDetailData {
  slug: string;
  title: string;
  tagline: string;
  category: string;
  ageGroup?: string;
  iconName: string;
  summary: string;
  description: string[];
  objectives?: string[];
  services?: Array<{ title: string; desc: string }>;
  whoCanBenefit?: string[];
  highlights?: string[];
  classGroups?: Array<{ name: string; age: string }>;
  trainingAreas?: string[];
  employabilitySkills?: string[];
  residentialIncludes?: string[];
  livingSkills?: string[];
  impact?: string;
  outcomes?: string[];
  image: string;
  gallery?: string[];
  images?: string[];
}

export const PROJECTS_DATA: ProjectDetailData[] = [
  {
    slug: "early-intervention",
    title: "Early Intervention Programme",
    tagline: "Building Strong Foundations During the Most Critical Years",
    category: "Ages 0–6 Years",
    ageGroup: "0–6 Years",
    iconName: "Baby",
    summary: "Timely identification and intervention for infants and young children at risk of or experiencing developmental delays.",
    description: [
      "The first six years of a child's life are the most important for brain development. Timely identification and intervention during this period can significantly improve a child's developmental outcomes and future independence.",
      "UDAI's Early Intervention Programme supports infants and young children (0–6 years) who are at risk of or experiencing developmental delays, intellectual disabilities, autism spectrum disorder, cerebral palsy, Down syndrome, ADHD, speech delays, learning disabilities, and other neurodevelopmental conditions.",
      "Our programme follows a family-centred approach where parents become active partners in the intervention process, ensuring that therapy continues beyond the classroom and into everyday life."
    ],
    objectives: [
      "Identify developmental concerns at the earliest stage",
      "Minimise developmental delays through timely intervention",
      "Strengthen cognitive, communication, motor, sensory, and social skills",
      "Empower parents with practical strategies for home-based learning",
      "Prepare children for preschool and inclusive education"
    ],
    services: [
      { title: "Developmental Screening & Assessment", desc: "Comprehensive multidisciplinary assessments to understand strengths, challenges, and milestones." },
      { title: "Individualised Early Intervention Plans", desc: "Personalised intervention goals developed to meet each child's unique requirements." },
      { title: "Speech & Language Therapy", desc: "Enhances communication abilities, speech clarity, and feeding skills." },
      { title: "Occupational Therapy & Sensory Integration", desc: "Develops fine motor skills, sensory processing, and adaptive reflexes." },
      { title: "Physiotherapy & Behaviour Therapy", desc: "Improves posture, mobility, muscle tone, and emotional regulation." },
      { title: "Parent Counselling & Guidance", desc: "Continuous guidance, emotional support, and home-based training for families." },
      { title: "Developmental Play Sessions", desc: "Play-based learning activities that promote cognitive development and peer interaction." }
    ],
    whoCanBenefit: [
      "Infants with developmental delays",
      "Children with Autism Spectrum Disorder",
      "Cerebral Palsy",
      "Down Syndrome",
      "Intellectual Disabilities",
      "ADHD",
      "Speech and Language Delays",
      "Global Developmental Delay",
      "High-Risk Newborns"
    ],
    impact: "Early intervention helps children achieve developmental milestones faster, improves communication and social interaction, strengthens motor skills, enhances school readiness, reduces long-term dependency, and empowers families to actively support their child's growth.",
    image: "/images/early_intervention1.png",
    gallery: [
      "/images/early_intervention1.png",
      "/images/early_intervention2.png",
      "/images/early_intervention3.png"
    ]
  },
  {
    slug: "school-readiness",
    title: "School Readiness Programme",
    tagline: "Preparing Every Child for a Successful Educational Journey",
    category: "Transition to Education",
    iconName: "BookOpenCheck",
    summary: "Equipping children with academic, behavioural, communication, and social skills for inclusive or special school entry.",
    description: [
      "Transitioning from therapy into a school environment can be challenging for many children with disabilities. UDAI's School Readiness Programme equips children with the academic, behavioural, communication, and social skills necessary for successful participation in inclusive and special education settings.",
      "The programme bridges the gap between developmental intervention and formal education, ensuring children enter school with confidence and independence."
    ],
    objectives: [
      "Develop foundational academic skills",
      "Improve classroom behaviour & sitting tolerance",
      "Build receptive and expressive communication abilities",
      "Enhance social interaction with peers and teachers",
      "Increase independence in school routines and transitions"
    ],
    services: [
      { title: "Pre-Academic Learning", desc: "Structured literacy and numeracy concepts through interactive, activity-based learning." },
      { title: "Classroom Readiness", desc: "Training in sitting tolerance, following instructions, attention span, and transitions." },
      { title: "Communication Development", desc: "Activities to improve conversation skills, expressive language, and peer bonding." },
      { title: "Individualised Education Plans (IEPs)", desc: "Learning goals customized to each child's developmental level and pace." },
      { title: "Parent & School Collaboration", desc: "Families and educators working together for smooth entry into formal schooling." }
    ],
    impact: "Children become emotionally prepared, socially confident, academically capable, and behaviourally ready to participate successfully in school environments.",
    image: "/images/project2.png"
  },
  {
    slug: "therapy-services",
    title: "Therapy Services",
    tagline: "Multidisciplinary Therapy for Holistic Development",
    category: "Outpatient & Clinical Care",
    iconName: "Stethoscope",
    summary: "Integrated Speech, Occupational, Physio, and Behaviour therapy tailored to each child's functional needs.",
    description: [
      "Every child has unique strengths and challenges. UDAI provides comprehensive therapy services designed to maximise each child's functional abilities and independence.",
      "Our integrated therapy model combines clinical expertise with child-friendly interventions in a supportive environment."
    ],
    services: [
      { title: "Speech & Language Therapy", desc: "Improves communication, speech clarity, feeding skills, and social interaction." },
      { title: "Occupational Therapy", desc: "Enhances fine motor skills, sensory processing, self-care abilities, handwriting, attention, and daily living skills." },
      { title: "Physiotherapy", desc: "Focuses on posture, balance, mobility, muscle strength, coordination, gait training, and physical independence." },
      { title: "Behaviour Therapy", desc: "Supports emotional regulation, adaptive behaviour, attention, social communication, and positive behaviour management." }
    ],
    outcomes: [
      "Comprehensive initial assessment",
      "Individualized goal-based therapy plans",
      "Active parent involvement & home programmes",
      "Regular progress monitoring and multidisciplinary reviews"
    ],
    impact: "Through consistent therapy, children experience improved mobility, enhanced speech clarity, reduced sensory distress, better emotional self-regulation, increased independence in daily activities, and overall improved quality of life.",
    image: "/images/therapy1.png",
    gallery: [
      "/images/therapy1.png",
      "/images/therapy2.png",
      "/images/therapy3.png",
      "/images/therapy4.png",
      "/images/therapy5.png",
      "/images/therapy6.png"
    ]
  },
  {
    slug: "special-education",
    title: "Special Education & Life-Skills Development",
    tagline: "Education Beyond the Classroom",
    category: "Special School (Janakpuri)",
    iconName: "GraduationCap",
    summary: "Nurturing environment for children and young adults with special needs with functional academics, life skills & NIOS.",
    description: [
      "The UDAI Special School provides a safe, inclusive, and nurturing environment where children with developmental and intellectual disabilities receive personalised education designed around their abilities rather than limitations.",
      "We believe every child can learn when education is adapted to their individual needs.",
      "Our teaching combines academics, therapy, life skills, communication, creativity, technology, and social participation into one integrated learning experience."
    ],
    classGroups: [
      { name: "Pearl Group", age: "2 to 5 years" },
      { name: "Ruby Group", age: "5 to 9 years" },
      { name: "Gold Group", age: "9 to 13 years" },
      { name: "Emerald Group", age: "14 to 18 years" },
      { name: "Diamond Group", age: "Above 18 years" }
    ],
    highlights: [
      "Individualised Education Plans (IEP)",
      "Functional academics adapted to abilities",
      "Life skills & daily living skills education",
      "Inclusive classroom activities & peer learning",
      "Computer education & digital literacy",
      "Art, music, and sports integration",
      "Therapy integrated directly within academics",
      "National Institute of Open Schooling (NIOS Class 10th & 12th) coaching center for learning disabilities"
    ],
    impact: "Students become more independent, improve functional learning, develop confidence, and participate actively in family, school, and community life.",
    image: "/images/project4.png"
  },
  {
    slug: "intervention-on-wheels",
    title: "Ek Prayas – Intervention on Wheels",
    tagline: "Supported by Rotary Club of Delhi-Janāk",
    category: "Mobile Rehabilitation Outreach",
    iconName: "Truck",
    summary: "Mobile therapy, screening, and rehabilitation van taking services directly to underserved communities.",
    description: [
      "Healthcare and rehabilitation services often remain inaccessible for children living in underserved communities. Ek Prayas – Intervention on Wheels addresses this gap by taking therapy, rehabilitation, awareness, and developmental services directly to communities that need them most.",
      "Supported by the Rotary Club of Delhi – Janak, this mobile outreach initiative ensures that financial or geographical barriers never prevent a child from receiving timely intervention."
    ],
    services: [
      { title: "Mobile Therapy Sessions", desc: "On-the-spot physical, speech, and occupational therapy sessions inside equipped mobile vans." },
      { title: "Developmental Screening & Assessment", desc: "Early identification camps in urban slums and rural areas." },
      { title: "Parent Counselling & Guidance", desc: "Training parents in home-based therapy techniques for ongoing progress." },
      { title: "Community Awareness Programs", desc: "Workshops reducing disability stigma and educating community members." },
      { title: "Community-Based Rehabilitation (CBR)", desc: "Empowering local networks and providing referral support to medical centers." }
    ],
    impact: "The programme has improved access to rehabilitation services, increased early identification of disabilities, strengthened family participation, and promoted inclusive community development.",
    image: "/images/project5.png"
  },
  {
    slug: "vocational-training",
    title: "Ek Prayas – Vocational Training & Skill Development",
    tagline: "Supported by Rotary Club of Delhi-Janak",
    category: "Ek Prayas Skill Centre",
    iconName: "Briefcase",
    summary: "Vocational skills, product crafting, and digital literacy empowering youth with special needs toward financial self-reliance.",
    description: [
      "Meaningful employment transforms lives. The Ek Prayas – Skill Development Programme empowers adolescents and young adults with disabilities by providing vocational, life, and employability skills that lead to sustainable livelihoods.",
      "Supported by the Rotary Club of Delhi – Janak, the programme prepares participants for employment, entrepreneurship, and independent living."
    ],
    trainingAreas: [
      "Non-woven bags making",
      "Eco-friendly handcrafted products",
      "Corporate gifting items",
      "Trophy & award fabrication",
      "Jewellery making",
      "Home décor products",
      "Computer applications & digital literacy",
      "Product packaging & finishing"
    ],
    employabilitySkills: [
      "Workplace etiquette & professional discipline",
      "Interpersonal communication & teamwork",
      "Time management & task organization",
      "Financial literacy & money management",
      "Micro-entrepreneurship & customer service"
    ],
    impact: "Participants gain vocational competencies, improve self-confidence, achieve financial independence, and successfully transition into employment or self-employment opportunities.",
    image: "/images/vocation1.png",
    gallery: [
      "/images/vocation1.png",
      "/images/vocation2.png",
      "/images/vocation3.png"
    ]
  },
  {
    slug: "assistive-living",
    title: "Assistive Living Hostel for Boys",
    tagline: "A Home That Builds Independence",
    category: "Residential Care Facility",
    iconName: "Home",
    summary: "24/7 structured residential environment building practical daily living, social, and personal care skills.",
    description: [
      "The Assistive Living Hostel for Boys provides more than residential care—it offers a structured environment where young individuals with disabilities develop the practical life skills needed for independent and dignified living.",
      "Our residential programme combines care, education, therapy, and life skills training to prepare residents for greater self-reliance and community participation."
    ],
    residentialIncludes: [
      "Safe and fully accessible accommodation",
      "Professional caregivers & 24×7 supervision",
      "Nutritious meals prepared with health guidelines",
      "Regular medical & health monitoring",
      "Recreation, sports, and social outings",
      "Therapy support & emotional well-being"
    ],
    livingSkills: [
      "Personal hygiene & grooming",
      "Dressing & self-care routines",
      "Cooking assistance & meal prep",
      "House cleaning & laundry management",
      "Money management & budgeting",
      "Public transport orientation & community safety",
      "Decision-making & social communication"
    ],
    impact: "Enables every resident to live with confidence, dignity, independence, and a genuine sense of belonging.",
    image: "/images/hostel1.png",
    gallery: [
      "/images/hostel1.png",
      "/images/hostel2.png",
      "/images/hostel3.png",
      "/images/hostel4.png"
    ]
  },
  {
    slug: "community-outreach",
    title: "Community Outreach Program",
    tagline: "Spreading Awareness and Equal Rights Across Society",
    category: "Outreach & Advocacy",
    iconName: "Users",
    summary: "Awareness campaigns, screening camps, and policy advocacy for an inclusive, accessible society.",
    description: [
      "UDAI believes in building a barrier-free world. Our Community Outreach Program works actively to remove social stigma, promote early screening, and foster inclusive environments across schools, workplaces, and local neighborhoods.",
      "Through regular awareness drives, parent support circles, and partnerships with local authorities, we advocate for equal access, healthcare rights, and dignity for all individuals with special needs."
    ],
    services: [
      { title: "Disability Screening Camps", desc: "Free early identification and diagnostic guidance camps in urban and rural areas." },
      { title: "Inclusion Workshops", desc: "Sensitizing schools, corporates, and public institutions about accessibility." },
      { title: "Parent Advocacy Circles", desc: "Forming support networks where families share resources and legal guidance." }
    ],
    impact: "Promotes early diagnosis, reduces discrimination, and mobilizes community support for disability rights.",
    image: "/images/community-outreach-1.jpg",
    gallery: [
      "/images/community-outreach-1.jpg",
      "/images/community-outreach-2.jpg"
    ]
  },
  {
    slug: "teachers-training",
    title: "Teachers Training & Parent Empowerment Program",
    tagline: "Capacity Building for Educators and Caregivers",
    category: "Empowerment & Workshops",
    iconName: "UserCheck",
    summary: "Workshops training special educators, mainstream teachers, and parents in inclusive teaching & home care.",
    description: [
      "A child's progress depends heavily on the knowledge and skills of their teachers and parents. UDAI's Teachers Training & Parent Empowerment Program provides structured workshops, certifications, and hands-on guidance.",
      "We equip special educators, mainstream school teachers, and parents with practical strategies in inclusive pedagogy, behavioural management, adaptive technology, and sensory integration techniques."
    ],
    services: [
      { title: "Inclusive Pedagogy Workshops", desc: "Training mainstream school teachers to support special needs students." },
      { title: "Special Educator Skill Enhancement", desc: "Advanced training in IEP design, assessment tools, and NIOS coaching." },
      { title: "Home-Based Therapy Guidance", desc: "Empowering parents to continue speech and motor exercises effectively at home." }
    ],
    impact: "Builds a sustainable ecosystem of trained educators and empowered parents who can support children with confidence.",
    image: "/images/teachers1.png",
    gallery: [
      "/images/teachers1.png",
      "/images/teachers2.png",
      "/images/teachers3.png",
      "/images/teachers4.png",
      "/images/teachers5.png",
      "/images/teachers6.png"
    ]
  }
];
