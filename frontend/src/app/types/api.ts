export interface BlogPost {
  id: number;
  title: string;
  date: string;
  author: string;
  category: string;
  image: string;
  excerpt: string;
  readTime: string;
}

export interface EventItem {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  image: string;
  category: string;
  attendees: number;
}

export interface Product {
  id: number;
  title: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
}

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  avatar: string;
  quote: string;
  rating: number;
}

export interface Therapist {
  id: number;
  name: string;
  image: string;
  department: string;
  role: string;
  summary: string;
}

export interface EducationProgramDetail {
  slug: string;
  title: string;
  shortDescription: string;
  heroImage: string;
  gallery: string[];
  accent: string;
  overview: string[];
  highlights: string[];
  outcomes: string[];
}

export interface BlogStoryDetail {
  id: number;
  slug: string;
  title: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  excerpt: string;
  heroImage: string;
  gallery: string[];
  intro: string[];
  sections: Array<{
    heading: string;
    body: string[];
  }>;
}

export interface CareerOpportunity {
  id: number;
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  applyLink: string;
}
